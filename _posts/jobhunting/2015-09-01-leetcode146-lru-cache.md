---
layout: page
title: "LeetCode146 - LRU Cache"
teaser: "链表、栈、队列这些基本数据结构要灵活使用..."
categories:
    - share
    - jobhunting
tags:
    - LeetCode
    - Algorithm
---

## 题目描述
> 链接： [https://leetcode.com/problems/lru-cache/](https://leetcode.com/problems/lru-cache/)    
> 实现LRU(Least Recently Used)Cache算法  
> 支持 ```get``` 和 ```set``` 两种操作  
> ```get(key)``` - 返回key对应的value，value总大于0，若不存在返回-1   
> ```set(key, value)``` - 将对应的key设置成value，不存在则插入<key, value>。当Cache满时，删除最近最少使用的<key, value>  

## LRU算法
LRU, Least Recently Used, 最近最少使用算法，是一种置换算法，操作系统课程中都会讲过页面置换算法。比如FIFO, LFU, LRU都是常见的置换算法。不了解的同学看[这里](http://www.cnblogs.com/dolphin0520/p/3749259.html)。  

## 题目分析
清楚了LRU Cache算法，也就有了一个大概的思路，我们将所有的缓存用链表组织起来，将最近使用的放到表头。由于每一次访问缓存则要把访问的<key, value>放到表头，为了维护链表则需要使用**双向链表**。  
同时，在```set```以及```get```操作的时候需要查找，所以还需要使用一些可以高效查找以及删除的数据结构。  
自认为代码实现的还算高效。  
- 首先使用一块线性内存空间```cache[capacity]```模拟双向链表， 类型为```Data```  
- ```move2Head(int index)```函数是把index对应的buffer移到表头  
- 为了高效查找以及删除：定义一个```unordered_map<int key, int index> indexTable```，快速查找key对应的index，得到value，即key->index->value。删除查找的时间复杂度都是O(1)。```unordered_map```是C++ 11新加入的数据结构，类似于stl中的hash map，不了解的同学看[这里](http://classfoo.com/ccby/article/S3XoG)  
- 为了方便，代码中的队列```que```是记录可用的buffer index。```que```空，则表示cache满。  
- 小trick。 为了代码简洁，我把双向链表的表头pre指向自己，表尾的next也指向自己，这样在```move2Head```的时候，不需要特判。   
- 时间复杂度。 ```set``` 和 ```get``` 的操作都近似为O(1)。  

## 代码

<pre class="brush: cpp; highlight: [15,19,21,22]; auto-links: true; collapse: true" id="simplecode">

#include &lt;stdio.h&gt;
#include &lt;string.h&gt;
#include &lt;iostream&gt;
#include &lt;algorithm&gt;
#include &lt;unordered_map&gt;
#include &lt;queue&gt;
using namespace std;

class Data {
public:
	int key, value;
	int pre, next;
};

typedef unordered_map&lt;int, int&gt; umapii;

class LRUCache {
private:
	Data *cache;
	int size, head, rear;
	umapii indexTable;
	queue&lt;int&gt; que;

	void move2Head(int index)
	{
		if (index == head) return;
		else if (index == rear) {
			rear = cache[index].pre;
			cache[rear].next = rear;
			cache[index].next = head;
			cache[head].pre = index;
			head = index;
			cache[index].pre = head;
		}
		else {
			int pre = cache[index].pre;
			int next = cache[index].next;
			cache[pre].next = next;
			cache[next].pre = pre;
			cache[index].next = head;
			cache[head].pre = index;
			head = index;
			cache[index].pre = head;
		}
	}

public:
	LRUCache(int capacity) : size(capacity), head(0), rear(0)
	{
		cache = new Data[size];
		for (int i = 0; i &lt; size; i++) {
			que.push(i);
		}
	}
	~LRUCache()
	{
		delete[] cache;
		cache = NULL;
		while (!que.empty()) que.pop();
	}

	int get(int key)
	{
		umapii::iterator it = indexTable.find(key);
		if (it == indexTable.end()) return -1;
		else {
			move2Head(it-&gt;second);
			return cache[it-&gt;second].value;
		}
	}

	void set(int key, int value)
	{
		int index;
		umapii::iterator it = indexTable.find(key);
		if (it == indexTable.end()) {
			// check cap. if full, delete last data
			if (que.empty()) {
				que.push(rear);
				int tmpkey = cache[rear].key;
				rear = cache[rear].pre;
				umapii::iterator tmpit = indexTable.find(tmpkey);
				indexTable.erase(tmpit);
			}
			// &#20174;&#38431;&#21015;&#20013;&#21462;&#20986;&#19968;&#22359;buffer cache[index]
			index = que.front();
			que.pop();
			// &#23558;cache[index]&#21152;&#20837;&#38142;&#34920;&#23614;&#37096; &amp; next&#25351;&#21521;&#33258;&#24049;
			cache[index].key = key;
			cache[index].value = value;
			cache[index].pre = rear;
			cache[index].next = index;
			cache[rear].next = index;
			rear = index;
			// &#23558;&#23614;&#37096;data&#31227;&#21160;&#21040;&#22836;&#37096;
			move2Head(index);

			indexTable[key] = index;
		}
		else {
			int index = it-&gt;second;
			cache[index].value = value;
			move2Head(index);
		}
	}
};
</pre>