---
layout: page
title: "PRINCETON Course Algorithms Interview Questions: Union Find"
teaser: "普林斯顿算法课并查集，作业之外的面试题目觉得不错。"
categories:
    - share
    - algorithm
tags:
    - Algorithm
    - Interview Questions
    - Coursera
---

> 可以看下[Coursera PRINCETON Algorithm Part1](https://www.coursera.org/course/algs4partI)课程，  
> 或者，[Algorithms](http://www.amazon.com/Algorithms-4th-Edition-Robert-Sedgewick/dp/032157351X)一书。  
> 网盘分享：[[Course Vedio & Slides](http://pan.baidu.com/s/1c0odddA)]  [[pdf](http://pan.baidu.com/s/1jGnkMMU)]

Coursera上不仅有课后作业，还有面试题目，下面分析一下所给题目。   

首先给出一份带有路径压缩的并查集代码。  

<pre class="brush: cpp; highlight: [16] auto-links: true; collapse: true" id = "simplecode">
const int N = 111111;

int id[N];

void Init()
{
    for (int i = 0; i &lt; N; ++i) {
        id[i] = i;
    }
}

int Find(int p)
{
    if (id[p] == p) return id[p];
    else {
        return id[p] = Find(id[p]); // compress the path
    }
}

bool Connected(int p, int q)
{
    return Find(p) == Find(q);
}

void Union(int p, int q)
{
    int i = Find(p);
    int j = Find(q);
    id[i] = j;
}
</pre>

## Reference
> Coursera Algorithms Part1 Union-Find Interview Question  
> [https://class.coursera.org/algs4partI-009/quiz/attempt?quiz_id=89](https://class.coursera.org/algs4partI-009/quiz/attempt?quiz_id=89)  

## Question 1
> **Social network connectivity.** Given a social network containing **N** members and a log file containing **M** timestamps at which times pairs of members formed friendships, design an algorithm to determine **the earliest time** at which all members are connected (i.e., every member is a friend of a friend of a friend ... of a friend). Assume that the log file is sorted by timestamp and that friendship is an equivalence relation. The running time of your algorithm should be **MlogN** or better and use extra space proportional to **N**.

### Solution
初始森林个数为N，log file 的每一行输入```t u v```，做```union(u, v)```。而在```union(u, v)```之前，检查```connected(u, v)```, ```if false, then N -= 1```。当N减为1时，则当前t即为**the earliest time**。  
使用路径压缩的并查集，时间复杂度可以达到**O(MlogN)**，而内存也满足**O(N)**。

## Question 2
> **Union-find with specific canonical element.** Add a method find() to the union-find data type so that find(i) returns the largest element in the connected component containing i. The operations, union(), connected(), and find() should all take logarithmic time or better.  
> **For example**, if one of the connected components is **{1,2,6,9}**, then the find() method should return **9** for each of the four elements in the connected components because **9** is larger **1**, **2**, and **6**.

### Solution
保证每一个树(集合)的根节点值最大，所以在```union```的时候将根节点值大的作为新树的根节点。```find```只需要找到根节点的值。```connected```函数还是和原来的一样。  
使用路径压缩，复杂度为log级别。

## Question 3
> **Successor with delete.** Given a set of **N** integers **S={0,1,...,N−1}** and a sequence of requests of the following form:  
- Remove **x** from **S**  
- Find the successor of **x**: the smallest **y** in **S** such that **y≥x**.  
design a data type so that all operations (except construction) should take logarithmic time or better.

### Solution
可以使用```set```之类的平衡二叉树数据结构，很容易实现上述操作。  
如果是使用```Union-Find```算法的话...好吧，最近撸论文demo实现，脑子坏了，想了一会没想出，网上找了一下。看下面的图就很直观了。  

![Q3-Illustration](/media/images/20151020_1.png)

find只需返回根节点的值。


## Question 4
> **Union-by-size.** Develop a union-find implementation that uses the same basic strategy as weighted quick-union but keeps track of tree height and always links the shorter tree to the taller one. Prove a lg**N** upper bound on the height of the trees for **N** sites with your algorithm.


### Solution
在每一个节点增加一个数据域，```height```，记录其高度。每次做```union```操作时，更新根节点的height值。  
时间复杂度证明：对于N个节点，按照每次将高度较大的作为根节点，最坏情况下，每次合并的两棵树高度相同，然后新树的高度+1。所以，有树最高lg**N**，即时间复杂最坏为lg**N**。