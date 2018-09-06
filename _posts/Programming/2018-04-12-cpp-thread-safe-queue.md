---
layout: page
title: C++11实现线程安全的队列
teaser: "使用C++11提供的互斥锁和条件变量完成线程安全的队列"
categories:
    - share
    - cpp
tags: 
    - C++
---

使用C++11提供的互斥锁 `std::mutex` 和条件变量 `std::condition_variable` 完成线程安全的队列。  

后面进行了测试，启动3个线程从global的队列里读取数据并输出。  

见代码。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
#include &lt;mutex&gt;
#include &lt;queue&gt;
#include &lt;thread&gt;

#include &lt;iostream&gt;
#include &lt;stdlib.h&gt;
#include &lt;time.h&gt;

template&lt;typename T&gt;
class thread_safe_queue {
private:
	mutable std::mutex mtx;
	mutable std::condition_variable data_cond;
	using queue_type = std::queue&lt;T&gt;;
	queue_type data_queue;

public:
	using value_type = typename queue_type::value_type;
	using container_type = typename queue_type::container_type;
	
	// 默认构造函数
	thread_safe_queue() = default;
	
	// 使用容器为参数的构造函数
	explicit thread_safe_queue(const container_type&amp; c) : data_queue(c) {}
	template&lt;typename _InputIterator&gt;
	thread_safe_queue(_InputIterator first, _InputIterator last)
	{
		for (auto it = first; it != last; ++it) {
			data_queue.push(*it);
		}
	}

	// 使用初始化列表为参数的构造函数
	thread_safe_queue(std::initializer_list&lt;value_type&gt; list) : thread_safe_queue(list.begin(), list.end()) {}

	// 入队列
	void push(const value_type&amp; value)
	{
		std::lock_guard&lt;std::mutex&gt; lk(mtx);
		data_queue.push(std::move(value));
		data_cond.notify_one();
	}

	// 出队列
	value_type wait_and_pop()
	{
		std::unique_lock&lt;std::mutex&gt; lk(mtx);
		data_cond.wait(lk, [this]{return !this-&gt;data_queue.empty();});
		auto value = std::move(data_queue.front());
		data_queue.pop();
		return value;
	}

	bool try_pop(value_type&amp; value)
	{
		std::lock_guard&lt;std::mutex&gt; lk(mtx);
		if (data_queue.empty())
			return false;
		value = std::move(data_queue.front());
		data_queue.pop();
		return true;
	}

	// 返回队列是否为空
	auto empty() const-&gt;decltype(data_queue.empty())
	{
		std::lock_guard&lt;std::mutex&gt; lk(mtx);
		return data_queue.empty();
	}

	// 返回队列元素个数
	auto size() const-&gt;decltype(data_queue.size())
	{
		std::lock_guard&lt;std::mutex&gt; lk(mtx);
		return data_queue.size();
	}
};

const int CONSUMERS_NUMS = 3;
std::thread* consumers[CONSUMERS_NUMS];
//const int PRODUCERS_NUMS = 10;
//std::thread* producers[PRODUCERS_NUMS];

thread_safe_queue&lt;int&gt; numbers;

void produce(int value)
{
	numbers.push(value);
}

void init_threads(std::mutex&amp; output_mutex)
{
	for (int i = 0; i &lt; CONSUMERS_NUMS; ++i) {
		consumers[i] = new std::thread([&amp;output_mutex]() {
				while (1) {
					int value = numbers.wait_and_pop();
					std::lock_guard&lt;std::mutex&gt; lk(output_mutex);
					std::cout &lt;&lt; &quot;thread &quot; &lt;&lt; std::this_thread::get_id() &lt;&lt; &quot;, value  = &quot; &lt;&lt; value &lt;&lt; &quot;, value * value = &quot; &lt;&lt; value * value  &lt;&lt; std::endl;
					//std::this_thread::sleep_for(std::chrono::microseconds(500));
				}
				});
		consumers[i]-&gt;detach();
	}
}

int main ()
{
	std::mutex output_mutex;
	init_threads(output_mutex);	

	//std::srand(std::time(nullptr));
	const int NUM = 10;
	std::vector&lt;int&gt; nums;
	for (int i = 0; i &lt; NUM; ++i) {
		//nums.push_back(std::rand() % 999);
		nums.push_back(i);
	}

	for (int value : nums) {
	//while (1) {
		//int value;
		//std::cin &gt;&gt; value;
		produce(value);
		std::this_thread::sleep_for(std::chrono::microseconds(500));
	}
	return 0;
}


/*
output:
thread 0x7000088a8000, value  = 0, value * value = 0
thread 0x70000892b000, value  = 1, value * value = 1
thread 0x7000089ae000, value  = 2, value * value = 4
thread 0x7000088a8000, value  = 3, value * value = 9
thread 0x70000892b000, value  = 4, value * value = 16
thread 0x7000089ae000, value  = 5, value * value = 25
thread 0x7000088a8000, value  = 6, value * value = 36
thread 0x70000892b000, value  = 7, value * value = 49
thread 0x7000089ae000, value  = 8, value * value = 64
thread 0x7000088a8000, value  = 9, value * value = 81
*/
</pre>
