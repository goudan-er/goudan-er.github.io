---
title: "C++多态 - 对象转型"
date: "2016-10-21"
slug: "cpp-polymorphism-object-cast"
permalink: "/2016/cpp-polymorphism-object-cast/"
description: "建议读一读深度探索C++模型第1,3,4章节。应该早早把这个东西弄明白。"
categories: ["share", "C++"]
tags: ["C++"]
---
测试代码和输出。

多态实现机制不必多说，vptr指向vtbl，一般vptl安插在class object的首部。

当在转型时，有两种情况：

    1. 转型指针，Base * pb = static_cast<Base *>(pd);
    其实就是新建一个指针指向了同一块内存地址，转型指针只是影响了指针的解释方式，没有影响内存的内容，vptr还是原来的地址。
    
    2. 转型对象（向上转型），Base b = static_cast<Base>(*pd);
    对象转型其实是一个复制构造，复制对象的数据属性，但是并不赋值隐藏着的vptr，而是安插新的vptr。



```cpp
class Base {
public:
    Base(int _val) : val(_val) {}
    void test() { cout << "test base" << endl; }
    virtual void test_vir() { cout << "test base virtual" << endl; }
    void set(int _val) { val = _val; }
    void print() { cout << "val: " << val << endl; }
private:
    int val;
};

class Derived : public Base {
public:
    Derived(int _val) : Base(_val) {}
    void test() { cout << "test derived" << endl; }
    virtual void test_vir() { cout << "test derived virtual" << endl; }
};

int main ()
{
    Derived * pd = new Derived(10);

    Base * pb = static_cast<Base *>(pd);
    pb->test();
    pb->test_vir();
    pb->print();

    Base b = static_cast<Base>(*pd);
    b.test();
    b.test_vir();
    b.print();

    b.set(20);
    b.print();
    pb->print();

    cout << &b << endl;
    cout << &(*pd) << endl;

    return 0;
}

output:
test base
test derived virtual
val: 10
test base
test base virtual
val: 10
val: 20
val: 10
0x68fee8
0xa41600
```
