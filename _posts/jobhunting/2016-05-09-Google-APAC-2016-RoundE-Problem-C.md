---
layout: page
title: "2016Google校招笔试-Not So Random"
subheadline: 
teaser: "今天参加宣讲会模拟面试的题目，来源Google APAC 2016 University Graduates Test Round E Problem C。Google开始校招了，而我还是这么弱鸡..."
categories: 
    - share
    - jobhunting
tags: 
    - Algorithm
header: no
image:
    thumb: gallery-example-4-thumb.jpg
    title: gallery-example-4.jpg
    caption: Google 2016 ACPC University Graduates Test Round E最后排名，我想说的是老印真是厉害。
    caption_url: https://code.google.com/codejam/contest/8264486/scoreboard#
---
# 题目描述
有一个随机数字生成函数，对于一个输入X，有A/100的概率生成 ```X AND K```，有B/100的概率生成 ```X OR K``` ，有C/100的概率生成 ```X XOR K``` 。  0 ≤ X, K ≤ 10^9，0 ≤ A, B, C ≤ 100，A+B+C = 100。
现在假设有N个这样的随机数字生成函数，问最后输出数字的期望值。

# 思路
对于数字二进制下的每一位只有两种状态**0**或者**1**，同时每一位相互独立，所以可以分开考虑每一位，就算出经过N步之后每一位为1的概率，则最后的期望可以表示为：$ expect = \sum_{j=0}^{31} {p_j * (1 << j)} $ ，$p_j$表示经过N步随机数字生成函数后第j位为1的概率。  

所以，有DP：  
令dp[i][j][s]表示经过i步随机数字生成函数后第j位状态为s的概率，s = 0 / 1，有状态转移方程：  
```If (k & (1 << j)) > 0 :```  
```dp[i][j][0] += dp[i-1][j][0] * a / 100```  
```dp[i][j][0] += dp[i-1][j][1] * c / 100```  
```dp[i][j][1] += dp[i-1][j][1] * a / 100```  
```dp[i][j][1] += dp[i-1][j][0] * b / 100```  
```dp[i][j][1] += dp[i-1][j][1] * b / 100```  
```dp[i][j][1] += dp[i-1][j][0] * c / 100```  
```Else :```  
```dp[i][j][0] += dp[i-1][j][0] * a / 100```  
```dp[i][j][0] += dp[i-1][j][1] * a / 100```  
```dp[i][j][0] += dp[i-1][j][0] * b / 100```  
```dp[i][j][0] += dp[i-1][j][0] * c / 100```  
```dp[i][j][1] += dp[i-1][j][1] * b / 100```  
```dp[i][j][1] += dp[i-1][j][1] * c / 100```  

初始化，则根据X的每一位0或者1，对dp[0][j][0]和dp[0][j][1]赋值1或者0。

# 代码
<pre class="brush: cpp; highlight: [23, 35] auto-links: true; collapse: true" id = "simplecode">
#include <bits/stdc++.h>
using namespace std;

#define clr(x,c) memset(x, c, sizeof(x))
#define pb push_back
#define mp make_pair
#define pii pair<int, int>
#define psi pair<string, int>
#define inf 0x3f3f3f3f
typedef long long lld;

const int N = 111111;
const int M = 31; // x & k >= 0, bit(31) = 0

double dp[N][M][2];

double solve()
{
   double ret = 0.0;
   int n, x, k, a, b, c;
   cin >> n >> x >> k >> a >> b >> c;

   // init
   clr(dp, 0);
   for (int j = 0; j < M; ++j) {
       if ( x & (1 << j) ) {
           dp[0][j][0] = 0.0;
           dp[0][j][1] = 1.0;
       } else {
           dp[0][j][0] = 1.0;
           dp[0][j][1] = 0.0;
       }
   }

   // dp
   for (int j = 0; j < M; ++j) {
       for (int i = 1; i <= n; ++i) {
           if ( k & (1 << j) ) {
               dp[i][j][0] += dp[i-1][j][0] * a / 100;
               dp[i][j][0] += dp[i-1][j][1] * c / 100;
               dp[i][j][1] += dp[i-1][j][1] * a / 100;
               dp[i][j][1] += (dp[i-1][j][0] + dp[i-1][j][1]) * b / 100;
               dp[i][j][1] += dp[i-1][j][0] * c / 100;
           } else {
               dp[i][j][0] += (dp[i-1][j][0] + dp[i-1][j][1]) * a / 100;
               dp[i][j][0] += dp[i-1][j][0] * b / 100;
               dp[i][j][0] += dp[i-1][j][0] * c / 100;
               dp[i][j][1] += dp[i-1][j][1] * b / 100;
               dp[i][j][1] += dp[i-1][j][1] * c / 100;
           }
       }
       ret += dp[n][j][1] * (1 << j);
   }

   return ret;
}

int main ()
{
   freopen("F:/#test-data/in.txt", "r", stdin);
   freopen("F:/#test-data/out.txt", "w", stdout);
   ios::sync_with_stdio(false); cin.tie(0);
   cout << fixed << showpoint;
   int t; cin >> t;
   for (int cas = 1; cas <= t; ++cas) {
       cout << "Case #" << cas << ": ";
       cout << setprecision(9) << solve() << endl;
   }
   return 0;
}
</pre>