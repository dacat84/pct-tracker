---
layout: default
title: "Blog"
nav: blog
---

<div class="grid">
  <div class="card">
    <div class="card-title">Updates</div>
    <div class="muted">Posts liegen in <code>_posts/</code>. Neue Datei hochladen = neuer Eintrag.</div>
  </div>
</div>

<div class="posts">
  {% for post in site.posts %}
    <a class="post-card" href="{{ post.url | relative_url }}">
      <div class="post-card-title">{{ post.title }}</div>
      <div class="muted">{{ post.date | date: "%d.%m.%Y" }}</div>
      <div class="post-card-excerpt">{{ post.excerpt | strip_html | truncate: 160 }}</div>
    </a>
  {% endfor %}
</div>
