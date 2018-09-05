---
layout: page
title: 一致性哈希算法
teaser: "一致性哈希"
categories:
    - share
    - system
tags:
    - system
---

## 从两个例子说起  

### 例1 - 服务器负载均衡  
假设某Y网站有N台服务器，为了方便用户访问，需要在服务器缓存一些数据，所以用户在访问Y网站时最好可以每一次访问同一个服务器，并且尽可能将用户分散到每一台服务器，满足负载均衡。简单地，可以对用户的IP地址做哈希，然后用hash值模上N，即`key=hash(IP)%N`。模N很方便高效地满足了需求，但是如果有一台服务器down掉，服务器数变成N-1，此时`idx=hash(IP)%(N-1)`，这样大多数用户的请求都会变到其他服务器上，造成大量访问错误。    

### 例2 - 对象缓存服务器    
再假设Y网站需要部署M台对象缓存服务器来缓存大量图片、视频，加速用户访问时读取这些对象。仍希望可以将对象尽可能分散到每一个缓存服务器上，提升缓存服务器的利用率。同样的，采用对每一个对象进行哈希，然后用hash值模上M，即`key=hash(object)%M`。此时，若想加一台缓存服务器，则每一个对象的key变成了`key=hash(object)%(M+1)`，这意味着大量对象的映射都将失效，所以需要这些对象做迁移，保证缓存服务器集群可用。如下代码计算所示。  

<pre class="brush: golang; auto-links: true; collapse: true" id="simplecode">
package main

import (
  "fmt"
)

func consistentHashing() int {
  const M int = 100
  const Num int = M
  const NewNum int = M + 1
  const ObjectNum = 1000000

  objechHashValue := make([]int, ObjectNum)
  for i := 0; i < ObjectNum; i++ {
    objechHashValue[i] = i
  }

  moved := 0
  for _, value := range objechHashValue {
    key := value % Num
    newKey := value % NewNum
    if key != newKey {
      moved++
    }
  }

  fmt.Printf("%d objects moved, %.2f%%\n", moved, float64(moved)/float64(ObjectNum)*100)

  return 0
}

func main() {
  consistentHashing()
}

// $ go run consistent_hashing.go
// 990000 object moved, 99.00% percent
</pre>

上述两个问题的原因就是当增加或减少服务器节点node数目是，原来value与node的映射关系失效。解决这个问题一个比较好的方法就是，一致性哈希。  

## 一致性哈希（consistent hashing）

一致性哈希算法是由D. Darger、E. Lehman和T. Leighton 等人于1997年在论文[Consistent Hashing and Random Trees:Distributed Caching Protocols for Relieving Hot Spots On the World Wide Web](https://dl.acm.org/citation.cfm?id=258660)首次提出，目的主要是为了解决分布式网络中的热点问题。在其论文中，提出了一致性哈希算法并给出了衡量一个哈希算法的4个指标：

> 1.平衡性(Balance) ...  
> 2.单调性(Monotonicity) ...  
> 3.分散性(Spread) ...  
> 4.负载(Load) ...  

一致性哈希算法的目的就是，当集群节点数增加或者减少时，尽可能不改变原有value与node的映射关系，原来IP_1映射到web_server_1，一台服务器down掉后，IP_1还是映射到web_server_1；原来object_a映射到cache_server_a，增加一台缓存服务器后，object_a还是映射到cached_server_a。  

一致性哈希算法如下：  
1. 计算每一个服务器节点的哈希值（IP或者服务器别名），映射到一个圆环区间（本文取0~2^32-1）；  
2. 求出当前value的哈希值，也映射到该圆环上；  
3. 从value的圆环位置顺时针查找，将其映射到第一个服务器节点上。  

### 虚拟节点  
以缓存服务器为例，假设新增一个节点，让节点数比较少的时候，仍然需要迁移较多数据。为了解决这种情况，一致性哈希引入了“虚拟节点”：... 

## Reference  
[http://www.cnblogs.com/yuxc/archive/2012/06/22/2558312.html](http://www.cnblogs.com/yuxc/archive/2012/06/22/2558312.html)  
[https://wizardforcel.gitbooks.io/the-art-of-programming-by-july/content/a.3.html](https://wizardforcel.gitbooks.io/the-art-of-programming-by-july/content/a.3.html)  
[https://github.com/stathat/consistent/blob/master/consistent.go](https://github.com/stathat/consistent/blob/master/consistent.go)  
