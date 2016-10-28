---
layout: page
title: "C++单例模式"
teaser: "几种单例模式要会写..."
categories:
    - share
    - code
tags:
    - C++
---

- Lazy Singleton（单例模式一般写法 ）

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class Singleton {
private:
    Singleton();
    ~Singleton();
    Singleton(const Singleton & rhs);
    Singleton& operator=(const Singleton & rhs);

public:
    static Singleton& getInstance()
    {
        if (instance == nullptr) {
            instance = new Singleton;
        }
        return instance;
    }

private:
    static Singleton * instance;
};
</pre>

说明：```getInstance()``` 返回引用而不是指针，可以防止指针在外部被 delete 掉。而且，直到 ```getInstance()``` 被访问，才会new一个实例，所以被称为Lazy Singleton。

但是，Lazy Singleton不是线程安全的，很容易理解，当线程A和线程B都通过了 ```instance == nullptr``` 的判断，那么线程A和线程B都会创建新的实例，破坏了唯一性。

- Meyers Singleton

Effective C++ Item 04 上提到的一种实现。把 non-local static 对象替换为 local static 对象。因为 C++ 保证 local static 对象会在该函数被调用期间首次遇到该对象时进行初始化。

同时，C++0x之后，这种实现方式编译器将保证是线程安全的。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class Singleton {
private:
    Singleton();
    ~Singleton();
    Singleton(const Singleton & rhs);
    Singleton& operator=(const Singleton & rhs);

public:
    static Singleton& getInstance()
    {
        static Singleton instance;
        return instance;
    }
};
</pre>

- 双检测锁模式（Double-Checked Locking Pattern）

也就是说，在判断 ```instance == nullptr``` 前加锁，但是加锁是有开销的，可以稍加修改代码，使得只在第一次创建实例时加锁。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
static Singleton& getInstance()
{
    if (instance == nullptr) {
        Lock lock;  // 在作用域范围内加锁，离开作用域自动析构
        if (instance == nullptr) {
            instance = new Singleton;
        }
        return *instance;
    }
}
</pre>

C++11中，标准库提供了原子操作，一种DCLP实现如下：(参考自[这里](http://preshing.com/20130930/double-checked-locking-is-fixed-in-cpp11/))

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class Singleton {
private:
    Singleton();
    ~Singleton();
    Singleton(const Singleton &amp; rhs);
    Singleton&amp; operator=(const Singleton &amp; rhs);

public:
    static Singleton&amp; getInstance()
    {
        Singleton * tmp = m_instance.load(std::memory_order_acquire);
        if (tmp == nullptr) {
            std::lock_guard&lt;std::mutex&gt; lock(m_mutex);
            tmp = m_instance.load(std::memory_order_relaxed);
            if (tmp == nullptr) {
                tmp = new Singleton;
                m_instance.store(tmp, std::memory_order_release);
            }
        }
        return *tmp;
    }

private:
    static std::atomic&lt;Singleton *&gt; m_instance;
    static std::mutex m_mutex;
};
</pre>