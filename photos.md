---
layout: default
title: Photos
nav: photos
---

<div class="photo-grid">
{% assign files = site.static_files %}
{% for file in files %}
  {% if file.path contains '/images/' %}
    {% unless file.extname == '.svg' %}
      <div class="photo-item">
        <img src="{{ file.path | relative_url }}" loading="lazy" />
      </div>
    {% endunless %}
  {% endif %}
{% endfor %}
</div>

<style>
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .photo-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 520px) {
  .photo-grid { grid-template-columns: 1fr; }
}

.photo-item {
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.1);
}

.photo-item img {
  width: 100%;
  height: auto;
  display: block;
}
</style>