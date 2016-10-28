---
layout: page
title: "C++多态 - 对象转型"
teaser: "建议读一读深度探索C++模型第1,3,4章节。应该早早把这个东西弄明白。"
categories:
    - share
    - code
tags:
    - C++
---

测试代码和输出。

多态实现机制不必多说，vptr指向vtbl，一般vptl安插在class object的首部。

当在转型时，有两种情况：

    1. 转型指针，Base * pb = static_cast<Base *>(pd);
    其实就是新建一个指针指向了同一块内存地址，转型指针只是影响了指针的解释方式，没有影响内存的内容，vptr还是原来的地址。
    
    2. 转型对象（向上转型），Base b = static_cast<Base>(*pd);
    对象转型其实是一个复制构造，复制对象的数据属性，但是并不赋值隐藏着的vptr，而是安插新的vptr。


<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
class Base {
public:
    Base(int _val) : val(_val) {}
    void test() { cout &lt;&lt; &quot;test base&quot; &lt;&lt; endl; }
    virtual void test_vir() { cout &lt;&lt; &quot;test base virtual&quot; &lt;&lt; endl; }
    void set(int _val) { val = _val; }
    void print() { cout &lt;&lt; &quot;val: &quot; &lt;&lt; val &lt;&lt; endl; }
private:
    int val;
};

class Derived : public Base {
public:
    Derived(int _val) : Base(_val) {}
    void test() { cout &lt;&lt; &quot;test derived&quot; &lt;&lt; endl; }
    virtual void test_vir() { cout &lt;&lt; &quot;test derived virtual&quot; &lt;&lt; endl; }
};

int main ()
{
    Derived * pd = new Derived(10);

    Base * pb = static_cast&lt;Base *&gt;(pd);
    pb-&gt;test();
    pb-&gt;test_vir();
    pb-&gt;print();

    Base b = static_cast&lt;Base&gt;(*pd);
    b.test();
    b.test_vir();
    b.print();

    b.set(20);
    b.print();
    pb-&gt;print();

    cout &lt;&lt; &amp;b &lt;&lt; endl;
    cout &lt;&lt; &amp;(*pd) &lt;&lt; endl;

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
</pre>