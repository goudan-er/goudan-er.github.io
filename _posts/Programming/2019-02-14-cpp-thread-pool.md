---
layout: page
title: "C++实现简单线程池"
teaser: "一个任务队列，一个线程容器，然后每次取一个任务分配给一个线程去做，循环往复..."
categories:
    - share
    - cpp
tags:
    - C++
    - programming
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

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
#ifndef GG_THREAD_POOL_H_
#define GG_THREAD_POOL_H_

#include &lt;condition_variable&gt;
#include &lt;mutex&gt;
#include &lt;atomic&gt;
#include &lt;thread&gt;
#include &lt;functional&gt;
#include &lt;future&gt;
#include &lt;queue&gt;
#include &lt;vector&gt;

namespace gg {

class ThreadPool {
public:
    using Task = std::function&lt;void()&gt;;

    explicit ThreadPool(size_t num_threads = 1)
        : stop_(false), total_threads_num_(num_threads)
    {
        if (total_threads_num_ == 0) {
            total_threads_num_ = std::thread::hardware_concurrency();
        }

        for (size_t i = 0; i &lt; total_threads_num_; ++i) {
            thread_pool_.push_back(std::thread([this]() {
                while (!stop_.load(std::memory_order_acquire)) {
                    Task task;
                    {
                        std::unique_lock&lt;std::mutex&gt; ulk(task_queue_mutex_);
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
        for (auto &amp;t : thread_pool_) {
            if (t.joinable())
                t.join();
        }
    }

    size_t total_num_threads() const { return total_threads_num_; }

    template &lt;class Function, class... Args&gt;
    std::future&lt;typename std::result_of&lt;Function(Args...)&gt;::type&gt; add(
        Function&amp;&amp; f, Args&amp;&amp;... args)
    {
        if (is_stopped()) {
            throw std::runtime_error(&quot;std::thread pool is stopped&quot;);
        }
        using return_type = typename std::result_of&lt;Function(Args...)&gt;::type;
        auto task = std::make_shared&lt;std::packaged_task&lt;return_type()&gt;&gt;(
            std::bind(std::forward&lt;Function&gt;(f), std::forward&lt;Args&gt;(args)...));
        auto ret = task-&gt;get_future();
        {
            std::lock_guard&lt;std::mutex&gt; guard(task_queue_mutex_);
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
    std::queue&lt;Task&gt; task_queue_;
    std::vector&lt;std::thread&gt; thread_pool_;
    std::mutex task_queue_mutex_;
    std::condition_variable task_cv_;
    std::atomic&lt;bool&gt; stop_;
    size_t total_threads_num_;
};

}  // namespace gg
</pre>

测试代码，每一个线程计算$2^n$：  
<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
#include &quot;thread_pool.h&quot;

#include &lt;iostream&gt;

int64_t power(int64_t x, int n)
{
    int64_t ans = 1;
    while (n != 0) {
        if ((n&amp;1) == 1) {
            ans *= x;
        }
        x *= x;
        n &gt;&gt;= 1;
    }
    return ans;
}

int main ()
{
    gg::ThreadPool thread_pool(8);
    using task_ret_type = std::future&lt;int64_t&gt;;
    const int task_num = 50;
    std::vector&lt;task_ret_type&gt; vec_task_future;
    for (int i = 0; i &lt; task_num; ++i) {
        vec_task_future.emplace_back(thread_pool.add(power, 2, i));
    }
    for (auto&amp;&amp; f : vec_task_future) {
        std::cout &lt;&lt; f.get() &lt;&lt; std::endl;
    }
    return 0;
}
</pre>