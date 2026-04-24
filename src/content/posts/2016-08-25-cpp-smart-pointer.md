---
title: "C++智能指针"
date: "2016-08-25"
slug: "cpp-smart-pointer"
permalink: "/2016/cpp-smart-pointer/"
description: "智能指针作用，便于内存管理，确保程序不存在内存和资源泄露，并且是异常安全的。"
categories: ["share", "C++"]
tags: ["C++"]
---
Effective C++ Item 13，以对象管理资源，提到了两个关键点：   

- 获得资源后立即放进管理对象  
- 管理对象运用析构函数确保资源被释放  

智能指针就是为了迎合以上两点，作用就是 **便于内存管理，确保程序不存在内存和资源泄露，并且是异常安全的。**  

***

C++存有四种智能指针

- <s>auto_ptr</s>

```auto_ptr``` , __C++11已经弃用__。auto_ptr管理的资源 <u>绝对没有一个以上的 auto_ptr 指向这份资源</u>，也就是说 复制一个 ```auto_ptr``` 时，被复制的 ```auto_ptr``` 会指向为空。


```cpp
auto_ptr<int> p1(new int(10));

auto_ptr<int> p2 = p1;

cout << p1.get() << endl; // output: 0, &#21363; p1 = nullptr
```


- unique_ptr

```unique_ptr``` , ```auto_ptr``` 的替代品，与 ```auto_ptr``` 一样拥有唯一拥有权的特性，不过，与 ```auto_ptr``` 不一样的是，```unique_ptr``` 没有复制构造函数，这样可以防止使用者不小心转移了拥有权。如果想转移拥有权，需要显示调用 ```move``` 函数。所以，函数传参值传递的时候也需要显示调用 ```move``` 函数。但是，函数的返回值已经进行了 ```move``` ，所以不需要显示调用 ```move``` 函数。


```cpp
unique_ptr<int> fun(unique_ptr<int> p)
{
    return p;
}

int main()
{
    shared_ptr<A> arrayObj(new A[5], [](A *p) {
        delete[] p;
    });

    unique_ptr<int> p(new int (10));

    // unique_ptr<int> p1 = p;  //! error: use of deleted function...

    unique_ptr<int> p2 = move(p);

    unique_ptr<int> p3 = fun(move(p2));

    return 0;
}
```


```unique_ptr``` 的 ```release()``` 方法虽然不会销毁 ```unique_ptr``` 指向的资源，但是调用 ```release()``` 方法后，```unique_ptr``` 就会从管理资源的责任重解脱出来，也就是说，此时必须要手动销毁资源。

- share_ptr

```share_ptr``` , 采用引用计数的智能指针，多个 ```share_ptr``` 可以共享资源，如果一个 ```share_ptr``` 放弃资源的"所有权"，其他 ```share_ptr``` 对资源的引用并不会发生变化。只有在引用计数为0的时候，```share_ptr``` 才会释放资源。


```cpp
void fun(shared_ptr<int> p)
{
    cout << "ref count:" << p.use_count() << endl;  // &#20989;&#25968;&#20256;&#21442;&#65292;&#20540;&#20256;&#36882;&#65292;&#25152;&#20197;&#24341;&#29992;&#25968;+1
}

int main ()
{
    shared_ptr<int> p1(new int(10));
    cout << "ref count:" << p1.use_count() << endl;

    shared_ptr<int> p2 = p1;
    cout << "ref count:" << p1.use_count() << endl;

    fun(p1);
    cout << "ref count:" << p1.use_count() << endl;  // &#20989;&#25968;&#36864;&#20986;&#65292;&#21442;&#25968;&#30340; share_ptr &#33258;&#21160;&#38144;&#27585;&#65292;&#24341;&#29992;&#25968;-1

    p2.reset();
    cout << "ref count:" << p1.use_count() << endl;
    p3.reset();
    cout << "ref count:" << p1.use_count() << endl;  // &#27492;&#26102;&#21482;&#26377;p1&#25351;&#21521;&#36164;&#28304;&#65292;&#21482;&#26377;&#19968;&#20221;&#24341;&#29992;

    return 0;
}

output:
ref count:1
ref count:2
ref count:3  // &#20989;&#25968;&#20256;&#21442;&#65292;&#20540;&#20256;&#36882;&#65292;&#25152;&#20197;&#24341;&#29992;&#25968;+1
ref count:2  // &#20989;&#25968;&#36864;&#20986;&#65292;&#21442;&#25968;&#30340;share_ptr&#33258;&#21160;&#38144;&#27585;&#65292;&#24341;&#29992;&#25968;-1
ref count:2
ref count:1  // &#27492;&#26102;&#21482;&#26377;p1&#25351;&#21521;&#36164;&#28304;&#65292;&#21482;&#26377;&#19968;&#20221;&#24341;&#29992;
```


使用 ```share_ptr``` 的时候要注意避免使用 ```get()``` 方法获取和使用裸指针，因为使用裸指针的时候，可能会不经意间手动 ```delete``` 了资源对象，所以，当 ```share_ptr``` 去试图销毁管理的资源时，导致<u>ACCESS VIOLATION</u>


```cpp
shared_ptr<int> a(new int(10));
int * pa = a.get();
delete pa;
//! ACCESS VIOLATION
```


```share_ptr``` 将调用 ```delete``` 释放内存，所以当 ```share_ptr``` 指向数组对象的时候，传递给 ```share_ptr``` 一个自定义的 ```delete``` 方法。可通过 lambda 表达式完成。


```cpp
class A {
public:
    A()
    {
        cout<<"constructor"<<endl;
    }
    ~A()
    {
        cout << "destructor"<<endl;
    }
};

int main()
{
    shared_ptr<A> arrayObj(new A[5], [](A *p) {
        delete[] p;
    });

    return 0;
}
```


```share_ptr``` 已经足够好足够用了，但是还是可能出现问题，比如下面的代码，就会出现 环形引用问题，如下代码，A和B的对象各有一份，且引用数为2，程序结束时，即使会销毁智能指针，但是由于引用数不为0，对象并不能被回收，造成内存泄漏。


```cpp
class B;

class A {
public:
    shared_ptr<B> p_b;
};

class B {
public:
    shared_ptr<A> p_a;
};

int main()
{
    shared_ptr<A> a(new A);
    shared_ptr<B> b(new B);

    a->p_b = b;
    b->p_a = a;

    return 0;
}
```


- weak_ptr

要解决环形引用问题并没有好的解决办法，除了在编码过程中注意，也可以在可能出现环形引用的地方使用 ```weak_ptr``` 。
```weak_ptr``` 比较特殊，它可以指向 ```share_ptr``` 指向的资源，但是却不拥有该资源。可以通过 ```weak_ptr``` 对象的成员函数 ```lock()``` 返回指向该资源的一个 ```share_ptr``` 对象。如果 ```weak_ptr``` 指向的资源已经无效时，会返回一个空值 nullptr 。所以使用 ```lock()``` 时，要注意返回的 ```share_ptr``` 是否有效。由于 ```weak_ptr``` 是指向 ```share_ptr``` 指向的资源，所以 ```weak_ptr``` 不能独立存在。


```cpp
void fun(weak_ptr<int> & wp)
{
    shared_ptr<int> p = wp.lock();
    if (p != nullptr) {
        cout << *p << endl;
    } else {
        cout << "Pointer is invalid." << endl;
    }
}

int main()
{
    shared_ptr<int> p1(new int(10));
    shared_ptr<int> p2 = p1;
    weak_ptr<int> wp = p1;
    cout << "ref count: " << p1.use_count() << endl;

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
```


上面提到的 环形引用 问题可以采取如下方式解决。此时程序退出后，对象会被正确回收。


```cpp
class B;

class A {
public:
    weak_ptr<B> p_b;
};

class B {
public:
    weak_ptr<A> p_a;
};

int main()
{
    shared_ptr<A> a(new A);
    shared_ptr<B> b(new B);
    a->p_b = b;
    b->p_a = a;

    return 0;
}
```
