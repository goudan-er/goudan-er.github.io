---
layout: page
title: "C++智能指针"
teaser: "智能指针作用，便于内存管理，确保程序不存在内存和资源泄露，并且是异常安全的。"
categories:
    - share
    - cpp
tags:
    - C++
---

Effective C++ Item 13，以对象管理资源，提到了两个关键点：   

- 获得资源后立即放进管理对象  
- 管理对象运用析构函数确保资源被释放  

智能指针就是为了迎合以上两点，作用就是 **便于内存管理，确保程序不存在内存和资源泄露，并且是异常安全的。**  

***

C++存有四种智能指针

- <s>auto_ptr</s>

```auto_ptr``` , __C++11已经弃用__。auto_ptr管理的资源 <u>绝对没有一个以上的 auto_ptr 指向这份资源</u>，也就是说 复制一个 ```auto_ptr``` 时，被复制的 ```auto_ptr``` 会指向为空。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
auto_ptr&lt;int&gt; p1(new int(10));

auto_ptr&lt;int&gt; p2 = p1;

cout &lt;&lt; p1.get() &lt;&lt; endl; // output: 0, &#21363; p1 = nullptr
</pre>

- unique_ptr

```unique_ptr``` , ```auto_ptr``` 的替代品，与 ```auto_ptr``` 一样拥有唯一拥有权的特性，不过，与 ```auto_ptr``` 不一样的是，```unique_ptr``` 没有复制构造函数，这样可以防止使用者不小心转移了拥有权。如果想转移拥有权，需要显示调用 ```move``` 函数。所以，函数传参值传递的时候也需要显示调用 ```move``` 函数。但是，函数的返回值已经进行了 ```move``` ，所以不需要显示调用 ```move``` 函数。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
unique_ptr&lt;int&gt; fun(unique_ptr&lt;int&gt; p)
{
    return p;
}

int main()
{
    shared_ptr&lt;A&gt; arrayObj(new A[5], [](A *p) {
        delete[] p;
    });

    unique_ptr&lt;int&gt; p(new int (10));

    // unique_ptr&lt;int&gt; p1 = p;  //! error: use of deleted function...

    unique_ptr&lt;int&gt; p2 = move(p);

    unique_ptr&lt;int&gt; p3 = fun(move(p2));

    return 0;
}
</pre>

```unique_ptr``` 的 ```release()``` 方法虽然不会销毁 ```unique_ptr``` 指向的资源，但是调用 ```release()``` 方法后，```unique_ptr``` 就会从管理资源的责任重解脱出来，也就是说，此时必须要手动销毁资源。

- share_ptr

```share_ptr``` , 采用引用计数的智能指针，多个 ```share_ptr``` 可以共享资源，如果一个 ```share_ptr``` 放弃资源的"所有权"，其他 ```share_ptr``` 对资源的引用并不会发生变化。只有在引用计数为0的时候，```share_ptr``` 才会释放资源。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
void fun(shared_ptr&lt;int&gt; p)
{
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p.use_count() &lt;&lt; endl;  // &#20989;&#25968;&#20256;&#21442;&#65292;&#20540;&#20256;&#36882;&#65292;&#25152;&#20197;&#24341;&#29992;&#25968;+1
}

int main ()
{
    shared_ptr&lt;int&gt; p1(new int(10));
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p1.use_count() &lt;&lt; endl;

    shared_ptr&lt;int&gt; p2 = p1;
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p1.use_count() &lt;&lt; endl;

    fun(p1);
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p1.use_count() &lt;&lt; endl;  // &#20989;&#25968;&#36864;&#20986;&#65292;&#21442;&#25968;&#30340; share_ptr &#33258;&#21160;&#38144;&#27585;&#65292;&#24341;&#29992;&#25968;-1

    p2.reset();
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p1.use_count() &lt;&lt; endl;
    p3.reset();
    cout &lt;&lt; &quot;ref count:&quot; &lt;&lt; p1.use_count() &lt;&lt; endl;  // &#27492;&#26102;&#21482;&#26377;p1&#25351;&#21521;&#36164;&#28304;&#65292;&#21482;&#26377;&#19968;&#20221;&#24341;&#29992;

    return 0;
}

output:
ref count:1
ref count:2
ref count:3  // &#20989;&#25968;&#20256;&#21442;&#65292;&#20540;&#20256;&#36882;&#65292;&#25152;&#20197;&#24341;&#29992;&#25968;+1
ref count:2  // &#20989;&#25968;&#36864;&#20986;&#65292;&#21442;&#25968;&#30340;share_ptr&#33258;&#21160;&#38144;&#27585;&#65292;&#24341;&#29992;&#25968;-1
ref count:2
ref count:1  // &#27492;&#26102;&#21482;&#26377;p1&#25351;&#21521;&#36164;&#28304;&#65292;&#21482;&#26377;&#19968;&#20221;&#24341;&#29992;
</pre>

使用 ```share_ptr``` 的时候要注意避免使用 ```get()``` 方法获取和使用裸指针，因为使用裸指针的时候，可能会不经意间手动 ```delete``` 了资源对象，所以，当 ```share_ptr``` 去试图销毁管理的资源时，导致<u>ACCESS VIOLATION</u>

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
shared_ptr&lt;int&gt; a(new int(10));
int * pa = a.get();
delete pa;
//! ACCESS VIOLATION
</pre>

```share_ptr``` 将调用 ```delete``` 释放内存，所以当 ```share_ptr``` 指向数组对象的时候，传递给 ```share_ptr``` 一个自定义的 ```delete``` 方法。可通过 lambda 表达式完成。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class A {
public:
    A()
    {
        cout&lt;&lt;&quot;constructor&quot;&lt;&lt;endl;
    }
    ~A()
    {
        cout &lt;&lt; &quot;destructor&quot;&lt;&lt;endl;
    }
};

int main()
{
    shared_ptr&lt;A&gt; arrayObj(new A[5], [](A *p) {
        delete[] p;
    });

    return 0;
}
</pre>

```share_ptr``` 已经足够好足够用了，但是还是可能出现问题，比如下面的代码，就会出现 环形引用问题，如下代码，A和B的对象各有一份，且引用数为2，程序结束时，即使会销毁智能指针，但是由于引用数不为0，对象并不能被回收，造成内存泄漏。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class B;

class A {
public:
    shared_ptr&lt;B&gt; p_b;
};

class B {
public:
    shared_ptr&lt;A&gt; p_a;
};

int main()
{
    shared_ptr&lt;A&gt; a(new A);
    shared_ptr&lt;B&gt; b(new B);

    a-&gt;p_b = b;
    b-&gt;p_a = a;

    return 0;
}  
</pre>

- weak_ptr

要解决环形引用问题并没有好的解决办法，除了在编码过程中注意，也可以在可能出现环形引用的地方使用 ```weak_ptr``` 。
```weak_ptr``` 比较特殊，它可以指向 ```share_ptr``` 指向的资源，但是却不拥有该资源。可以通过 ```weak_ptr``` 对象的成员函数 ```lock()``` 返回指向该资源的一个 ```share_ptr``` 对象。如果 ```weak_ptr``` 指向的资源已经无效时，会返回一个空值 nullptr 。所以使用 ```lock()``` 时，要注意返回的 ```share_ptr``` 是否有效。由于 ```weak_ptr``` 是指向 ```share_ptr``` 指向的资源，所以 ```weak_ptr``` 不能独立存在。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
void fun(weak_ptr&lt;int&gt; &amp; wp)
{
    shared_ptr&lt;int&gt; p = wp.lock();
    if (p != nullptr) {
        cout &lt;&lt; *p &lt;&lt; endl;
    } else {
        cout &lt;&lt; &quot;Pointer is invalid.&quot; &lt;&lt; endl;
    }
}

int main()
{
    shared_ptr&lt;int&gt; p1(new int(10));
    shared_ptr&lt;int&gt; p2 = p1;
    weak_ptr&lt;int&gt; wp = p1;
    cout &lt;&lt; &quot;ref count: &quot; &lt;&lt; p1.use_count() &lt;&lt; endl;

    fun(wp);

    p1.reset();
    fun(wp);

    p2.reset();
    fun(wp);

    return 0;
}

/**
output:
ref count: 2
10
10
Pointer is invalid.
**/
</pre>

上面提到的 环形引用 问题可以采取如下方式解决。此时程序退出后，对象会被正确回收。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class B;

class A {
public:
    weak_ptr&lt;B&gt; p_b;
};

class B {
public:
    weak_ptr&lt;A&gt; p_a;
};

int main()
{
    shared_ptr&lt;A&gt; a(new A);
    shared_ptr&lt;B&gt; b(new B);
    a-&gt;p_b = b;
    b-&gt;p_a = a;

    return 0;
}

</pre>
