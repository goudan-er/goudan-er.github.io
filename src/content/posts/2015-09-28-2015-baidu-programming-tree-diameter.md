---
title: "2015百度笔试编程-树的直径"
date: "2015-09-28"
slug: "2015-baidu-programming-tree-diameter"
permalink: "/2015/2015-baidu-programming-tree-diameter/"
description: "百度题难度适中，自己努力加把劲儿，去微软..."
categories: ["share", "算法"]
tags: ["Algorithm"]
---
## 题目描述
> n个城市，任意城市城市之间可达且只有唯一的路径。现在有一个G商队在这n个城市之间运输货物，运输货物与运输距离有关，在走第x千米到第x+1千米的时候，花费10+x。现在G商队想知道从某一个城市出发到达另一个城市最多花费是多少。  
> 输入：第一行整数n，表示城市数；接下来n-1行，表示n-1条路，每行Pi，Qi，Di，表示Pi到Qi有一条长为Di的路。城市编号从1开始。  
> 输出：一行，整数，表示最大花费。

## 算法描述
很显然，n个城市构成一个树，要求的是树上最长的路径，也就是树的直径。求树的直径可以通过两次dfs求得，具体：  
- 从任意一点u开始dfs，找出距离u最远的点v1。**v1一定是直径上的一个端点；**  
- 从v1出发dfs，找出距离v1最远的点v2，则v1-v2就是树的直径。

## 代码
用一个二维vector构建图的邻接表很方便。  


```cpp
#include <stdio.h>
#include <vector>
#include <iostream>
using namespace std;

struct G {
    int v, w;
    G() : v(0), w(0) {}
    G(int _v, int _w) : v(_v), w(_w) {}
};

vector< vector<G> > g;

void dfs(int p, int u, int cost, int &maxc, int &endpoint)
{
    for (int i = 0; i < g[u].size(); i++) {
        int v = g[u][i].v;
        int w = g[u][i].w;
        if (v == p) continue;
        cost += w;
        if (cost > maxc) {
            maxc = cost;
            endpoint = v;
        }
        dfs(u, v, cost, maxc, endpoint);
        cost -= w;
    }

    return ;
}

int main ()
{
    int n, u, v, w;
    cin >> n;
    g.resize(n+1);
    for (int i = 0; i < n-1; i++) {
        cin >> u >> v >> w;
        g[u].push_back(G(v, w));
        g[v].push_back(G(u, w));
    }
    int maxc = 0, endpoint1 = 0, endpoint2 = 0;
    dfs(-1, 1, 0, maxc, endpoint1);
    maxc = 0;
    dfs(-1, endpoint1, 0, maxc, endpoint2);
    cout << maxc*10 + maxc*(maxc+1)/2 << endl;
    return 0;
}
```
