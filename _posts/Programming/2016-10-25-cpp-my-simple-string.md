---
layout: page
title: "C++面试中string类的一种正确写法"
teaser: "在coolshell上陈硕大牛的一篇文章加了一点东西..."
categories:
    - share
    - cpp
tags:
    - C++
---

参考[coolshell](http://coolshell.cn/articles/10478.html)  
并，

    1. 添加了sz，表示长度，不需要strlen
    2. 添加转移构造函数和转移赋值操作符，可以做右值引用和转移语义

<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
class String {
public:
    String() : data(nullptr), sz(0)
    {
        cout &lt;&lt; &quot;Default constructor is called&quot; &lt;&lt; endl;
    }
    String(const char * str)
    {
        sz = strlen(str);
        init_data(str);
        cout &lt;&lt; &quot;(const char*) constructor is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
    }
    String(const String &amp; rhs)
    {
        sz = rhs.sz;
        init_data(rhs.data);
        cout &lt;&lt; &quot;Copy constructor is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
    }

    String &amp; operator=(String &amp; rhs)
    {
        if (this != &amp;rhs) {
            sz = rhs.sz;
            init_data(rhs.data);
        }
        cout &lt;&lt; &quot;Copy operator is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
        return *this;
    }

    String(String &amp;&amp; rhs)
    {
        data = rhs.data;
        sz = rhs.sz;
        rhs.data = nullptr;
        rhs.sz = 0;
        cout &lt;&lt; &quot;Move constructor is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
    }

    String &amp; operator=(String &amp;&amp; rhs)
    {
        if (this != &amp;rhs) {
            if (data) delete[] data;
            data = rhs.data;
            sz = rhs.sz;
            rhs.sz = 0;
            rhs.data = nullptr;
        }
        cout &lt;&lt; &quot;Move operator= is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
        return *this;
    }

    ~String()
    {
        if (data) {
            cout &lt;&lt; &quot;Destructor is called, this-&gt;data: &quot; &lt;&lt; data &lt;&lt; endl;
            delete[] data;
        }
        data = nullptr;
    }

    const char * c_str() const
    {
        return data;
    }

    void swap(String &amp; rhs)
    {
        std::swap(data, rhs.data);
        std::swap(sz, rhs.sz);
    }

    size_t size() const
    {
        return sz;
    }

private:
    char *data;
    size_t sz;

    void init_data(const char * str)
    {
        data = new char[sz + 1];
        memcpy(data, str, sz);
        data[sz] = '\0';
    }
};

void foo(String x)
{
    cout &lt;&lt; &quot;foo: &quot; &lt;&lt; x.c_str() &lt;&lt; endl;
}

void bar(const String &amp; x)
{
    cout &lt;&lt; &quot;bar: &quot; &lt;&lt; x.c_str() &lt;&lt; endl;
}

void bar(const String &amp;&amp; x)
{
    cout &lt;&lt; &quot;bar_right: &quot; &lt;&lt; x.c_str() &lt;&lt; endl;
}

String baz()
{
    String ret(&quot;baz&quot;);
    return ret;
}

void SWAP(String &amp; a, String &amp; b)
{
    String tmp(std::move(a));
    a = std::move(b);
    b = std::move(tmp);
}


int main()
{
    String s0(&quot;hello&quot;);
    String s1(&quot;world&quot;);

    String s2(s0);
    String s3;
    s3 = s1;

    foo(s1);
    bar(s1);

    foo(&quot;temporary&quot;);
    bar(&quot;temporary&quot;);
    String s5 = baz();

    std::vector&lt;String&gt; svec;
    svec.push_back(s0);
    svec.push_back(s1);
    svec.push_back(s5);
    svec.push_back(&quot;good job&quot;);

    SWAP(s2, s3);
    cout &lt;&lt; &quot;s2: &quot; &lt;&lt; s2.c_str() &lt;&lt; endl;
    cout &lt;&lt; &quot;s3: &quot; &lt;&lt; s3.c_str() &lt;&lt; endl;

    return 0;
}

/**
output:
(const char*) constructor is called, this-&gt;data: hello
(const char*) constructor is called, this-&gt;data: world
Copy constructor is called, this-&gt;data: hello
Default constructor is called
Copy operator is called, this-&gt;data: world
Copy constructor is called, this-&gt;data: world
foo: world
Destructor is called, this-&gt;data: world
bar: world
(const char*) constructor is called, this-&gt;data: temporary
foo: temporary
Destructor is called, this-&gt;data: temporary
(const char*) constructor is called, this-&gt;data: temporary
bar_right: temporary
Destructor is called, this-&gt;data: temporary
(const char*) constructor is called, this-&gt;data: baz
Copy constructor is called, this-&gt;data: hello
Copy constructor is called, this-&gt;data: world
Copy constructor is called, this-&gt;data: hello
Destructor is called, this-&gt;data: hello
Copy constructor is called, this-&gt;data: baz
Copy constructor is called, this-&gt;data: hello
Copy constructor is called, this-&gt;data: world
Destructor is called, this-&gt;data: hello
Destructor is called, this-&gt;data: world
(const char*) constructor is called, this-&gt;data: good job
Move constructor is called, this-&gt;data: good job
Move constructor is called, this-&gt;data: hello
Move operator= is called, this-&gt;data: world
Move operator= is called, this-&gt;data: hello
s2: world
s3: hello
Destructor is called, this-&gt;data: hello
Destructor is called, this-&gt;data: world
Destructor is called, this-&gt;data: baz
Destructor is called, this-&gt;data: good job
Destructor is called, this-&gt;data: baz
Destructor is called, this-&gt;data: hello
Destructor is called, this-&gt;data: world
Destructor is called, this-&gt;data: world
Destructor is called, this-&gt;data: hello
**/
</pre>