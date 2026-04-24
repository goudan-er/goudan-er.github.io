---
title: "C++11实现线程安全的队列"
date: "2018-04-12"
slug: "cpp-thread-safe-queue"
permalink: "/2018/cpp-thread-safe-queue/"
description: "使用C++11提供的互斥锁和条件变量完成线程安全的队列"
categories: ["share", "C++"]
tags: ["C++"]
---
使用C++11提供的互斥锁 `std::mutex` 和条件变量 `std::condition_variable` 完成线程安全的队列。  

后面进行了测试，启动3个线程从global的队列里读取数据并输出。  

见代码。


```cpp
#include <mutex>
#include <queue>
#include <thread>

#include <iostream>
#include <stdlib.h>
#include <time.h>

template<typename T>
class thread_safe_queue {
private:
	mutable std::mutex mtx;
	mutable std::condition_variable data_cond;
	using queue_type = std::queue<T>;
	queue_type data_queue;

public:
	using value_type = typename queue_type::value_type;
	using container_type = typename queue_type::container_type;
	
	// 默认构造函数
	thread_safe_queue() = default;
	
	// 使用容器为参数的构造函数
	explicit thread_safe_queue(const container_type& c) : data_queue(c) {}
	template<typename _InputIterator>
	thread_safe_queue(_InputIterator first, _InputIterator last)
	{
		for (auto it = first; it != last; ++it) {
			data_queue.push(*it);
		}
	}

	// 使用初始化列表为参数的构造函数
	thread_safe_queue(std::initializer_list<value_type> list) : thread_safe_queue(list.begin(), list.end()) {}

	// 入队列
	void push(const value_type& value)
	{
		std::lock_guard<std::mutex> lk(mtx);
		data_queue.push(std::move(value));
		data_cond.notify_one();
	}

	// 出队列
	value_type wait_and_pop()
	{
		std::unique_lock<std::mutex> lk(mtx);
		data_cond.wait(lk, [this]{return !this->data_queue.empty();});
		auto value = std::move(data_queue.front());
		data_queue.pop();
		return value;
	}

	bool try_pop(value_type& value)
	{
		std::lock_guard<std::mutex> lk(mtx);
		if (data_queue.empty())
			return false;
		value = std::move(data_queue.front());
		data_queue.pop();
		return true;
	}

	// 返回队列是否为空
	auto empty() const->decltype(data_queue.empty())
	{
		std::lock_guard<std::mutex> lk(mtx);
		return data_queue.empty();
	}

	// 返回队列元素个数
	auto size() const->decltype(data_queue.size())
	{
		std::lock_guard<std::mutex> lk(mtx);
		return data_queue.size();
	}
};

const int CONSUMERS_NUMS = 3;
std::thread* consumers[CONSUMERS_NUMS];
//const int PRODUCERS_NUMS = 10;
//std::thread* producers[PRODUCERS_NUMS];

thread_safe_queue<int> numbers;

void produce(int value)
{
	numbers.push(value);
}

void init_threads(std::mutex& output_mutex)
{
	for (int i = 0; i < CONSUMERS_NUMS; ++i) {
		consumers[i] = new std::thread([&output_mutex]() {
				while (1) {
					int value = numbers.wait_and_pop();
					std::lock_guard<std::mutex> lk(output_mutex);
					std::cout << "thread " << std::this_thread::get_id() << ", value  = " << value << ", value * value = " << value * value  << std::endl;
					//std::this_thread::sleep_for(std::chrono::microseconds(500));
				}
				});
		consumers[i]->detach();
	}
}

int main ()
{
	std::mutex output_mutex;
	init_threads(output_mutex);	

	//std::srand(std::time(nullptr));
	const int NUM = 10;
	std::vector<int> nums;
	for (int i = 0; i < NUM; ++i) {
		//nums.push_back(std::rand() % 999);
		nums.push_back(i);
	}

	for (int value : nums) {
	//while (1) {
		//int value;
		//std::cin >> value;
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
```
