---
layout: default
title: "Map"
nav: map
head_extra: |
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
body_extra: |
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="{{ '/assets/js/map.js' | relative_url }}"></script>
---

<div class="hero">
  <div class="card">
    <div class="card-title">Status</div>
    <div id="status" class="status">lädt…</div>
    <div id="meta" class="muted"></div>
    <div class="muted small">Tipp: Ersetze später <code>data/track.geojson</code> & <code>data/latest.json</code> durch deine echten Daten.</div>
  </div>
</div>

<div id="map" class="map"></div>

<div class="grid">
  <div class="card">
    <div class="card-title">Features</div>
    <ul class="list">
      <li>Track (GeoJSON) als Linie</li>
      <li>Letzter Punkt als Marker</li>
      <li>„Last updated“ aus latest.json</li>
      <li>Mobile-first Layout + Tabs</li>
    </ul>
  </div>
  <div class="card">
    <div class="card-title">Nächste Schritte</div>
    <ol class="list">
      <li>Repo erstellen</li>
      <li>Dateien hochladen</li>
      <li>GitHub Pages aktivieren</li>
      <li>Custom Domain optional</li>
    </ol>
  </div>
</div>
