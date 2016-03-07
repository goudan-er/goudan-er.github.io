---
layout: page
title: "初入hihoCoder-hihoCoder87周-微软笔试题《S-expression》"
subheadline: 
teaser: "打hihoCoder，从大模拟开始..."
categories: 
    - share
    - code
tags: 
    - Algorithm
image: 
---

> 一道比较复杂的模拟题目  
> 题目链接：[hiho一下 第八十七周](http://hihocoder.com/contest/hiho87/problem/1)  
> 题目分析：[hiho一下第87周《S-expression》题目分析](http://hihocoder.com/discuss/question/2828)  

题目分析中解题思路已经写的很清楚了。这里对代码说明几点:  
- 预处理可以方便后面的处理，而且处理了连续空格的情况  
- 为了正确处理let操作，利用栈先进后出的特性，在题目分析有给出解释  
- 变量的value值有两种情况，数字或者bool值，所以每次获得```string```类型的value值时要判断一下 
- 由于C++只能返回一个类型而且一个值，所以，```getValue```返回一个flag，表示返回的类型是数字或者bool值或者Error  

##Code##

<pre class="brush: cpp; highlight: [] auto-links: true; collapse: true" id = "simplecode">
#include &lt;iostream&gt;
#include &lt;string&gt;
#include &lt;vector&gt;
#include &lt;stack&gt;
#include &lt;algorithm&gt;
using namespace std;

vector&lt;string&gt; elements;

string st_name[222];
string st_value[222];
int top = 0;

void pp(string str)
{
    elements.clear();
    top = 0;
    string ele;
    for (char c : str) {
        if (c == ' ') {
            if (!ele.empty()) elements.push_back(ele);
            ele.clear();
        } else {
            ele.push_back(c);
        }
    }
}

bool isNumber(string str, int &amp; num)
{
    num = 0;
    for (char c : str) {
        if (c &lt; '0' || c &gt; '9') return false;
        num = num * 10 + c - '0';
    }
    return true;
}

bool isVariable(string str)
{
    if (str.length() &gt; 10) return false;
    if (str == &quot;if&quot; || str == &quot;let&quot; || str == &quot;true&quot; || str == &quot;false&quot;) {
        return false;
    }
    for (char c : str) {
        if (c &lt; 'a' || c &gt; 'z') return false;
    }
    return true;
}

bool findVariableList(string x, string &amp; value)
{
    for (int i = top-1; i &gt;= 0; --i) {
        if (st_name[i] == x) {
            value = st_value[i];
            return true;
        }
    }
    return false;
}

int findRight(int left)
{
    int cnt = 0;
    while (left &lt; elements.size()) {
        if (elements[left] == &quot;(&quot;) cnt += 1;
        else if (elements[left] == &quot;)&quot;) {
            cnt -= 1;
        }
        if (cnt == 0) {
            return left;
        }
        left += 1;
    }
    return -1;
}

int str2int(string str)
{
    int num = 0;
    for (char c : str) {
        num = num * 10 + c - '0';
    }
    return num;
}

string int2str(int num)
{
    string str;
    do {
        str.push_back(num%10 + '0');
        num /= 10;
    } while (num &gt; 0);
    return str;
}

int getValue(int left, int right, int &amp; ret_int, bool &amp; ret_bool, string &amp; ret_error)
{
    // 1: int
    // 0: bool
    // -1: error

    if (elements[left] == &quot;true&quot; || elements[left] == &quot;false&quot;) {
        ret_bool = elements[left] == &quot;true&quot; ? true : false;
        return 0;
    }

    int num;
    if (isNumber(elements[left], num)) {
        ret_int = num;
        return 1;
    }

    if (isVariable(elements[left])) {
        // find
        string value;
        if (findVariableList(elements[left], value)) {
            if (value == &quot;true&quot; || value == &quot;false&quot;) {
                ret_bool = value == &quot;true&quot; ? true : false;
                return 0;
            } else {
                ret_int = str2int(value);
                return 1;
            }
        }
        else {
            ret_error = &quot;Unbound Identifier&quot;;
            return -1;
        }
    }

    if (elements[left] == &quot;(&quot;) {
        // if &#36816;&#31639; (if a b c)
        if (elements[left+1] == &quot;if&quot;) {
            int aleft = left + 2, aright;
            if (elements[aleft] == &quot;(&quot;) {
                aright = findRight(aleft);
            } else {
                aright = aleft;
            }
            int aflag, aint;
            bool abool;
            aflag = getValue(aleft, aright, aint, abool, ret_error);
            if (aflag == -1) {
                return -1;
            }
            if (aflag == 1) {
                ret_error = &quot;Type Mismatch&quot;;
                return -1;
            }

            int bleft = aright + 1, bright;
            if (elements[bleft] == &quot;(&quot;) {
                bright = findRight(bleft);
            } else {
                bright = bleft;
            }
            int cleft = bright + 1, cright;
            if (elements[cleft] == &quot;(&quot;) {
                cright = findRight(cleft);
            } else {
                cright = cleft;
            }

            if (abool) {
                // evaluate b
                return getValue(bleft, bright, ret_int, ret_bool, ret_error);
            } else {
                // evaluate c
                return getValue(cleft, cright, ret_int, ret_bool, ret_error);
            }
        }

        // let &#36816;&#31639; (let (v e) f)
        if (elements[left+1] == &quot;let&quot;) {
            int dleft = left + 2;
            int dright = findRight(dleft);

            string name = elements[dleft+1];
            string value;
            int eflag, eint;
            bool ebool;

            // part e:
            eflag = getValue(dleft+2, dright-1, eint, ebool, ret_error);
            if (eflag == -1) {
                return -1;
            } else if (eflag == 0) {
                if (ebool) value = &quot;true&quot;;
                else value = &quot;false&quot;;
            } else if (eflag == 1) {
                value = int2str(eint);
            }
            st_name[top] = name;
            st_value[top] = value;
            top += 1;

            // part f, f &#23601;&#26159;&#32467;&#26524;
            int fflag = getValue(dright+1, right-1, ret_int, ret_bool, ret_error);
            top -= 1;

            return fflag;
        }

        // (f x y)
        int xleft = left + 2, xright;
        if (elements[xleft] == &quot;(&quot;) {
            xright = findRight(xleft);
        } else {
            xright = xleft;
        }
        int xflag, xint;
        bool xbool;
        xflag = getValue(xleft, xright, xint, xbool, ret_error);
        if (xflag == -1) {
            return -1;
        }
        if (xflag == 0) {
            ret_error = &quot;Type Mismatch&quot;;
            return -1;
        }

        int yleft = xright + 1, yright;
        if (elements[yleft] == &quot;(&quot;) {
            yright = findRight(yleft);
        } else {
            yright = yleft;
        }
        int yflag, yint;
        bool ybool;
        yflag = getValue(yleft, yright, yint, ybool, ret_error);
        if (yflag == -1) {
            return -1;
        }
        if (yflag == 0) {
            ret_error = &quot;Type Mismatch&quot;;
            return -1;
        }

        if (elements[left+1] == &quot;+&quot;) {
            ret_int = xint + yint;
            return 1;
        } else if (elements[left+1] == &quot;-&quot;) {
            ret_int = xint - yint;
            return 1;
        } else if (elements[left+1] == &quot;*&quot;) {
            ret_int = xint * yint;
            return 1;
        } else if (elements[left+1] == &quot;/&quot;) {
            if (yint == 0) {
                ret_error = &quot;Division By Zero&quot;;
                return -1;
            }
            ret_int = xint / yint;
            return 1;
        } else if (elements[left+1] == &quot;&lt;&quot;) {
            ret_bool = xint &lt; yint;
            return 0;
        } else if (elements[left+1] == &quot;=&quot;) {
            ret_bool = xint == yint;
            return 0;
        } else if (elements[left+1] == &quot;&gt;&quot;) {
            ret_bool = xint &gt; yint;
            return 0;
        }

    }

    ret_error = &quot;Unkown Error&quot;;
    return -1;
}


int main ()
{
    string str;
    int ret_int = 0;
    bool ret_bool = true;
    string ret_error;
    int cases;
    cin &gt;&gt; cases;
    getchar();

    while (cases--) {
        getline(cin, str);

        pp(str);

        int flag = getValue(0, elements.size()-1, ret_int, ret_bool, ret_error);

        if (flag == -1) {
            cout &lt;&lt; ret_error.c_str() &lt;&lt; endl;
        } else if (flag == 0) {
            if (ret_bool) cout &lt;&lt; &quot;true&quot; &lt;&lt; endl;
            else cout &lt;&lt; &quot;false&quot; &lt;&lt; endl;
        } else {
            cout &lt;&lt; ret_int &lt;&lt; endl;
        }
    }

    return 0;
}
</pre
