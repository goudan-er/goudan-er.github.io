---
layout: page
title: Categories
---

<!-- <ul class="listing">
{% for cat in site.categories %}
  <li class="listing-seperator" id="{{ cat[0] }}">{{ cat[0] }}</li>
{% for post in cat[1] %}
  <li class="listing-item">
  <time datetime="{{ post.date | date:"%Y-%m-%d" }}">{{ post.date | date:"%Y-%m-%d" }}</time>
  <a href="{{ site.url }}{{ post.url }}" title="{{ post.title }}" class="normal">{{ post.title }}</a>
  </li>
{% endfor %}
{% endfor %}
</ul> -->

<ul class="categories">
<div class="title">
{% for cat in site.categories %}
<li>
	<a href="#{{ cat[0] }}" title="{{ cat[0] }}" rel="{{ cat[1].size }}" class="normal">{{ cat[0] }}</a>
	<span class="category-number">({{ cat[1].size }})</span>
</li>
{% endfor %}
</div>
</ul>

<ul class="listing">
	{% capture archives_year %}
		{{ 'now' | date: '%Y' }}
	{% endcapture %}
	{% for post in site.posts %}
		{% capture post_year %}
			{{ post.date | date: '%Y' }}
		{% endcapture %}
		{% if archives_year != post_year %}
			{% assign archives_year = post_year %}
            	<li class="listing-seperator" id="{{ archives_year }}">{{ archives_year }}</li>
           {% endif %}
        <li class="listing-item">
        	<time>{{ post.date | date: "%m-%d" }}</time>
        	<a href="{{ site.url }}{{ post.url }}" title="{{ post.title }}" class="normal">{{ post.title }}</a>
        </li>
    {% endfor %}
</ul>



