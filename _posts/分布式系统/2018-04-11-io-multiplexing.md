---
layout: page
title: I/O多路转接
teaser: "非阻塞IO了解下？select/poll/epoll到底是个啥？"

categories:
    - share
    - system
tags:
    - system
    - programming
    - unix
---

I/O多路转接，也叫I/O多路复用，I/O Multiplexing，是操作系统提供的一种高级I/O功能，只有当描述符准备好进行I/O时，进程或线程才去执行I/O操作，避免阻塞或者做无用功。select/poll/epoll 时Unix系统为我们提供系统函数接口。

## IO模型
### 非阻塞I/O
通常在谈起I/O时(文件I/O，网络I/O)，如没有特殊说明，通常指阻塞式I/O(blcking I/O)，即当调用I/O时，若I/O不可用，当前进程或者线程会被挂起，直到I/O可用。如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig01)）所示,

![blocking_io.gif](/images/multiplexing-select-epoll-noblocking-socket/blocking_io.gif)

阻塞式I/O会造成系统资源浪费。比如，一台服务器需要处理1000个连接，则需要1000个进程或者线程处理连接，如果1000个连接只有少部分是连接忙碌的，则1000个线程大部分是被阻塞挂起的。假设CPU是4核，为了要跑1000个线程，则每个线程的时间槽非常短，这样就会导致线程切换非常频繁。频繁切换线程是有问题的：  
	1. 线程是有内存开销的，1个线程可能需要512K(或2M)存放栈，那么1000个线程就要512M(或2G)内存  
	2. 线程的切换，或者说上下文切换是有CPU开销的，当大量时间花在上下文切换的时候，分配给真正的操作的CPU就要少很多  

非阻塞I/O(nonblocking I/O)，如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig02)）所示，

![nonblocking_io.gif](/images/multiplexing-select-epoll-noblocking-socket/nonblocking_io.gif)

进程发起一个read操作时，如果数据还没有准备好，系统不再阻塞进程，而是返回一个error信息，此时进程知道所需数据还没有准备好，于是它可以等待一定时间再次发起read操作。一旦kernel中的数据准备好了，并且又再次收到了用户进程的系统调用，那么它马上就将数据拷贝到了用户内存，然后返回。所以，用户进程其实是需要不断地主动询问kernel数据是否准备好，也称作轮询，polling。非阻塞I/O的一个问题就是进程需要不断询问kernel数据是否准备好，而大多数时间实际上是数据还没有准备好，所以执行系统调用浪费了浪费了CPU时间，并且每次查询后等待多长时间再进行下一次查询也很难确定。

### 异步I/O
异步I/O是一种高级I/O技术。当进程发起一个异步read操作时(如`aio_read`)，用户进程可以立刻去做其他事情，kernel不会对用户进程产生任何阻塞，kernel会等待数据准备完成，然后将数据拷贝到用户内存，当这一切都完成之后，kernel会给用户进程发送一个signal，告诉它read操作完成了。注意的是操作的内存缓冲区需要保持稳定并且始终合法。下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig05)）是异步I/O的示意图。

![async_io.gif](/images/multiplexing-select-epoll-noblocking-socket/async_io.gif)

为了简化程序设计，常见异步I/O一般采用多线程或者多进程方式，使用同步模型编写程序，但是异步运行这些线程或进程。但是，如果需要大量I/O操作（比如并发网络连接很多），这种异步I/O可能会需要频繁新建、调度、销毁这些线程进程，系统开销较大。

### I/O多路转接
一种比较好的技术就是I/O多路转接，为了使用这个技术，首先构造一个文件描述符集合，然后调用 `select`, `poll`, `epoll` 函数，直到这些描述符中的一个准备好进行I/O时（或者超时）才返回。如下图（[图片来源](http://www.masterraghu.com/subjects/np/introduction/unix_network_programming_v1.3/ch06lev1sec2.html#ch06fig03)）。

![io_multiplexing.gif](/images/multiplexing-select-epoll-noblocking-socket/io_multiplexing.gif)

注意的是，**当进程调用 `select`时，进程是被阻塞的**。kernel会“监视”应用程序感兴趣的文件描述符，当任何一个数据准备好了，`select`就会返回。这个时候用户进程再调用read操作，将数据从kernel拷贝到用户进程。

#### select

`select`函数定义如下：

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
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
int FD_ISSET(int fd, fd_set *fdset);	// 测试fd是否在集合之中
void FD_CLR(int fd fd_set *fdset);	// 将fd从集合中清除
void FD_SET(int fd, fd_set *fdset);	// 将fd加入集合之中
void FD_ZERO(fd_set *fdset);	// 清空集合
</pre>

使用`select`完成socket非阻塞IO
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;arpa/inet.h&gt;
#include &lt;assert.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/select.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;unistd.h&gt;
#include &lt;algorithm&gt;

const int BUFFER_SIZE = 4096;
const int SERVER_PORT = 8888;
const int CONNECTIONS = 5;

int init_and_listen(const int port)
{
    int socketfd = socket(AF_INET, SOCK_STREAM, 0);
    if (socketfd == -1) {
        fprintf(stderr, &quot;get socket error\n&quot;);
        return -1;
    }

    sockaddr_in server_addr;
    memset(&amp;server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    int ret = bind(socketfd, (sockaddr *)&amp;server_addr, sizeof(sockaddr_in));
    if (ret == -1) {
        fprintf(stderr, &quot;bind socket fail\n&quot;);
        return -1;
    }

    ret = listen(socketfd, CONNECTIONS);
    if (ret == -1) {
        fprintf(stderr, &quot;listen socket error\n&quot;);
        return -1;
    }

    return socketfd;
}

int do_select(int listenfd)
{
    const int timeout = 5; /*s*/
    int server_fds[CONNECTIONS + 1];
    for (int i = 0; i &lt;= CONNECTIONS; ++i) {
        server_fds[i] = -1;
    }

    fd_set rfds;
    timeval tv;
    int max_fd;

    while (1) {
        FD_ZERO(&amp;rfds);
        server_fds[0] = listenfd;
        max_fd = -1;
        for (int i = 0; i &lt;= CONNECTIONS; ++i) {
            if (server_fds[i] &gt; -1) {
                FD_SET(server_fds[i], &amp;rfds);
                max_fd = std::max(max_fd, server_fds[i]);
            }
        }

        tv.tv_sec = timeout;
        tv.tv_usec = 0;
        int nready = select(max_fd + 1, &amp;rfds, NULL, NULL, &amp;tv);

        if (nready == -1) {
            fprintf(stderr, &quot;select error\n&quot;);
            exit(-1);
        } else if (nready == 0) {
            fprintf(stdout, &quot;select timeout\n&quot;);
        } else {
            if (FD_ISSET(server_fds[0], &amp;rfds)) {
                sockaddr_in client_addr;
                socklen_t client_addr_len = sizeof(sockaddr_in);
                int conn_fd = accept(server_fds[0], (sockaddr *)&amp;client_addr,
                                        &amp;client_addr_len);
                if (conn_fd &lt; 0) {
                    fprintf(stderr, &quot;error connection\n&quot;);
                } else {
                    fprintf(stdout, &quot;connect from %s:%d\n&quot;,
                            inet_ntoa(client_addr.sin_addr),
                            ntohs(client_addr.sin_port));
                    int next;
                    for (next = 1; next &lt;= CONNECTIONS; ++next) {
                        if (server_fds[next] == -1) break;
                    }
                    if (next &gt; CONNECTIONS) {
                        fprintf(stderr, &quot;too many connections\n&quot;);
                        close(conn_fd);
                    } else {
                        server_fds[next] = conn_fd;
                    }
                }
                --nready;
            }

            if (nready &gt; 0) {
                for (int i = 1; i &lt;= CONNECTIONS; ++i) {
                    if (server_fds[i] != -1 &amp;&amp; FD_ISSET(server_fds[i], &amp;rfds)) {
                        char buf[BUFFER_SIZE+1];
                        int n = recv(server_fds[i], buf, BUFFER_SIZE, 0);
                        if (n &gt; 0) {
                            buf[n] = '\0';
                            fprintf(stdout, &quot;connection %d: %s, n=%d\n&quot;, i, buf, n);
                        } else {
                            close(server_fds[i]);
                            server_fds[i] = -1;
                        }
                    }
                }
            }
        }
    }

    return 0;
}

int main()
{
    int listenfd = init_and_listen(SERVER_PORT);
    if (listenfd == -1) {
        fprintf(stderr, &quot;init fail\n&quot;);
        exit(-1);
    }
    do_select(listenfd);
    return 0;
}
</pre>

POSIX.1也定义了一个`select`函数的变体，`pselect`，定义如下：
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
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

#### poll

`select`存在以下4个问题：
1. fd数目限制
2. 3个集合在函数返回时会被内核修改，所以每次调用`select`之前都需要重新设置
3. 内核需要遍历fdset中的所有fd，查看哪些fd事件实际发生
4. 用户需要检查所有注册的fd，查看哪些fd事件发生，在大量连接下，可能实际发生的读写事件fd较少 

`poll`函数功能类似于`select`，同样提供多路转接技术。`poll`对`select`作出了改进，

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
int poll(struct pollfd *fds, int nfds, int timeout)

struct pollfd
{
	int     fd;
	short   events;     // 等待的事件
	short   revents;    // 实际发生的事件
};
</pre>

可以看到`poll`传入一个pollfd的动态数组，所以不再有fd大小的限制；pollfd定义了等待的事件events和实际发生的事件revents，内核只修改revents，也就解决了`select`每次需要重新设置的缺陷。但是3和4的问题仍然存在。

使用`poll`完成socket非阻塞IO
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;arpa/inet.h&gt;
#include &lt;assert.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/poll.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;unistd.h&gt;
#include &lt;algorithm&gt;

const int BUFFER_SIZE = 4096;
const int SERVER_PORT = 8888;
const int CONNECTIONS = 5;

int init_and_listen(const int port)
{
    int socketfd = socket(AF_INET, SOCK_STREAM, 0);
    if (socketfd == -1) {
        fprintf(stderr, &quot;get socket error\n&quot;);
        return -1;
    }

    sockaddr_in server_addr;
    memset(&amp;server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    int ret = bind(socketfd, (sockaddr *)&amp;server_addr, sizeof(sockaddr_in));
    if (ret == -1) {
        fprintf(stderr, &quot;bind socket fail\n&quot;);
        return -1;
    }

    ret = listen(socketfd, CONNECTIONS);
    if (ret == -1) {
        fprintf(stderr, &quot;listen socket error\n&quot;);
        return -1;
    }

    return socketfd;
}

int do_poll(int listenfd)
{
    const int timeout = 5000; /*ms*/
    struct pollfd server_fds[CONNECTIONS + 1];
    for (int i = 0; i &lt;= CONNECTIONS; ++i) {
        server_fds[i].fd = -1;
    }
    server_fds[0].fd = listenfd;
    server_fds[0].events = POLLIN;

    int max_fds_num = 1;
    while (1) {
        int nready = poll(server_fds, max_fds_num, timeout);
        if (nready &lt; 0) {
            fprintf(stderr, &quot;poll error\n&quot;);
            exit(-1);
        } else if (nready == 0) {
            fprintf(stdout, &quot;poll timeout\n&quot;);
        } else {
            if (server_fds[0].revents &amp; POLLIN) {
                sockaddr_in client_addr;
                socklen_t client_addr_len = sizeof(sockaddr_in);
                int conn_fd = accept(server_fds[0].fd, (sockaddr *)&amp;client_addr,
                                        &amp;client_addr_len);
                if (conn_fd &lt; 0) {
                    fprintf(stderr, &quot;error connection\n&quot;);
                } else {
                    fprintf(stdout, &quot;connect from %s:%d\n&quot;,
                            inet_ntoa(client_addr.sin_addr),
                            ntohs(client_addr.sin_port));
                    int next;
                    for (next = 1; next &lt;= CONNECTIONS; ++next) {
                        if (server_fds[next].fd == -1) {
                            break;
                        }
                    }
                    if (next &gt; CONNECTIONS) {
                        fprintf(stderr, &quot;too many connections\n&quot;);
                        close(conn_fd);
                    } else {
                        server_fds[next].fd = conn_fd;
                        server_fds[next].events = POLLIN;
                        max_fds_num = std::max(max_fds_num, next+1);
                    }
                    --nready;
                }
            }

            if (nready &gt; 0) {
                for (int i = 1; i &lt; max_fds_num; ++i) {
                    if (server_fds[i].fd != -1 &amp;&amp; server_fds[i].revents &amp; POLLIN) {
                        char buf[BUFFER_SIZE+1];
                        int n = recv(server_fds[i].fd, buf, BUFFER_SIZE, 0);
                        if (n &gt; 0) {
                            buf[n] = '\0';
                            fprintf(stdout, &quot;connection %d: %s, n=%d\n&quot;, i, buf, n);
                        } else {
                            close(server_fds[i].fd);
                            server_fds[i].fd = -1;
                        }
                    }
                }
            }
        }
    }

    return 0;
}

int main ()
{
    int listenfd = init_and_listen(SERVER_PORT);
    if (listenfd == -1) {
        fprintf(stderr, &quot;init fail\n&quot;);
        exit(-1);
    }
    do_poll(listenfd);
    return 0;
}
</pre>

#### epoll
`epoll`则解决了`select`和`poll`的缺陷。先来看epoll相关接口。

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
int epoll_create (int __size);
</pre>
创建一个epoll的句柄，size用来告诉内核需要监听的数目。创建好epoll句柄后，它会占用一个fd，在linux下查看/proc/process_id/fd/，是能够看到这个fd的。所以，使用完epoll后，必须调用`close()`关闭。

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
int epoll_ctl (int __epfd, int __op, int __fd, struct epoll_event *__event);
</pre>
- 第一个参数epfd，epoll句柄
- 第二个参数op表示对fd的操作，包括
```
/* Valid opcodes ( "op" parameter ) to issue to epoll_ctl().  */
#define EPOLL_CTL_ADD 1 /* Add a file descriptor to the interface.  */
#define EPOLL_CTL_DEL 2 /* Remove a file descriptor from the interface.  */
#define EPOLL_CTL_MOD 3 /* Change file descriptor epoll_event structure.  */
```
- 第三个参数需要监听的fd
- 第四个参数需要监听的事件，epoll event定义如下
<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
typedef union epoll_data
{
  void *ptr;
  int fd;
  uint32_t u32;
  uint64_t u64;
} epoll_data_t;

struct epoll_event
{
  uint32_t events;      /* Epoll events */
  epoll_data_t data;    /* User data variable */
} __EPOLL_PACKED;

// events可以是以下宏的组合
enum EPOLL_EVENTS
  {
    EPOLLIN = 0x001,
#define EPOLLIN EPOLLIN             // fd可读
    EPOLLPRI = 0x002,
#define EPOLLPRI EPOLLPRI           // fd有紧急数据可读
    EPOLLOUT = 0x004,
#define EPOLLOUT EPOLLOUT           // fd可写
    EPOLLRDNORM = 0x040,
#define EPOLLRDNORM EPOLLRDNORM     // 
    EPOLLRDBAND = 0x080,
#define EPOLLRDBAND EPOLLRDBAND     //
    EPOLLWRNORM = 0x100,
#define EPOLLWRNORM EPOLLWRNORM     //
    EPOLLWRBAND = 0x200,
#define EPOLLWRBAND EPOLLWRBAND     //
    EPOLLMSG = 0x400,
#define EPOLLMSG EPOLLMSG           //
    EPOLLERR = 0x008,
#define EPOLLERR EPOLLERR           // fd发生错误
    EPOLLHUP = 0x010,
#define EPOLLHUP EPOLLHUP           // fd被中断
    EPOLLRDHUP = 0x2000,
#define EPOLLRDHUP EPOLLRDHUP       //
    EPOLLWAKEUP = 1u << 29,
#define EPOLLWAKEUP EPOLLWAKEUP     //
    EPOLLONESHOT = 1u << 30,
#define EPOLLONESHOT EPOLLONESHOT   // 只监听一次事件，当监听完这次事件之后，就会把这个fd从epoll的队列中删除，如果还需要继续监听这个socket的话，需要再次把这个fd加入到EPOLL队列里
    EPOLLET = 1u << 31
#define EPOLLET EPOLLET             // 设置为边缘触发
  };
</pre>

<pre class="brush: c++; auto-links: true; collapse: false" id="simpleblock">
int epoll_wait (int __epfd, struct epoll_event *__events, int __maxevents, int __timeout);
</pre>
等待事件的发生，并把需要处理的事件通过events返回，函数返回值为需要处理事件的数量。此处可以看出，`epoll`解决了`select`／`poll`需要用户查询所有感兴趣fd的缺陷，尽管有大量连接，但`epoll`只处理active的连接。

`epoll`在初始化的时候（OS启动）会开辟自己的内核高速cache，用于安置需要监听的fd，并以红黑树进行管理，支持快速查找、插入、删除。

使用`epoll`完成socket非阻塞IO（水平触发）
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;arpa/inet.h&gt;
#include &lt;assert.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/epoll.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;unistd.h&gt;
#include &lt;algorithm&gt;

const int BUFFER_SIZE = 4096;
const int SERVER_PORT = 8888;
const int CONNECTIONS = 5;

int init_and_listen(int port)
{
    int socketfd = socket(AF_INET, SOCK_STREAM, 0);
    if (socketfd == -1) {
        fprintf(stderr, &quot;get socket error\n&quot;);
        return -1;
    }

    struct sockaddr_in server_addr;
    memset(&amp;server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(port);
    server_addr.sin_addr.s_addr = htonl(INADDR_ANY);

    int ret = bind(socketfd, (sockaddr *)&amp;server_addr, sizeof(sockaddr_in));
    if (ret == -1) {
        fprintf(stderr, &quot;bind socket fail\n&quot;);
        return -1;
    }

    ret = listen(socketfd, CONNECTIONS);
    if (ret == -1) {
        fprintf(stderr, &quot;listen socket error\n&quot;);
        return -1;
    }

    return socketfd;
}

int do_epoll(int listenfd)
{
    const int timeout = 5000; /*ms*/
    int epfd = epoll_create(CONNECTIONS+1);
    struct epoll_event events[CONNECTIONS+1];
    events[0].data.fd = listenfd;
    events[0].events = EPOLLIN;
    epoll_ctl(epfd, EPOLL_CTL_ADD, listenfd, &amp;(events[0]));

    while (1) {
        int nready = epoll_wait(epfd, events, CONNECTIONS+1, timeout);
        if (nready &lt; 0) {
            fprintf(stderr, &quot;epoll error\n&quot;);
            exit(-1);
        } else if (nready == 0) {
            fprintf(stdout, &quot;epoll timeout\n&quot;);
        } else {
            for (int i = 0; i &lt; nready; ++i) {
                if (events[i].data.fd == listenfd) {
                    sockaddr_in client_addr;
                    socklen_t client_addr_len = sizeof(sockaddr_in);
                    int conn_fd = accept(events[i].data.fd, (sockaddr *)&amp;client_addr, &amp;client_addr_len);
                    if (conn_fd &lt; 0) {
                        fprintf(stderr, &quot;error connection\n&quot;);
                    } else {
                        fprintf(stdout, &quot;connect from %s:%d\n&quot;,
                                inet_ntoa(client_addr.sin_addr),
                                ntohs(client_addr.sin_port));

                        struct epoll_event ev;
                        ev.data.fd = conn_fd;
                        ev.events = EPOLLIN;
                        if (epoll_ctl(epfd, EPOLL_CTL_ADD, conn_fd, &amp;ev) == -1) {
                            fprintf(stderr, &quot;add connection event error\n&quot;);
                            close(conn_fd);
                        }
                    }
                } else if (events[i].events &amp; EPOLLIN) {
                    char buf[BUFFER_SIZE+1];
                    int n = recv(events[i].data.fd, buf, BUFFER_SIZE, 0);
                    if (n &gt; 0) {
                        buf[n] = '\0';
                        fprintf(stdout, &quot;connection %d: %s, n=%d\n&quot;, i, buf, n);
                    } else {
                        if (epoll_ctl(epfd, EPOLL_CTL_DEL, events[i].data.fd, &amp;(events[i])) == -1) {
                            fprintf(stderr, &quot;del connection event error\n&quot;);
                        }
                        close(events[i].data.fd);
                    }
                } else {
                    // remove unknow event
                    epoll_ctl(epfd, EPOLL_CTL_DEL, events[i].data.fd, &amp;(events[i]));
                }
            }
        }
    }

    close(epfd);

    return 0;
}

int main ()
{
    int listenfd = init_and_listen(SERVER_PORT);
    if (listenfd == -1) {	
        fprintf(stderr, &quot;init fail\n&quot;);
        exit(-1);
    }
    do_epoll(listenfd);
    return 0;
}
</pre>

#### 边缘触发(ET) vs. 水平触发(LT)
> 转自极客时间专栏
> - 水平触发：只要文件描述符可以非阻塞地执行I/O ，就会触发通知。也就是说，应用程序可以随时检查文件描述符的状态，然后再根据状态，进行 I/O 操作。
> - 边缘触发：只有文件描述符的状态发生改变时（也就是I/O请求到达时）才发送一次通知。这时候，应用程序应该尽可能多地执行I/O，直到无法继续读写，才可以停止。如果I/O没执行完，或者因为某种原因没来得及处理，那么这次通知就丢失了。

## 写在最后
最后附测试client代码：
<pre class="brush: c++; auto-links: true; collapse: true" id="simpleblock">
#include &lt;arpa/inet.h&gt;
#include &lt;assert.h&gt;
#include &lt;netinet/in.h&gt;
#include &lt;stdio.h&gt;
#include &lt;stdlib.h&gt;
#include &lt;string.h&gt;
#include &lt;sys/socket.h&gt;
#include &lt;sys/types.h&gt;
#include &lt;unistd.h&gt;

#include &lt;iostream&gt;
#include &lt;sstream&gt;
#include &lt;thread&gt;

using namespace std;

const char* SERVER_IP = &quot;127.0.0.1&quot;;
const int SERVER_PORT = 8888;
const int CONNECTIONS = 16;
const int BUFFER_SIZE = 4096;

mutex sock_mtx;

int main()
{
    int socketfds[CONNECTIONS];
    for (int i = 0; i &lt; CONNECTIONS; ++i) {
        socketfds[i] = socket(AF_INET, SOCK_STREAM, 0);
        assert(socketfds[i] != -1);
    }

    sockaddr_in server_addr;
    memset(&amp;server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(SERVER_PORT);
    server_addr.sin_addr.s_addr = inet_addr(SERVER_IP);

    fprintf(stdout, &quot;connecting\n&quot;);

    int ret;
    for (int i = 0; i &lt; CONNECTIONS; ++i) {
        ret = connect(socketfds[i], (sockaddr*)&amp;server_addr, sizeof(sockaddr_in));
        assert(ret != -1);
    }

    fprintf(stdout, &quot;sending\n&quot;);

    thread sender[CONNECTIONS];
    for (int i = 0; i &lt; CONNECTIONS; ++i) {
        sender[i] = thread(
            [i](int socketfd) {
                char buf[BUFFER_SIZE];
                sprintf(buf, &quot;message from thread(%d)&quot;, i);
                int ret;
                {
                    lock_guard&lt;mutex&gt; lock(sock_mtx);
                    ret = send(socketfd, buf, sizeof(buf), 0);
                }
                if (ret != -1) {
                    fprintf(stdout, &quot;send success for thread(%d), ret=%d\n&quot;, i, ret);
                } else {
                    fprintf(stdout, &quot;send fail for thread(%d)\n&quot;, i);
                }
                std::this_thread::sleep_for(std::chrono::seconds(1));
            },
            socketfds[i]);
    }

    for (int i = 0; i &lt; CONNECTIONS; ++i) {
        sender[i].join();
    }

    for (int i = 0; i &lt; CONNECTIONS; ++i) {
        close(socketfds[i]);
    }

    return 0;
}
</pre>
