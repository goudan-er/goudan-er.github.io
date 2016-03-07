---
layout: page
title: "LeetCode Best Time to Buy and Sell Stock I-II-III-IV"
description: ""
categories:
    - share
    - code
tags:
    - LeetCode
    - Algorithm
---

买股票，动态规划。

## LeetCode Best Time to Buy and Sell Stock I  

### 题目描述  
> 链接：[https://leetcode.com/problems/best-time-to-buy-and-sell-stock/](https://leetcode.com/problems/best-time-to-buy-and-sell-stock/)  
> 给出股票每一天的价格，问只允许交易一次可以获得的最大利润。  
> 输入每一天的股价```vector<int> prices```，返回最大利润。

### 算法
因为只允许交易一次，所以可以顺序遍历一遍，对每一段连续不减区间求最大利润。  
或者，```dp```解法，  
```dp[j]```表示前j天可以获得的最大的利润。转移为```dp[j]=max(dp[j-1], prices[j]-minBuy)```

### 代码
dp实现。
<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
int maxProfit(vector&lt;int&gt;&amp; prices)
{
	int minPrice = inf, n = prices.size(), ret = 0;
	for (int i = 0; i &lt; n; i++) {
		ret = max(ret, prices[i]-minPrice);
		minPrice = min(prices[i], minPrice);
	}
	return ret;
}
</pre>

## LeetCode Best Time to Buy and Sell Stock II  

### 题目描述
> 链接：[https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/)  
> 给出股票每一天的价格，允许任意次交易，且在买入之前必须卖掉手中的股票。求可以获得的最大利润。**注意，一天可以先卖掉手中的再买入。**  
> 输入每一天的股价```vector<int> prices```，返回最大利润。  

### 算法
允许任意次交易，所以，只需要对每一个递增区间求最大利润即可。

### 代码
<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
int maxProfit(vector&lt;int&gt;&amp; prices)
{
	int ret = 0, n = prices.size();
	for (int i = 1; i &lt; n; i++) {
		if (prices[i] &gt; prices[i-1]) {
			ret += prices[i] - prices[i-1];
		}
	}
	return ret;
}
</pre>

## LeetCode Best Time to Buy and Sell Stock III
### 题目描述
> 链接：[https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/)  
> 给出股票每一天的价格，只允许最多两次交易，且在买入之前必须卖掉手中的股票。求可以获得的最大利润。**注意，一天可以先卖掉手中的再买入。**  
> 输入每一天的股价```vector<int> prices```，返回最大利润。
> 帮小白在线笔试某团购网站X团的笔试题，所以刷LeetCode还是有帮助的。

### 算法
这题稍微有了一些难度。但是，由问题I的dp思路，```f[j]```表示表示前j天最多交易一次可以获得的最大的利润，如果可以知道第j天到第n天最多交易一次可以获得的最大的利润```b[j]```，那么就可以遍历n天，```max(f[j]+b[j])```即为结果。  
所以，我们可以dp两次，一次从前向后，f[j]表示前j天最多交易一次可以获得的最大的利润，```f[j]=max(f[j-1], prices[j]-minBuy)```。  
另一次从后向前，b[j]表示j到n天最多交易一次可以获得的最大的利润，```b[j]=max(b[j+1], maxSell-prices[j])```。  
```max(f[j]+b[j])```为最后的结果。  

### 代码
<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
int maxProfit(vector&lt;int&gt;&amp; prices)
{
	int n = prices.size(), minBuy, maxSell;
	if (n == 0 || n == 1) return 0;
	vector&lt;int&gt; f, b;
	f.resize(n);
	b.resize(n);
	f[0] = 0;
	b[n-1] = 0;
	minBuy = prices[0];
	maxSell = prices[n-1];
	for (int i = 1; i &lt; n; i++) {
		f[i] = max(f[i-1], prices[i]-minBuy);
		minBuy = min(minBuy, prices[i]);
	}
	for (int i = n-2; i &gt;= 0; i--) {
		b[i] = max(b[i+1], maxSell - prices[i]);
		maxSell = max(maxSell, prices[i]);
	}
	int ret = 0;
	for (int i = 0; i &lt; n; i++) {
		ret = max(ret, f[i]+b[i]);
	}
	return ret;
}
</pre>

## LeetCode Best Time to Buy and Sell Stock IV
### 题目描述  
> 链接：[https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/)  
> 给出股票每一天的价格，只允许最多k次交易，且在买入之前必须卖掉手中的股票。求可以获得的最大利润。**注意，一天可以先卖掉手中的再买入。**  
> 输入```k```次交易数，每一天的股价```vector<int> prices```，返回最大利润。

### 算法  
这题一开始想了一个二维dp，dp[i][j]表示前i天进行j次交易，然后一个二维数组last[i][j]记录dp[i][j]最后一次交易的第k，维护一个单调递增队列，为了可以快速找到第k天到当前最小的价格。然后滚动数组优化下内存，但是还是MLE。大概代码如下，不想看就果断略过。
<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
for (int j = 1; j &lt;= k; j++) {
	front = 0;
	rear = 0;
	queue[rear] = 0;
	rear++;
	for (int i = 1; i &lt; n; i++) {
		int l = last[(i-1)&amp;1][j - 1];
		while (front &lt; rear &amp;&amp; queue[front] &lt; l + 1) { front += 1; }
		int curMin = prices[queue[front]];
		if (dp[(i-1)&amp;1][j] &gt; dp[(i-1)&amp;1][j - 1] + prices[i] - curMin) {
			dp[i&amp;1][j] = dp[(i-1)&amp;1][j];
			last[i&amp;1][j] = last[(i-1)&amp;1][j];
		}
		else {
			dp[i&amp;1][j] = dp[(i-1)&amp;1][j - 1] + prices[i] - curMin;
			last[i&amp;1][j] = i;
		}
		while (front &lt; rear &amp;&amp; prices[queue[rear - 1]] &gt;= prices[i]) {
			rear -= 1;
		}
		queue[rear] = i;
		rear++;
	}
}
</pre>
网上找到了正解。想一下，问题的本质也就是，在一个n个数中，找出2k个序列，奇数买入操作，获得利润-prices[j]，偶数卖出操作，获得利润prices[j]。  
所以二维dp状态，```dp[i][j]```表示前i天进行j次操作产生的最大利润，有转移```dp[i][j]=max(dp[i-1][j], dp[i-1][j-1] + prices[i] * (j&1 : -1 : 1))```。  
初始化，```dp[0][0]=0, dp[0][j]=-inf (j=0···n)```，即第0天0次交易利润为0，而dp[0][j]为不可达状态，置为-inf。  
同时，我们可以注意到dp[i][j]，第一维可以省掉，即```dp[j]=max(dp[j], dp[j-1] + prices[i] * (j&1 : -1 : 1))```。  
此外，还有一个小优化，当k很大，以至于2k >= n，也就是n天可以进行任意次数操作，所以变成了问题II，直接采用问题II的算法。

### 代码
<pre class="brush: cpp; auto-links: true; collapse: true" id="simplecode">
class Solution {
private:
	int maxProfit(vector&lt;int&gt;&amp; prices)
	{
		int ret = 0, n = prices.size();
		for (int i = 1; i &lt; n; i++) {
			if (prices[i] &gt; prices[i-1]) {
				ret += prices[i] - prices[i-1];
			}
		}
		return ret;
	}
public:
	int maxProfit(int k, vector&lt;int&gt;&amp; prices)
	{
	    int n = prices.size();
	    if (2*k &gt;= n) {
            return maxProfit(prices);
	    }
	    vector&lt;int&gt; dp;
	    dp.resize(2*k+1);
	    dp[0] = 0;
	    for (int i = 1; i &lt;= 2*k; i++) dp[i] = -inf;
	    for (int i = 0; i &lt; n; i++) {
            for (int j = 1; j &lt;= min(2*k, i+1); j++) {
                dp[j] = max(dp[j], dp[j-1] + prices[i] * ( j&amp;1 ? -1 : 1));
            }
	    }
	    return dp[2*k];
	}
};
</pre>
