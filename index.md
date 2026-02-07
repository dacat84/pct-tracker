---
layout: default
title: "Map"
nav: map
head_extra: |
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    /* --- Status card compact look --- */
    .status-card .status-row{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }
    .status-card .card-title{
      margin:0;
    }

    .pill{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:6px 10px;
      border-radius:999px;
      border:1px solid rgba(120, 220, 190, .35);
      background: rgba(30, 60, 55, .25);
      font-size: 13px;
      line-height: 1;
      user-select:none;
      white-space:nowrap;
    }
    .pill-dot{
      width:10px;
      height:10px;
      border-radius:999px;
      background:#39e58c;
      box-shadow: 0 0 0 0 rgba(57,229,140,.45);
      animation: pillPulse 1.8s ease-out infinite;
      flex:0 0 auto;
    }
    @keyframes pillPulse{
      0%   { box-shadow: 0 0 0 0 rgba(57,229,140,.45); }
      70%  { box-shadow: 0 0 0 10px rgba(57,229,140,0); }
      100% { box-shadow: 0 0 0 0 rgba(57,229,140,0); }
    }

    /* Make the status texts a bit more compact */
    #meta{
      margin-top: 6px;
      font-size: 14px;
    }
    #status-extra{
      margin-top: 6px;
      opacity: .9;
    }
  </style>
body_extra: |
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="/demo-tracker/assets/js/map.js"></script>
---

<div class="hero">
  <div class="card status-card">
    <div class="status-row">
      <div class="card-title">Status</div>
      <div class="pill" id="onlinePill" title="Live status">
        <span class="pill-dot" aria-hidden="true"></span>
        <span id="status">loading…</span>
      </div>
    </div>

    <div id="meta" class="muted"></div>
    <div id="status-extra" class="muted small"></div>
  </div>
</div>

<div id="map" class="map"></div>

<div class="grid">
  <div class="card">
    <div class="card-title">Statistics</div>
    <ul id="statsList" class="list">
      <li class="muted">loading…</li>
    </ul>
  </div>

  <div class="card">
    <div class="card-title">Insights</div>
    <ul id="insightsList" class="list">
      <li class="muted">loading…</li>
    </ul>
  </div>
</div>