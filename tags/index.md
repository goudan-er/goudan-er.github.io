---
title: Tags
layout: page
---

<ul class="tags">
<div class="tags-show">
{% for tag in site.tags %}
<li><a href="#{{ tag[0] }}" title="{{ tag[0] }}" rel="{{ tag[1].size }}">{{ tag[0] }} <span>{{ tag[1].size }}</span> </a></li>
{% endfor %}
</div>
</ul>


<!-- <br><br> -->

<ul class="listing">
{% for tag in site.tags %}
 <li class="listing-seperator-tag" id="{{ tag[0] }}">{{ tag[0] }}</li>
{% for post in tag[1] %}
 <li class="listing-item">
 <time datetime="{{ post.date | date:"%Y-%m-%d" }}">{{ post.date | date:"%Y-%m-%d" }}</time>
 <a href="{{ site.url }}{{ post.url }}" title="{{ post.title }}" class="normal">{{ post.title }}</a>
 </li>
{% endfor %}
{% endfor %}
</ul>