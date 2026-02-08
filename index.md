---
layout: default
title: "Map"
nav: map
head_extra: |
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    /* Photos section */
    .section-title{
      font-weight: 900;
      font-size: 18px;
      margin: 22px 0 10px;
      color: rgba(245,248,255,.92);
      letter-spacing: .2px;
    }

    .photo-grid{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 900px){
      .photo-grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 520px){
      .photo-grid{ grid-template-columns: 1fr; }
    }

    .photo-grid a{
      display:block;
      border-radius: 16px;
      overflow:hidden;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
    }
    .photo-grid img{
      width: 100%;
      height: 220px;
      object-fit: cover;
      display:block;
    }
    @media (max-width: 520px){
      .photo-grid img{ height: 240px; }
    }

    .updates-cta{
      margin: 14px 0 6px;
      display:flex;
      justify-content:center;
    }
    .btn-updates{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.06);
      color: rgba(245,248,255,.92);
      font-weight: 800;
      text-decoration:none;
      box-shadow: 0 10px 26px rgba(0,0,0,.25);
    }
    .btn-updates:active{ transform: translateY(1px); }

    /* If you want: hide image captions/links under gallery automatically (none used anyway) */
  </style>
body_extra: |
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="{{ '/assets/js/map.js' | relative_url }}"></script
---

<!-- (Optional) hidden status targets so your existing JS doesn't crash if it still writes into them -->
<div style="display:none">
  <span id="status"></span>
  <div id="meta"></div>
  <div id="status-extra"></div>
</div>

<div id="map" class="map"></div>

<div class="grid">
  <div class="card">
    <div class="card-title">Statistics</div>
    <ul id="statsList" class="list"></ul>
  </div>

  <div class="card">
    <div class="card-title">Insights</div>
    <ul id="insightsList" class="list"></ul>
  </div>
</div>

## Photos

<div class="photo-grid">
{% assign imgs = site.static_files | where_exp:"f","f.path contains '/images/'" %}
{% for f in imgs %}
  {% if f.extname == ".jpg" or f.extname == ".jpeg" or f.extname == ".png" or f.extname == ".webp" or f.extname == ".gif" %}
    <a href="{{ f.path | relative_url }}" target="_blank" rel="noopener">
      <img src="{{ f.path | relative_url }}" alt="">
    </a>
  {% endif %}
{% endfor %}
</div>

<div class="updates-cta">
  <a class="btn-updates" href="{{ '/updates' | relative_url }}">Updates</a>
</div>