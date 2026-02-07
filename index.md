---
layout: default
title: "Map"
nav: map
head_extra: |
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
body_extra: |
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="/demo-tracker/assets/js/map.js"></script>
---

<div class="hero">
  <div class="card">
    <div class="card-title">Status</div>
    <div id="status" class="status">loading…</div>
    <div id="meta" class="muted"></div>
    <div id="status-extra" class="muted small"></div>
  </div>
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