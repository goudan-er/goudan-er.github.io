---
layout: page
title: "C++右值引用"
teaser: "高效转移资源..."
categories:
    - share
    - cpp
tags:
    - C++
---

***

### C++右值  

C++右值指的是临时对象，临时变量只在当前语句中有效。与其对应的变量是左值，非临时对象，可以在多条语句中使用。  
如简单的赋值语句：

    int i = 0;

在这条语句中，i 是左值，0 是临时值，就是右值。在下面的代码中，i 可以被引用，0 就不可以了。立即数都是右值。  
右值也可以出现在赋值表达式的左边，但是不能作为赋值的对象，因为右值只在当前语句有效，赋值没有意义。如：

    ((i>0) ? i : j) = 1;

在这个例子中，0 作为右值出现在了 "=" 的左边。但是赋值对象是 i 或者 j，都是左值。  
在 C++11 之前，右值是不能被引用的，最大限度就是用常量引用绑定一个右值，如 :

    const int &a = 1;

在这种情况下，右值不能被修改的。但是实际上右值是可以被修改的，如：

    Object().set().get();

Object是一个类，set是类中的成员函数，为Object中的一个变量赋值，get取出这个变量的值。在这条语句中，Object()生成一个临时对象，也就是右值，而且通过set()修改了这个右值。  

既然右值可以被修改，那么就可以实现右值引用。右值引用能够方便地解决实际工程中的问题，实现非常有吸引力的解决方案。

***

### C++右值引用

左值引用声明符号是&，右值引用声明符号是&&，如：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
void process_value(int & val)
{
    cout << "LValue Processed: " << val << endl;
}

void process_value(int && val)
{
    cout << "RValue Processed: " << val << endl;
}

int main ()
{
    int val = 10;
    process_value(val);
    process_value(20);
    return 0;
}

output:
LValue Processed: 10
RValue Processed: 20
</pre>

从输出可以看出，20作为一个临时变量作为了右值被处理。  
但是<u>如果临时对象通过一个接受右值的函数传递给另一个函数时，就会变成左值，因为这个临时对象在传递过程中，变成了命名对象</u>。比如：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
void process_value(int & val)
{
    cout << "LValue Processed: " << val << endl;
}

void process_value(int && val)
{
    cout << "RValue Processed: " << val << endl;
}

void preprocess_value(int && val)
{
    process_value(val);
}

int main ()
{
    int val = 10;
    process_value(val);
    process_value(20);
    preprocess_value(50);
    return 0;
}

output:
LValue Processed: 10
RValue Processed: 20
LValue Processed: 50
</pre>

***

### 转移语义

右值引用是用来支持转移语义的。转移语义可以将资源 ( 堆，系统对象等 ) 从一个对象转移到另一个对象，这样能够减少不必要的临时对象的创建、拷贝以及销毁，能够大幅度提高 C++ 应用程序的性能。临时对象的维护 ( 创建和销毁 ) 对性能有严重影响。  
通过转移语义，临时对象中的资源能够转移其它的对象里。  
在现有的 C++ 机制中，我们可以定义拷贝构造函数和赋值函数。要实现转移语义，需要定义转移构造函数和转移赋值操作符。对于右值的拷贝和赋值会调用转移构造函数和转移赋值操作符。如果转移构造函数和转移拷贝操作符没有定义，那么就遵循现有的机制，拷贝构造函数和赋值操作符会被调用。

在 [C++面试中string类的一种正确写法中](/2016/cpp-my-simple-string/)，String类就定义了转移构造函数和转移赋值操作符。

***

### 标准库函数 std::move

C++11标准库提供了一个转移语义（资源所有权）的函数。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
// 定义于头文件 &lt;utility&gt;

template&lt; class T &gt;
typename std::remove_reference&lt;T&gt;::type&amp;&amp; move( T&amp;&amp; t );
</pre>

返回一个参数的右值引用，并留下一个空值参数。或者说是 “移动” 资源。比如：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;string&gt;
#include &lt;utility&gt;
int main ()
{
    std::string str = &quot;Hello&quot;;
    std::vector&lt;string&gt; vs;
    vs.push_back(str);
    std::cout  &lt;&lt; &quot;After copy, str is: &quot; &lt;&lt; str &lt;&lt; std::endl;
    vs.push_back(std::move(str));
    std::cout &lt;&lt; &quot;After copy, str is: &quot; &lt;&lt; str &lt;&lt; std::endl;
    std::cout &lt;&lt; &quot;The contents of the vector are \&quot;&quot; &lt;&lt; vs[0] &lt;&lt; &quot;\&quot;, \&quot;&quot; &lt;&lt; vs[1] &lt;&lt; &quot;\&quot;&quot; &lt;&lt; std::endl;
    return 0;
}

// output:
After copy, str is: Hello
After copy, str is:
The contents of the vector are &quot;Hello&quot;, &quot;Hello&quot;
</pre>

```std::move``` 在提高 ```swap``` 函数性能上非常有帮助，一般来数，```swap``` 函数如下：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
template&lt;class T&gt; swap(T &amp; a, T &amp; b)
{
    T tmp(a);
    a = b;
    b = tmp;
}
</pre>

使用 ```std::move``` 优化：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simpleblock">
template&lt;class T&gt; swap(T &amp; a, T &amp; b)
{
    T tmp(std::move(a));
    a = std::move(b);
    b = std::move(tmp);
}
</pre>

通过 ```std::move``` ，转移资源所有权，一个简单的 ```swap``` 函数就避免了 3 次不必要的拷贝操作。

***

### Perfect Forwarding（完美转发/精准转发/精确传递）

完美转发的意思是保留参数的所有属性（左值/右值，const/non-const）。在泛型编程中，经常会遇到的一个问题是怎样将一组参数原封不动的转发给另外一个函数。

**<u>留坑！！！以后想起来再学习补上！！！</u>**
