---
title: "C++实现简单线程池"
date: "2019-02-14"
slug: "cpp-thread-pool"
permalink: "/2019/cpp-thread-pool/"
description: "一个任务队列，一个线程容器，然后每次取一个任务分配给一个线程去做，循环往复..."
categories: ["share", "C++"]
tags: ["C++", "programming"]
---
关键要实现以下接口：  
1. 线程池构造函数，初始化线程容器
2. `add`，向任务队列添加一个task

知识点：  
1. lambada  
2. future  
3. condition_variable  
4. 可变模版参数  
5. memory order    


```cpp
#ifndef GG_THREAD_POOL_H_
#define GG_THREAD_POOL_H_

#include <condition_variable>
#include <mutex>
#include <atomic>
#include <thread>
#include <functional>
#include <future>
#include <queue>
#include <vector>

namespace gg {

class ThreadPool {
public:
    using Task = std::function<void()>;

    explicit ThreadPool(size_t num_threads = 1)
        : stop_(false), total_threads_num_(num_threads)
    {
        if (total_threads_num_ == 0) {
            total_threads_num_ = std::thread::hardware_concurrency();
        }

        for (size_t i = 0; i < total_threads_num_; ++i) {
            thread_pool_.push_back(std::thread([this]() {
                while (!stop_.load(std::memory_order_acquire)) {
                    Task task;
                    {
                        std::unique_lock<std::mutex> ulk(task_queue_mutex_);
                        task_cv_.wait(ulk, [this]() {
                            return stop_.load(std::memory_order_acquire) ||
                                   !task_queue_.empty();
                        });
                        if (stop_.load(std::memory_order_acquire))
                            return ;
                        task = std::move(task_queue_.front());
                        task_queue_.pop();
                    }
                    task();
                }
            }));
        }
    }

    ~ThreadPool()
    {
        stop();
        task_cv_.notify_all();
        for (auto &t : thread_pool_) {
            if (t.joinable())
                t.join();
        }
    }

    size_t total_num_threads() const { return total_threads_num_; }

    template <class Function, class... Args>
    std::future<typename std::result_of<Function(Args...)>::type> add(
        Function&& f, Args&&... args)
    {
        if (is_stopped()) {
            throw std::runtime_error("std::thread pool is stopped");
        }
        using return_type = typename std::result_of<Function(Args...)>::type;
        auto task = std::make_shared<std::packaged_task<return_type()>>(
            std::bind(std::forward<Function>(f), std::forward<Args>(args)...));
        auto ret = task->get_future();
        {
            std::lock_guard<std::mutex> guard(task_queue_mutex_);
            task_queue_.emplace([task]() {
                (*task)();
            });
        }
        task_cv_.notify_one();
        return ret;
    }

    void stop() { stop_.store(true, std::memory_order_release); }
    bool is_stopped() { return stop_.load(std::memory_order_acquire); }

private:
    std::queue<Task> task_queue_;
    std::vector<std::thread> thread_pool_;
    std::mutex task_queue_mutex_;
    std::condition_variable task_cv_;
    std::atomic<bool> stop_;
    size_t total_threads_num_;
};

}  // namespace gg
```


测试代码，每一个线程计算$2^n$：  

```cpp
#include "thread_pool.h"

#include <iostream>

int64_t power(int64_t x, int n)
{
    int64_t ans = 1;
    while (n != 0) {
        if ((n&1) == 1) {
            ans *= x;
        }
        x *= x;
        n >>= 1;
    }
    return ans;
}

int main ()
{
    gg::ThreadPool thread_pool(8);
    using task_ret_type = std::future<int64_t>;
    const int task_num = 50;
    std::vector<task_ret_type> vec_task_future;
    for (int i = 0; i < task_num; ++i) {
        vec_task_future.emplace_back(thread_pool.add(power, 2, i));
    }
    for (auto&& f : vec_task_future) {
        std::cout << f.get() << std::endl;
    }
    return 0;
}
```
