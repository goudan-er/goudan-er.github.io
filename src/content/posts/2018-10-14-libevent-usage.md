---
title: "libevent的使用"
date: "2018-10-14"
slug: "libevent-usage"
permalink: "/2018/libevent-usage/"
description: "复习libevent的使用"
categories: ["share", "后端技术 / 系统 / 分布式"]
tags: ["system", "programming"]
---
之前介绍了[I/O多路转接](../io-multiplexing/)，是一种高效的unix系统I/O模型。[libevent](https://libevent.org/) 是轻量级函数库，封装了不同操作系统底层最高效的网络IO模型，包括linux的poll/epoll模型，windows的compIO，freebsd的kqueue。[wikipedia介绍](https://en.wikipedia.org/wiki/Libevent):
> libevent is a software library that provides asynchronous event notification. The libevent API provides a mechanism to execute a callback function when a specific event occurs on a file descriptor or after a timeout has been reached. libevent also supports callbacks triggered by signals and regular timeouts.

本篇介绍一下libevent的基本使用。

## Timer
利用`event_add`传入timeout参数，实现timer。

```c++
#include <stdio.h>
#include <string.h>
#include <event2/event.h>
#include <event2/event_struct.h>
#include <event2/util.h>

void on_time(int sock, short event, void* arg)
{
	printf("enter on_time\nsock=%d, event=%d, arg=%s\n", sock, event, (char*)arg);
}

int main(int argc, char *argv[])
{
	int flag = 0;
	if (argc == 2 && !strcmp(argv[1], "-p")) {
		flag |= EV_PERSIST;
	}

	struct event ev_time;
	struct event_base *base = event_base_new();
	event_assign(&ev_time, base, -1, flag, &on_time, (void*)"hello world");

	struct timeval tv;
	evutil_timerclear(&tv);
	tv.tv_sec = 2;
	tv.tv_usec = 0;
	event_add(&ev_time, &tv);

	event_base_dispatch(base);

	return 0;
}

// g++ libevent_timer.cpp -I /usr/local/Cellar/libevent/2.1.8/include/ -L /usr/local/Cellar/libevent/2.1.8/lib/ -levent -g -o libevent_timer
```


注册timer的时候，如果不指定`EV_PERSIST`，则执行完timer event之后，会自动删除event；如果想要自动继续调用timeout event callback，可以加上flag `EV_PERSIST`。关于`EV_PERSIST`的[解释](http://www.wangafu.net/~nickm/libevent-book/Ref4_event.html)：
> About Event Persistence
By default, whenever a pending event becomes active (because its fd is ready to read or write, or because its timeout expires), it becomes non-pending right before its callback is executed. Thus, if you want to make the event pending again, you can call event_add() on it again from inside the callback function.  
<br/>If the EV_PERSIST flag is set on an event, however, the event is persistent. This means that event remains pending even when its callback is activated. If you want to make it non-pending from within its callback, you can call event_del() on it.  
<br/>The timeout on a persistent event resets whenever the event’s callback runs. Thus, if you have an event with flags EV_READ|EV_PERSIST and a timeout of five seconds, the event will become active:  
	1. Whenever the socket is ready for reading.  
	2. Whenever five seconds have passed since the event last became active.

可以参考这里的[中文解释](https://segmentfault.com/a/1190000007421060)

## TCP服务器
使用Libevent的`bufferevent`可以很容易实现非阻塞socket编程，，缓冲区处理也变得简单。


```c++
#include <stdio.h>
#include <string.h>
#include <assert.h>
#include <event2/event.h>
#include <event2/listener.h>
#include <event2/bufferevent.h>
#include <event2/buffer.h>
#include <netinet/in.h>
#include <arpa/inet.h>

void read_cb(struct bufferevent *bufev, void *ctx)
{
	struct evbuffer *input = bufferevent_get_input(bufev);
	struct evbuffer *output = bufferevent_get_output(bufev);

	size_t len = evbuffer_get_length(input);
	char buf[1024] = {0};
	evbuffer_copyout(input, buf, 1024);
	fprintf(stdout, "recv %s", buf);

	evbuffer_add_buffer(output, input);
}

void event_cb(struct bufferevent *bufev, short events, void *ctx)
{
	if (events & BEV_EVENT_ERROR)
	{
		int err = EVUTIL_SOCKET_ERROR();
		fprintf(stderr, "got an error from bufferevent: %s\n", evutil_socket_error_to_string(err));
	}

	if (events & (BEV_EVENT_EOF | BEV_EVENT_ERROR))
	{
		bufferevent_free(bufev);
	}
}

void on_accept(struct evconnlistener *listener, evutil_socket_t fd,
	struct sockaddr *address, int socklen, void *arg)
{
	// set socket nonblocking
	evutil_make_socket_nonblocking(fd);

	struct event_base *base = evconnlistener_get_base(listener);
	struct bufferevent *bufev = bufferevent_socket_new(base, fd, BEV_OPT_CLOSE_ON_FREE);
	bufferevent_setcb(bufev, read_cb, NULL, event_cb, NULL);
	bufferevent_enable(bufev, EV_READ|EV_WRITE);
}

int main()
{
	// initialize socket
	const int connections = 10;
	struct sockaddr_in server_addr;
	memset(&server_addr, 0, sizeof(server_addr));
	server_addr.sin_family = AF_INET;
	server_addr.sin_addr.s_addr = inet_addr("127.0.0.1");
	server_addr.sin_port = htons(8888);

	// setup event
	struct event_base *base = event_base_new();
	struct evconnlistener *listener = evconnlistener_new_bind(base, on_accept, nullptr, LEV_OPT_CLOSE_ON_FREE|LEV_OPT_REUSEABLE, -1, 
		reinterpret_cast<struct sockaddr *>(&server_addr), sizeof(server_addr));

	if (listener == nullptr) {
		fprintf(stderr, "fail to create evconnlistener\n");
	}

	event_base_dispatch(base);
	return 0;
}
```


## HTTP服务器
使用libevent内置的http相关接口，可以很容易的构建一个Http Server。如果想实现一个https server，也是可行的，可参考[这里](https://github.com/ppelleti/https-example/blob/master/https-server.c)

```c++
#include <stdio.h>
#include <string.h>
#include <event2/event.h>
#include <event2/event_struct.h>
#include <event2/buffer.h>
#include <event2/http.h>
#include <event2/util.h>
#include <sys/socket.h>

void generic_cb(struct evhttp_request *req, void *arg)
{
	struct evbuffer *resp_buf = evhttp_request_get_output_buffer(req);
	evbuffer_add_printf(resp_buf, "<html><body><center><h1>Generic Request Handler!</h1></center></body></html>");
	evhttp_send_reply(req, HTTP_OK, "", resp_buf);
}

void say_hello(struct evhttp_request *req, void *arg)
{
	struct evbuffer *resp_buf = evhttp_request_get_output_buffer(req);
	evbuffer_add_printf(resp_buf, "<html><body><center><h1>Hello World!</h1></center></body></html>");
	evhttp_send_reply(req, HTTP_OK, "", resp_buf);
}

int main(int argc, char *argv[])
{
	const int port = 8000;
	const char *addr = "127.0.0.1";
	struct evhttp *httpserver = nullptr;

	struct event_base *base = event_base_new();
	if (!base) {
		fprintf(stderr, "Couldn't create an event_base: exiting\n");
		return 1;
	}

	struct evhttp *httpeserver = evhttp_new(base);
	if (!httpeserver) {
		fprintf(stderr, "couldn't create evhttp. Exiting.\n");
		return 1;
	}

	// 注册一个处理/hello URI的callback
	evhttp_set_cb(httpeserver, "/hello", say_hello, NULL);
	// 也可以对其他URI设置一个generic http callback
	evhttp_set_gencb(httpeserver, generic_cb, NULL);

	struct evhttp_bound_socket *handler = evhttp_bind_socket_with_handle(httpeserver, addr, port);
	if (!handler) {
		fprintf(stderr, "couldn't bind to addr %s, port %d. Exiting.\n", addr, port);
		return 1;
	}

	// extract and display the address that httpserver is listening on
	{
		evutil_socket_t fd = evhttp_bound_socket_get_fd(handler);
		struct sockaddr_storage ss;
		ev_socklen_t socklen = sizeof(ss);
		memset(&ss, 0, sizeof(ss));
		if (getsockname(fd, (struct sockaddr *)&ss, &socklen)) {
			fprintf(stderr, "getsockname() failed\n");
			return 1;
		}

		int got_port = -1;
		void *inaddr = nullptr;
		if (ss.ss_family = AF_INET) {
			got_port = ntohs(((struct sockaddr_in*)&ss)->sin_port);
			inaddr = &((struct sockaddr_in*)&ss)->sin_addr;
		} else if (ss.ss_family = AF_INET6) {
			got_port = ntohs(((struct sockaddr_in6*)&ss)->sin6_port);
			inaddr = &((struct sockaddr_in6*)&ss)->sin6_addr;
		} else {
			fprintf(stderr, "wired address family, %d\n", ss.ss_family);
			return 1;
		}

		char addrbuf[128];
		const char * got_addr = evutil_inet_ntop(ss.ss_family, inaddr, addrbuf, sizeof(addrbuf));
		if (got_addr) {
			printf("listening on http://%s:%d\n", got_addr, got_port);
		} else {
			fprintf(stderr, "evutil_inet_ntop failed\n");
			return 1;
		}
	}

	event_base_dispatch(base);

	return 0;
}
```


## Reference
[https://github.com/libevent/libevent/tree/master/sample](https://github.com/libevent/libevent/tree/master/sample)
[https://www.pacificsimplicity.ca/blog/libevent-echo-server-tutorial](https://www.pacificsimplicity.ca/blog/libevent-echo-server-tutorial)
[https://segmentfault.com/a/1190000005601925](https://segmentfault.com/a/1190000005601925)
