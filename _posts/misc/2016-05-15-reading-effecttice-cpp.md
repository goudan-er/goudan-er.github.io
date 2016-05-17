---
layout: page
title: "Effective C++ 读书笔记"
teaser: ""
categories: 
    - share
    - 杂文
tags:
    - C++
    - Reading
---

持续更新，直到读完本书...

- item 01：视C++为一个语言联邦  
- item 02：尽量以const、enum、inline替换#define  
    - define定义的宏常量可能没有进入符号表，当出现编译错误，浪费追踪时间。  
    - 常量指针：`const char* const authorName = "goudan-er"`，第一个const表示指针指向的内容不变，第二个const表示指针指向的地址不变
    - class 专属常量：为了将常量限制于class内，则要将变量声明为static，表示只有一份，同时定义时不需要再设初值。  
    - 使用inline代替宏函数。如下面的例子，a的递增次数与比较对象有关！所以，使用inline函数，可以避免这样的问题。

    <pre class="brush: cpp; highlight: [1]; auto-links: true;" id = "simplecode">
        #define CALL_WITH_MAX(a, b) f((a) > (b) ? (a) : (b))
        ...
        int a = 5, b = 0, c = 10;
        CALL_WITH_MAX(++a, b);
        CALL_WITH_MAX(++a, c);
    </pre>

- item 03：尽量使用const

- item 04: 确定对象使用前已经先被初始化

- item 05: 了解C++默认编写的函数

- item 06：若不想使用编译器自动生成的函数，就应该明确拒绝

- item 07：多态下基类的析构函数应声明为virtual

- item 08：别让异常逃离析构函数

- item 09：绝不在构造和析构函数中调用virtual

- item 10：令 `operator=` 返回一个 reference to *this
    - 为了实现连续赋值 `x = y = z` ，先z赋值给y，然后更新后的y返回赋值给x

    <pre class="brush: cpp; highlight: [1,10]; auto-links: true;" id = "simplecode">
        Widget& operator= (const Widget& rhs) // 返回类型是reference
        {
            ... // 赋值操作

            return *this;
        }

        or

        void operator= (const Widget& rhs) // 不返回任何东西也可以，但是不能实现连续赋值
        {
            ... // 赋值操作
        }
    </pre>

- item 11：在 `operator=` 中处理自我赋值

- item 12：赋值对象时，copy all parts of an object

- item 13：以对象管理资源
    - std::auto_ptr
    - tr::share_ptr

- item 14：在资源管理类中小心copying行为

- item 15：在资源管理类中提供对原始资源的访问
