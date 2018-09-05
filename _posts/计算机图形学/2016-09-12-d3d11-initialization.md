---
layout: page
title: "Direct3D 11 - Initialization"
teaser: "跑一个D3D11的程序真是难... 现在DX SDK不再是单独安装，而是跟随Windows SDK一起..."
categories:
    - graphics
tags:
    - Graphics
    - D3D11
---

---

**Direct3D 11 初始化步骤**  

- 使用D3D11CreateDevice 函数，创建 ID3D11Device 和 ID3D11DeviceContext  

ID3D11Device 和 ID3D11DeviceContext  接口是 Direct3D 最重要的接口，认为是图形硬件的软件控制器（software controller），也就是说可以通过这两个接口可以控制图形硬件完成制定工作（比如，申请GPU内存资源，清除后台缓冲区，绑定资源到管线的各个阶段，绘制几何图元），更准确地说，

    1. ID3D11Device 接口用于 check feature support，allocate resource
    2. ID3D11DeviceContext 接口用于 set render states，bind resource to the graphics pipeline，issue rendering commands

device 和 context 由下面的函数创建：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
HRESULT D3D11CreateDevice(
  _In_opt_ IDXGIAdapter *pAdapter,
  D3D_DRIVER_TYPE DriverType,
  HMODULE Software,
  UINT Flags,
  _In_opt_ const D3D_FEATURE_LEVEL *pFeatureLevels,
  UINT FeatureLevels,
  UINT SDKVersion,
  _Out_opt_ ID3D11Device **ppDevice,
  _Out_opt_ D3D_FEATURE_LEVEL *pFeatureLevel,
  _Out_opt_ ID3D11DeviceContext **ppImmediateContext
);
</pre>

参数含义，详见[MSDN SDK文档](https://msdn.microsoft.com/en-us/library/windows/desktop/ff476082(v=vs.85).aspx)  

创建示例如下：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Create the device and device context.

UINT createDeviceFlags = 0;

#if defined(DEBUG) || defined(_DEBUG) 
     createDeviceFlags |= D3D11_CREATE_DEVICE_DEBUG;
#endif

D3D_FEATURE_LEVEL featureLevel;
HRESULT hr = D3D11CreateDevice(
        0,                 // default adapter
        md3dDriverType,
        0,                 // no software device
        createDeviceFlags,
        0, 0,              // default feature level array
        D3D11_SDK_VERSION,
        &amp;md3dDevice,
        &amp;featureLevel,
        &amp;md3dImmediateContext);

if( FAILED(hr) )
{
    MessageBox(0, L&quot;D3D11CreateDevice Failed.&quot;, 0, 0);
    return false;
}

if( featureLevel != D3D_FEATURE_LEVEL_11_0 )
{
    MessageBox(0, L&quot;Direct3D Feature Level 11 unsupported.&quot;, 0, 0);
    return false;
}
</pre>

- 检查 4X MSAA Quality Support  

因为Direct3D 11 默认要支持4X多重采样，所以多重采样质量总大于0。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Check 4X MSAA quality support for our back buffer format.
// All Direct3D 11 capable devices support 4X MSAA for all render
// target formats, so we only need to check quality support.

HR(md3dDevice-&gt;CheckMultisampleQualityLevels(
    DXGI_FORMAT_R8G8B8A8_UNORM, 4, &amp;m4xMsaaQuality));
assert( m4xMsaaQuality &gt; 0 );
</pre>

- 描述 Swap Chain  

首先我们需要填充一个 DXGI_SWAP_CHAIN_DESC 结构体，用来描述所要创建的 swap chain 的属性，DXGI_SWAP_CHAIN_DESC 定义如下：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
typedef struct DXGI_SWAP_CHAIN_DESC {
  DXGI_MODE_DESC  BufferDesc;
  DXGI_SAMPLE_DESC SampleDesc;
  DXGI_USAGE      BufferUsage;
  UINT            BufferCount;
  HWND            OutputWindow;
  BOOL            Windowed;
  DXGI_SWAP_EFFECT SwapEffect;
  UINT            Flags;
} DXGI_SWAP_CHAIN_DESC;

// DXGI_MODE_DESC Definition
typedef struct DXGI_MODE_DESC {
  UINT                    Width;
  UINT                    Height;
  DXGI_RATIONAL            RefreshRate;
  DXGI_FORMAT              Format;
  DXGI_MODE_SCANLINE_ORDER ScanlineOrdering;
  DXGI_MODE_SCALING        Scaling;
} DXGI_MODE_DESC;
</pre>

定义含义，详见MSDN SDK文档：[DXGI_SWAP_CHAIN_DESC](https://msdn.microsoft.com/en-us/library/windows/desktop/bb173075(v=vs.85).aspx), [DXGI_MODE_DESC](https://msdn.microsoft.com/en-us/library/windows/desktop/bb173064(v=vs.85).aspx)

示例代码：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Fill out a DXGI_SWAP_CHAIN_DESC to describe our swap chain.

DXGI_SWAP_CHAIN_DESC sd;
sd.BufferDesc.Width  = mClientWidth;
sd.BufferDesc.Height = mClientHeight;
sd.BufferDesc.RefreshRate.Numerator = 60;
sd.BufferDesc.RefreshRate.Denominator = 1;
sd.BufferDesc.Format = DXGI_FORMAT_R8G8B8A8_UNORM;
sd.BufferDesc.ScanlineOrdering = DXGI_MODE_SCANLINE_ORDER_UNSPECIFIED;
sd.BufferDesc.Scaling = DXGI_MODE_SCALING_UNSPECIFIED;

// Use 4X MSAA?
if( mEnable4xMsaa )
{
    sd.SampleDesc.Count   = 4;
    sd.SampleDesc.Quality = m4xMsaaQuality-1;
}
// No MSAA
else
{
    sd.SampleDesc.Count   = 1;
    sd.SampleDesc.Quality = 0;
}

sd.BufferUsage  = DXGI_USAGE_RENDER_TARGET_OUTPUT;
sd.BufferCount  = 1;
sd.OutputWindow = mhMainWnd;
sd.Windowed     = true;
sd.SwapEffect   = DXGI_SWAP_EFFECT_DISCARD;
sd.Flags        = 0;
</pre>

- 创建 Swap Chain

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// To correctly create the swap chain, we must use the IDXGIFactory that was
// used to create the device.  If we tried to use a different IDXGIFactory instance
// (by calling CreateDXGIFactory), we get an error: &quot;IDXGIFactory::CreateSwapChain:
// This function is being called with a device from a different IDXGIFactory.&quot;

IDXGIDevice* dxgiDevice = 0;
HR(md3dDevice-&gt;QueryInterface(__uuidof(IDXGIDevice), (void**)&amp;dxgiDevice));

IDXGIAdapter* dxgiAdapter = 0;
HR(dxgiDevice-&gt;GetParent(__uuidof(IDXGIAdapter), (void**)&amp;dxgiAdapter));

IDXGIFactory* dxgiFactory = 0;
HR(dxgiAdapter-&gt;GetParent(__uuidof(IDXGIFactory), (void**)&amp;dxgiFactory));

HR(dxgiFactory-&gt;CreateSwapChain(md3dDevice, &amp;sd, &amp;mSwapChain));

ReleaseCOM(dxgiDevice);
ReleaseCOM(dxgiAdapter);
ReleaseCOM(dxgiFactory);
</pre>

- 创建 Render Target View

因为我们不能将 resource 直接绑定到渲染管线的一个阶段，而只能将 resource view 绑定到管线的一个阶段。所以，为了将back buffer 绑定到 output merge stage，我们需要创建一个后台缓冲区的视图，如下，

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
ID3D11RenderTargetView* mRenderTargetView;
ID3D11Texture2D* backBuffer;
mSwapChain-&gt;GetBuffer(0, __uuidof(ID3D11Texture2D),  // 0 &#34920;&#31034;&#21518;&#21488;&#32531;&#20914;&#21306;&#30340;&#32034;&#24341;&#22320;&#22336;&#65292;&#22240;&#20026;&#29616;&#22312;&#21482;&#26377;&#19968;&#22359;&#21518;&#21488;&#32531;&#20914;&#21306;&#65292;&#25152;&#20197;&#35774;&#32622;&#20026;0
     reinterpret_cast&lt;void**&gt;(&amp;backBuffer));
md3dDevice-&gt;CreateRenderTargetView(backBuffer, 0, &amp;mRenderTargetView);
ReleaseCOM(backBuffer);
</pre>


- 创建 深度/模板 缓冲区和视图

我们需要创建 深度/模板 缓冲区。深度缓冲区是一块保存深度数据的2D纹理。为了创建一块2D Texture，首先需要填充 D3D11_TEXTURE2D_DESC 结构体，然后调用 ID3D11Device::CreateTexture2D 方法。

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
typedef struct D3D11_TEXTURE2D_DESC {
  UINT            Width;
  UINT            Height;
  UINT            MipLevels;
  UINT            ArraySize;
  DXGI_FORMAT      Format;
  DXGI_SAMPLE_DESC SampleDesc;
  D3D11_USAGE      Usage;
  UINT            BindFlags;
  UINT            CPUAccessFlags;
  UINT            MiscFlags;
} D3D11_TEXTURE2D_DESC;
</pre>

结构体每一个成员的含义见[MSDN SDK文档](https://msdn.microsoft.com/en-us/library/windows/desktop/ff476253(v=vs.85).aspx)

示例代码：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Create the depth/stencil buffer and view.

D3D11_TEXTURE2D_DESC depthStencilDesc;

depthStencilDesc.Width     = mClientWidth;
depthStencilDesc.Height    = mClientHeight;
depthStencilDesc.MipLevels = 1;
depthStencilDesc.ArraySize = 1;
depthStencilDesc.Format    = DXGI_FORMAT_D24_UNORM_S8_UINT;

// Use 4X MSAA? --must match swap chain MSAA values.
if( mEnable4xMsaa )
{
    depthStencilDesc.SampleDesc.Count   = 4;
    depthStencilDesc.SampleDesc.Quality = m4xMsaaQuality-1;
}
// No MSAA
else
{
    depthStencilDesc.SampleDesc.Count   = 1;
    depthStencilDesc.SampleDesc.Quality = 0;
}

depthStencilDesc.Usage          = D3D11_USAGE_DEFAULT;
depthStencilDesc.BindFlags      = D3D11_BIND_DEPTH_STENCIL;
depthStencilDesc.CPUAccessFlags = 0;
depthStencilDesc.MiscFlags      = 0;

HR(md3dDevice-&gt;CreateTexture2D(&amp;depthStencilDesc, 0, &amp;mDepthStencilBuffer));
</pre>

创建 depth/stencil buffer 之后，创建视图：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
HR(md3dDevice-&gt;CreateDepthStencilView(
mDepthStencilBuffer,  // Resource we want to create a view to
0,                    //  D3D11_DEPTH_STENCIL_VIEW_DESC, &#22240;&#20026;&#21019;&#24314; depth/stencil buffer view&#65292;&#25152;&#20197;&#21487;&#20197;&#25351;&#23450;&#20026;0
&amp;mDepthStencilView));  // Return depth/stencil view
</pre>

- 将渲染目标视图和深度/模板视图绑定到渲染管线的 Output Merge Stage  

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Bind the render target view and depth/stencil view to the pipeline.

md3dImmediateContext-&gt;OMSetRenderTargets(1, &amp;mRenderTargetView, mDepthStencilView);
</pre>

第一个参数表示要绑定的render target 的个数，这里只绑定一个render target 。我们可以将这些视图绑定到多个渲染目标。第二个参数是将要绑定的渲染目标数组的第一个元素的指针。第三个参数是将要绑定到管线的 depth/stencil buffer view。<u>注意，只能设置一个深度/模板视图。</u>

- 设置Viewport

通常情况，我们会把3D场景渲染到整个back buffer中，但是，有时候我们想只绘制back buffer的一个子矩形区域中，后台缓冲的子矩形区域叫作视口（Viewport）。设置适口需要先填充一个 D3D11_VIEWPORT 结构体，示例代码如下：

<pre class="brush: cpp; auto-links: true; collapse: false" id="simplecode">
// Set the viewport transform.

mScreenViewport.TopLeftX = 0;
mScreenViewport.TopLeftY = 0;
mScreenViewport.Width    = static_cast&lt;float&gt;(mClientWidth);
mScreenViewport.Height   = static_cast&lt;float&gt;(mClientHeight);
mScreenViewport.MinDepth = 0.0f;
mScreenViewport.MaxDepth = 1.0f;

md3dImmediateContext-&gt;RSSetViewports(1, &amp;mScreenViewport);
</pre>

D3D11_VIEWPORT 结构体每一个成员的含义，见[MSDN SDK文档](https://msdn.microsoft.com/en-us/library/windows/desktop/ff476260(v=vs.85).aspx)
