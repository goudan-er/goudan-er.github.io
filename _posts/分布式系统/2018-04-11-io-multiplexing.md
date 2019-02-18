---
layout: page
title: I/O多路转接 - select/poll
teaser: "select/pselect/poll/epoll 到底是个啥"

categories:
    - share
    - system
tags:
    - system
    - programming
    - unix

published: false

---

I/O多路转接，也叫I/O多路复用，I/O Multiplexing，是操作系统提供的一种高级I/O功能，只有当描述符准备好进行I/O时，进程或线程才去执行I/O操作，避免阻塞或者做无用功。select/pselect/poll/epoll 时Unix系统为我们提供系统函数接口。本文首先介绍基础I/O模型，其中包括I/O Multiplexing，然后将介绍select/pselect/poll/epoll系统函数，最后通过一个socket例子使用epoll完成一个网络I/O。  

## 非阻塞I/O
通常在谈起I/O时(文件I/O，网络I/O)，如没有特殊说明，通常指阻塞式I/O(blcking I/O)，即当调用I/O时，若I/O不可用，当前进程或者线程会被挂起，直到I/O可用。如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig01)）所示,

![blocking_io.gif](/images/multiplexing-select-epoll-noblocking-socket/blocking_io.gif)

阻塞式I/O会造成系统资源浪费。比如，一台服务器需要处理1000个连接，则需要1000个进程或者线程处理连接，如果1000个连接只有少部分是连接忙碌的，则1000个线程大部分是被阻塞挂起的。假设CPU是4核，为了要跑1000个线程，则每个线程的时间槽非常短，这样就会导致线程切换非常频繁。频繁切换线程是有问题的：  
	1. 线程是有内存开销的，1个线程可能需要512K(或2M)存放栈，那么1000个线程就要512M(或2G)内存  
	2. 线程的切换，或者说上下文切换是有CPU开销的，当大量时间花在上下文切换的时候，分配给真正的操作的CPU就要少很多  

非阻塞I/O(nonblocking I/O)，如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig02)）所示，

![nonblocking_io.gif](/images/multiplexing-select-epoll-noblocking-socket/nonblocking_io.gif)

进程发起一个read操作时，如果数据还没有准备好，系统不再阻塞进程，而是返回一个error信息，此时进程知道所需数据还没有准备好，于是它可以等待一定时间再次发起read操作。一旦kernel中的数据准备好了，并且又再次收到了用户进程的系统调用，那么它马上就将数据拷贝到了用户内存，然后返回。所以，用户进程其实是需要不断地主动询问kernel数据是否准备好，也称作轮询，polling。非阻塞I/O的一个问题就是进程需要不断询问kernel数据是否准备好，而大多数时间实际上是数据还没有准备好，所以执行系统调用浪费了浪费了CPU时间，并且每次查询后等待多长时间再进行下一次查询也很难确定。

异步I/O是一种高级I/O技术。当进程发起一个异步read操作时(如`aio_read`)，用户进程可以立刻去做其他事情，kernel不会对用户进程产生任何阻塞，kernel会等待数据准备完成，然后将数据拷贝到用户内存，当这一切都完成之后，kernel会给用户进程发送一个signal，告诉它read操作完成了。注意的是操作的内存缓冲区需要保持稳定并且始终合法。下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig05)）是异步I/O的示意图。

![async_io.gif](/images/multiplexing-select-epoll-noblocking-socket/async_io.gif)

为了简化程序设计，常见异步I/O一般采用多线程或者多进程方式，使用同步模型编写程序，但是异步运行这些线程或进程。但是，如果需要大量I/O操作（比如并发网络连接很多），这种异步I/O可能会需要频繁新建、调度、销毁这些线程进程，系统开销较大。

一种比较好的技术就是I/O多路转接，为了使用这个技术，首先构造一个文件描述符集合，然后调用 `select` 或者 `poll` 函数，直到这些描述符中的一个准备好进行I/O时（或者超时）才返回。如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig03)）。

![io_multiplexing.gif](/images/multiplexing-select-epoll-noblocking-socket/io_multiplexing.gif)

*当进程调用`select`时，进程是被阻塞的*。kernel会“监视”所有select负责的文件描述符，当任何一个数据准备好了，`select`就会返回。这个时候用户进程再调用read操作，将数据从kernel拷贝到用户进程。

## select/pselect

`select`函数定义如下：

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
#include &lt;sys/select.h&gt;

int select(int maxfdp1, fd_set *restrict readfds, 
			fdset *restrict writefds, fdset *restrict execptfds, 
			struct timeval *restrict tvptr);
</pre>

- `maxfdp1`: 最大描述符编号值+1。在`#include <sys/select.h>`定义中，指定的最大描述符编号值为1024  
- `readfds`, `writefds`, `exceptfds`: 所关心的可读、可写或处于异常条件的描述符集合    
- `tvptr`:  
	- `tvptr == NULL`: 永远等待，直到当所指定的描述符中的一个已经准备好或收到中断信号。  
	- `tvptr->tv_sec == 0 && tvptr->tv_usec == 0`: 不等待，测试所有指定的描述符并立即返回。等同于轮询。  
	- `tvptr->tv_sec > 0 || tvptr->tv_usec > 0`: 等待指定的秒数或者微妙数。当指定的描述符之一准备好或者超时，则返回，-1表示中断，0表示超时，>0表示有描述符已经准备好。  

此外，`#include <sys/select.h>`还定义了一些函数用来操作描述符集合：  
<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
#include &lt;sys/select.h&gt;

int FD_ISSET(int fd, fd_set *fdset);	// 测试fd是否在集合之中
void FD_CLR(int fd fd_set *fdset);	// 将fd从集合中清除
void FD_SET(int fd, fd_set *fdset);	// 将fd加入集合之中
void FD_ZERO(fd_set *fdset);	// 清空集合

</pre>

POSIX.1也定义了一个`select`函数的变体，`pselect`，定义如下：
<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
#include &lt;sys/select.h&gt;

int pselect(int maxfdp1, fd_set *restrict readfds,
			fs_set *restrict writefds, fd_set *restrict execptfds,
			const struct timespec *restrict tsptr,
			const sigset_t *restrict sigmask);
</pre>

从函数参数上来看，`pselect`和`select`功能基本相同，但是`pselect`提供了以下几点功能：  
- `pselect`超时值使用timespec结构，该结构以秒和纳秒表示超时值，可以提供更精准的超时时间。  
- `pselect`的超时值被声明为const，这保证了调用`pselect`不会修改此值。  
- `pselect`可选用信号屏蔽字。若`sigmask`为`NULL`，那么在信号方面，`select`和`pselect`的运行状况相同。否则，`sigmask`指向一信号屏蔽字，在调用函数时，以原子操作方式安装信号屏蔽字；在返回时，恢复之前的信号屏蔽字。  

## poll/epoll

`poll`函数类似于`select`，同样提供多路转接技术。不同的是，`poll`函数

## Socket实例

本小节完成socket通信实例。服务端使用I/O多路转接处理客户端输入；多个客户端每隔一段时间向服务器发送字符串。

服务器：
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;stdio.h&gt;
#include &lt;string.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;assert.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/select.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;arpa/inet.h&gt;
#include &lt;unistd.h&gt;
#include &lt;algorithm&gt;

const int BUFFER_SIZE = 4096;
const int SERVER_PORT = 2222;
const int CONNECTIONS = 5;

int main ()
{
	int serverSocket = socket(AF_INET, SOCK_STREAM, 0);
	assert(serverSocket != -1);

	sockaddr_in serverAddr;
	memset(&amp;serverAddr, 0, sizeof(serverAddr));
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(SERVER_PORT);
	serverAddr.sin_addr.s_addr = htonl(INADDR_ANY);

	int ret = bind(serverSocket, (sockaddr *)&amp;serverAddr, sizeof(sockaddr_in));
	assert(ret != -1);

	ret = listen(serverSocket, CONNECTIONS);
	assert(ret != -1);

	// connection rfds
	int connFds[CONNECTIONS+1];
	for (int i = 0; i &lt; CONNECTIONS+1; ++i) {
		connFds[i] = -1;
	}

	// select 需要的参数
	fd_set rfds;
	timeval tv;
	int maxFds;

	while (1) {
		FD_ZERO(&amp;rfds);
		connFds[0] = serverSocket;	// connFds[0]用于监测连接事件，其他用于监测读写事件
		maxFds = -1;
		for (int i = 0; i &lt; CONNECTIONS+1; ++i) {
			if (connFds[i] &gt; -1) {
				FD_SET(connFds[i], &amp;rfds);
				maxFds = std::max(maxFds, connFds[i]);
			}
		}

		tv.tv_sec = 10;
		tv.tv_usec = 0;

		printf(&quot;select...\n&quot;);
		ret = select(maxFds + 1, &amp;rfds, NULL, NULL, &amp;tv);

		if (ret == -1) {
			printf(&quot;select()\n&quot;);
		} else if (ret == 0) {
			printf(&quot;select timeout\n&quot;);
		} else  { // (ret &gt; 0)
			printf(&quot;select ret %d\n&quot;, ret);
			for (int i = 0; i &lt; CONNECTIONS+1; ++i) {
				//printf(&quot;i=%d, connFds[i]=%d\n&quot;, i, connFds[i]);
				if (i == 0 &amp;&amp; FD_ISSET(connFds[i], &amp;rfds)) {
					sockaddr_in clientAddr;
					socklen_t clientAddrLen = sizeof(sockaddr_in);
					int newConnection = accept(connFds[i], (sockaddr *)&amp;clientAddr, &amp;clientAddrLen);
					if (newConnection &lt; 0) {
						printf(&quot;error connection\n&quot;);
					} else {
						printf(&quot;connect from %s:%d\n&quot;, inet_ntoa(clientAddr.sin_addr), ntohs(clientAddr.sin_port));
						int j = 1;
						for (; j &lt; CONNECTIONS+1; ++j) {
							if (connFds[j] == -1)
								break;
						}
						if (j == CONNECTIONS+1) {
							close(newConnection);
						} else {
							connFds[j] = newConnection;
						}
					}			
				}
				if (i != 0 &amp;&amp; connFds[i] != -1 &amp;&amp; FD_ISSET(connFds[i], &amp;rfds)) {
					char buf[BUFFER_SIZE];
					int n = recv(connFds[i], buf, BUFFER_SIZE, 0);
					if (n &gt; 0) {
						buf[n] = '\0';
						printf(&quot;connection %d: %s\n&quot;, i, buf);
					}
				}
				else {}
			}
		}
	}

	return 0;
}
</pre>

客户端：
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;stdio.h&gt;
#include &lt;string.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;assert.h&gt;
#include &lt;unistd.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;arpa/inet.h&gt;
#include &lt;pthread.h&gt;

const int BUFFER_SIZE = 4096;
const int SERVER_PORT = 2222;
const int CONNECTIONS = 5;

struct ThreadSock {
	int id;
	int sock;
	char* message;
	int len;
};

void* sendMessage(void* arg)
{
	ThreadSock* threadSock = (ThreadSock*)arg;
	int thread_id = threadSock-&gt;id;
	int sock = threadSock-&gt;sock;
	char* message = threadSock-&gt;message;
	int len = threadSock-&gt;len;
	
	printf(&quot;enter thread %d\n&quot;, thread_id);
	
	while(1) {
		printf(&quot;thread %d sending\n&quot;, thread_id);
		int ret = send(sock, message, len, 0);
		if (ret == -1) {
			printf(&quot;thread %d send failed\n&quot;, thread_id);
		}
		sleep(5);
	}
}

int main ()
{
	const char* serverIP = &quot;127.0.0.1&quot;;
	
	int clientSockets[CONNECTIONS];
	for (int i = 0; i &lt; CONNECTIONS; ++i) {
		clientSockets[i] = socket(AF_INET, SOCK_STREAM, 0);
		assert(clientSockets[i] != -1);
	}

	sockaddr_in serverAddr;
	memset(&amp;serverAddr, 0, sizeof(serverAddr));
	serverAddr.sin_family = AF_INET;
	serverAddr.sin_port = htons(SERVER_PORT);
	serverAddr.sin_addr.s_addr = inet_addr(serverIP);

	printf(&quot;connecting...\n&quot;);

	int ret;
	for (int i = 0; i &lt; CONNECTIONS; ++i) {
		ret = connect(clientSockets[i], (sockaddr *)&amp;serverAddr, sizeof(sockaddr_in));
		assert(ret != -1);
	}

	ThreadSock threadSock[CONNECTIONS];
	char buf[CONNECTIONS][BUFFER_SIZE];
	for (int i = 0; i &lt; CONNECTIONS; ++i) {
		sprintf(buf[i], &quot;send from %d\n&quot;, i+1);
		threadSock[i] = {i, clientSockets[i], buf[i], sizeof(buf[i])};
	}

	pthread_t thread_id[CONNECTIONS];
	for (int i = 0; i &lt; CONNECTIONS; ++i) {
		int ret = pthread_create(&amp;thread_id[i], NULL, sendMessage, &amp;threadSock[i]);
		if (ret == -1) {
			printf(&quot;thread %d create failed\n&quot;, i);
		}
	}

	for (int i = 0; i &lt; CONNECTIONS; ++i) {
		pthread_join(thread_id[i], NULL);
	}

	//for (int i = 0; i &lt; CONNECTIONS; ++i) {
		//close(clientSockets[i]);
	//}

	return 0;
}
</pre>

## Reference
[unix network programming](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html)  
[【Socket编程】篇六之IO多路复用——select、poll、epoll](https://blog.csdn.net/woxiaohahaa/article/details/51498951)  
