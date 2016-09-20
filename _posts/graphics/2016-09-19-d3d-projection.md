---
layout: page
title: "Direct3D - 透视投影矩阵与齐次裁剪空间"
teaser: "重新推导一遍..."
categories:
    - graphics
tags:
    - Graphics
---

<u>通过世界矩阵和视矩阵的变换，可以得到在相机观察空间下的坐标，投影矩阵（projection）的作用就是将相机观察空间下的3D坐标映射为屏幕的2D坐标。</u>

---

**<u>frustum</u>**  

定义一个相机的位置和方向。知道了相机的位置和方向，我们是通过定义一个平截头体（frustum）来描述相机的范围，裁剪阶段也是依据这个范围空间进行裁剪。平截头体如下：  

![frustum.png](/images/20160919/frustum.png)

$\alpha$ 表示垂直视角，$\beta$表示水平视角，near plane 表示近平面，far plane 表示远平面。  

通常，我们在观察空间中使用4个参数定义，以原点为中心，观察方向为 z 轴正方向的 frustum。四个参数分别为：

    1. n，近平面位置
    2. f，远平面位置
    3. α，垂直视角
    4. r，横纵比（aspect ratio）

在观察空间中，近平面和远平面都平行于 xy 平面，所以只需要指定他们沿 z 轴方向的距离即可表示这两个平面。横纵比由 r=w/h 表示，其中 w 表示投影窗口的宽度，h 表示投影窗口的高度（单位由观察空间决定）。投影窗口本质是场景在观察空间中的2D图像，而且该图像最终会被映射到后台缓冲区，所以投影窗口的比例应和后台缓冲区的尺寸比例一致。当后台缓冲 区的尺寸为 800×600 时，横纵比  r = 800/600 ≈ 1.333 。不一致会导致变形，比如一个圆被拉伸成椭圆。

**<u>有了这4个参数，就真的就是足够了，下面将一步一步推导出投影矩阵及投影坐标</u>**

- 首先计算水平视角 $\beta$  

首先，假设一个投影平面，为了方便计算，设高 h=2，有，w=2r 。投影面尺寸大小不重要，重要的是比例 r 。
同时，设投影面距离视点为d。投影面在哪也无所谓，可以放在近平面，也可以放在 0-n 之间，但是最后发现的是，投影矩阵以及最后得到的坐标都与这个距离d无关。

![projection-1.png](/images/20160919/projection-1.png)

由 yz 平面，有 $tan(\frac{\alpha}{2}) = \frac{1}{d} \rightarrow d = cot(\frac{\alpha}{2})$

由 xz 平面，有 $tan(\frac{\beta}{2}) = \frac{r}{d} = r \cdot tan(\frac{\alpha}{2})$

所以，可以求得水平视角 $\beta$ 。

- 计算投影窗口的投影坐标  

设视觉空间中一个点的坐标为 (x, y, z)，这个点投影到投影窗口上的坐标为 (x', y', d)，如图所示。

![projection-2.png](/images/20160919/projection-2.png)

所以，根据三角形相似，有，

$\frac{x'}{d}=\frac{x}{z} \rightarrow x' = \frac{xd}{z} = \frac{xcot(\alpha/2)}{z} = \frac{x}{ztan(\alpha/2)}$

和

$\frac{y'}{d}=\frac{y}{z} \rightarrow x' = \frac{yd}{z} = \frac{ycot(\alpha/2)}{z} = \frac{y}{ztan(\alpha/2)}$

因为在 frustum 内的点都会投影到投影面，所以我们可以反推，点 (x, y, z) 在 frustum 中，当且仅当，

    1. -r <= x' <= r
    2. -1 <= y' <= 1
    3. n <= z <= f

- 规范化设备坐标（NDC，Normalized Device Coordinates）

**为什么要使用NDC？**  
    1. 设备坐标系（Device），也叫屏幕坐标系，由每一个显示设备（如显示器）的像素点定义，每一个显示设备都有自己单独的坐标系统。还可以进一步在屏幕坐标系统定义一块视图区（view port）  
    2. 上述计算的投影坐标，依赖投影窗口的横纵比，这也就意味着我们需要为硬件指定横纵比，硬件才可以执行那些与投影窗口尺寸相关的操作（比如，将投影窗口映射到后台缓冲区）  
    3. 去除横纵比的依赖，可以简化后面的运算。NDC空间的坐标可以通过视口变换映射为设备坐标系下的屏幕坐标。  

在NDC空间下，x，y 会规范到 [-1, 1] 之间，z规范到 [0, 1] 之间（d3d中，而在opengl中，z 规范到 [-1, 1]）

所以NDC空间下，点 (x, y, z) 在 frustum 中，当且仅当，

    1. -1 <= x'/r <= 1
    2. -1 <= y' <= 1
    3. n <= z <= f

所以，修改上面的投影公式，得到在NDC空间下的投影坐标：  
![projection-ndc.png](/images/20160919/projection-ndc.png)

在 NDC 空间中，投影窗口的高度和宽度都为 2。也就是说，现在的尺寸是固定的，硬件不需要知道横纵比，而且我们必须自己来完成投影坐标从观察空间到 NDC 空间的转换工作（图形硬件假定我们会完成这一工作，这个工作也就是视口变换）。

- 矩阵描述以及透视除法  

现在我们想要把投影变换用矩阵来表示。但是上式中，由于都出现了除以z，而非线性的式子我们无法使用矩阵描述，但是都除以z提醒了我们可以分为两部分处理：先一个线性操作，然后一个除以z的非线性操作，但是我们经过线性变化后，原始的 z 已经丢失，我们需要想办法保存下来原始的深度 z 。解决办法是我们使用齐次坐标的 w 保存 z。所以投影矩阵大致如下：

![projection-matrix-1.png](/images/20160919/projection-matrix-1.png)  
矩阵中的 A、B 是两个对 z 线性变换的常量参数，后面会求。

任意一个frustum中的坐标 (x, y, z, 1) 与 投影矩阵乘，可以得到：  
![projection-cal.png](/images/20160919/projection-cal.png)

**然后，每个坐标除以 w=z，得到最终结果：**  
![perspective_division.png](/images/20160919/perspective_division.png)

**<u>除以w这一步骤，又被称为透视除法，同时除以w的时候，我们不必担心 w=0，因为 w = z >= n > 0</u>**

- 规范化深度值  

在d3d中，z会被规范到 [0, 1]，令 g(z) 为映射函数，所以有，

$g(z) = A + \frac{B}{z}$  
$0 \leq g(z) \leq 1$  
$n \leq z \leq f$  

将 z = n 和 z = f 带入，有，

$A + \frac{B}{n} = 0$  
$A + \frac{B}{f} = 1$  

解得，$A = \frac{f}{f-n}$，$B = -\frac{nf}{f-n}$

有，$g(z) = \frac{f}{f-n} - \frac{nf}{(f-n)z}$

g(z) 函数图像：

![gz.png](/images/20160919/gz.png)

由于图像是非线性的，当 z 接近 近平面 和 远平面 时，都会出现精度问题。通常的建议是让近平面和远平面尽可能接近，把深度的精度性问题减小到最低程度。

**<u>最后，投影矩阵</u>**：  

![projection-matrix.png](/images/20160919/projection-matrix.png)

Direct3D 11 中，投影矩阵可通过 XNA 数学库获得。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
static XMMATRIX XMMatrixPerspectiveFovLH( // returns projection matrix, LH表示左手坐标系
FLOAT FovAngleY, // vertical field of view angle in radians
FLOAT AspectRatio, // aspect ratio = width / height
FLOAT NearZ, // distance to near plane
FLOAT FarZ); // distance to far plane
</pre>
