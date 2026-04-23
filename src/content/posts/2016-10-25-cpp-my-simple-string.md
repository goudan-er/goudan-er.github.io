---
title: "C++面试中string类的一种正确写法"
date: "2016-10-25"
slug: "cpp-my-simple-string"
permalink: "/2016/cpp-my-simple-string/"
description: "在coolshell上陈硕大牛的一篇文章加了一点东西..."
categories: ["share", "C++"]
tags: ["C++"]
---
参考[coolshell](http://coolshell.cn/articles/10478.html)  
并，

    1. 添加了sz，表示长度，不需要strlen
    2. 添加转移构造函数和转移赋值操作符，可以做右值引用和转移语义


```cpp
class String {
public:
    String() : data(nullptr), sz(0)
    {
        cout << "Default constructor is called" << endl;
    }
    String(const char * str)
    {
        sz = strlen(str);
        init_data(str);
        cout << "(const char*) constructor is called, this->data: " << data << endl;
    }
    String(const String & rhs)
    {
        sz = rhs.sz;
        init_data(rhs.data);
        cout << "Copy constructor is called, this->data: " << data << endl;
    }

    String & operator=(String & rhs)
    {
        if (this != &rhs) {
            sz = rhs.sz;
            init_data(rhs.data);
        }
        cout << "Copy operator is called, this->data: " << data << endl;
        return *this;
    }

    String(String && rhs)
    {
        data = rhs.data;
        sz = rhs.sz;
        rhs.data = nullptr;
        rhs.sz = 0;
        cout << "Move constructor is called, this->data: " << data << endl;
    }

    String & operator=(String && rhs)
    {
        if (this != &rhs) {
            if (data) delete[] data;
            data = rhs.data;
            sz = rhs.sz;
            rhs.sz = 0;
            rhs.data = nullptr;
        }
        cout << "Move operator= is called, this->data: " << data << endl;
        return *this;
    }

    ~String()
    {
        if (data) {
            cout << "Destructor is called, this->data: " << data << endl;
            delete[] data;
        }
        data = nullptr;
    }

    const char * c_str() const
    {
        return data;
    }

    void swap(String & rhs)
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
    cout << "foo: " << x.c_str() << endl;
}

void bar(const String & x)
{
    cout << "bar: " << x.c_str() << endl;
}

void bar(const String && x)
{
    cout << "bar_right: " << x.c_str() << endl;
}

String baz()
{
    String ret("baz");
    return ret;
}

void SWAP(String & a, String & b)
{
    String tmp(std::move(a));
    a = std::move(b);
    b = std::move(tmp);
}


int main()
{
    String s0("hello");
    String s1("world");

    String s2(s0);
    String s3;
    s3 = s1;

    foo(s1);
    bar(s1);

    foo("temporary");
    bar("temporary");
    String s5 = baz();

    std::vector<String> svec;
    svec.push_back(s0);
    svec.push_back(s1);
    svec.push_back(s5);
    svec.push_back("good job");

    SWAP(s2, s3);
    cout << "s2: " << s2.c_str() << endl;
    cout << "s3: " << s3.c_str() << endl;

    return 0;
}

/**
output:
(const char*) constructor is called, this->data: hello
(const char*) constructor is called, this->data: world
Copy constructor is called, this->data: hello
Default constructor is called
Copy operator is called, this->data: world
Copy constructor is called, this->data: world
foo: world
Destructor is called, this->data: world
bar: world
(const char*) constructor is called, this->data: temporary
foo: temporary
Destructor is called, this->data: temporary
(const char*) constructor is called, this->data: temporary
bar_right: temporary
Destructor is called, this->data: temporary
(const char*) constructor is called, this->data: baz
Copy constructor is called, this->data: hello
Copy constructor is called, this->data: world
Copy constructor is called, this->data: hello
Destructor is called, this->data: hello
Copy constructor is called, this->data: baz
Copy constructor is called, this->data: hello
Copy constructor is called, this->data: world
Destructor is called, this->data: hello
Destructor is called, this->data: world
(const char*) constructor is called, this->data: good job
Move constructor is called, this->data: good job
Move constructor is called, this->data: hello
Move operator= is called, this->data: world
Move operator= is called, this->data: hello
s2: world
s3: hello
Destructor is called, this->data: hello
Destructor is called, this->data: world
Destructor is called, this->data: baz
Destructor is called, this->data: good job
Destructor is called, this->data: baz
Destructor is called, this->data: hello
Destructor is called, this->data: world
Destructor is called, this->data: world
Destructor is called, this->data: hello
**/
```
