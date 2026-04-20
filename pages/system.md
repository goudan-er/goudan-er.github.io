---
layout: page
show_meta: false
title: "后端技术/系统/分布式"
permalink: "/share/system/"
---
{% for post in site.categories.system %}
<article class="post-item">
  <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
  <p class="post-item__meta">{{ post.date | date: "%Y-%m-%d" }} · system</p>
  <p>{% if post.meta_description %}{{ post.meta_description | strip_html | escape }}{% elsif post.teaser %}{{ post.teaser | strip_html | escape }}{% elsif post.excerpt %}{{ post.excerpt | strip_html | escape }}{% endif %}</p>
</article>
{% endfor %}