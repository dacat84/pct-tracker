---
layout: default
title: "Blog"
nav: blog
---

<div class="hero">
  <div class="card">
    <div class="card-title">Trail Journal</div>
    <div class="muted">
      Short updates from the trail — highlights, notes, and lessons learned.
    </div>
  </div>
</div>

<div class="posts">
  {% for post in site.posts %}
    <a class="post-card" href="{{ post.url | relative_url }}">
      <div class="post-title">{{ post.title }}</div>
      <div class="post-meta">{{ post.date | date: "%b %-d, %Y" }}</div>
      <div class="post-excerpt">{{ post.excerpt | strip_html | truncate: 140 }}</div>
    </a>
  {% endfor %}
</div>