---
layout: default
title: "Map"
nav: map
head_extra: |
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
body_extra: |
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="/pct-tracker/assets/js/map.js"></script>
  <script src="/pct-tracker/assets/js/elevation.js"></script>
  <script>
  (function(){
    var L=localStorage.getItem('pctLang'); if(L!=='de'&&L!=='en'){L=((navigator.language||'en').slice(0,2)==='de')?'de':'en';}
    var de=(L==='de');
    function rel(ts){
      var d=Date.now()-new Date(ts).getTime(), day=86400000; if(d<0)d=0;
      if(d<3600000){var m=Math.max(1,Math.round(d/60000)); return de?('vor '+m+' Min'):(m+' min ago');}
      if(d<day){var h=Math.round(d/3600000); return de?('vor '+h+' Std'):(h+' h ago');}
      var days=Math.round(d/day); return de?('vor '+days+' Tag'+(days===1?'':'en')):(days+' day'+(days===1?'':'s')+' ago');
    }
    fetch('/pct-tracker/data/latest.json',{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){
      var el=document.getElementById('heroUpdated'); if(!el||!j||!j.ts) return;
      el.textContent=(de?'Zuletzt gesehen \u00b7 ':'Last seen \u00b7 ')+rel(j.ts);
    }).catch(function(){});
  })();
  </script>
---

<style>
  .about-card .about-title{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:16px; margin-bottom:7px; }
  .about-card .about-text{ margin:0; color:var(--muted); line-height:1.6; font-size:14.5px; max-width:70ch; }
</style>

<section class="home-hero">
  <div>
    <span class="livepill"><span class="beat"></span> <span id="heroUpdated" data-en="Locating…" data-de="Wird geladen…">Locating…</span></span>
    <h1 id="heroTitle">Locating my position&hellip;</h1>
    <p class="sub" id="heroSub">Reading the latest GPS fix from the trail.</p>
    <div class="qstats">
      <div class="qstat"><div class="n"><span id="heroPct">&mdash;</span><small>%</small></div><div class="l" data-en="of the trail done" data-de="des Trails geschafft">of the trail done</div></div>
      <div class="qstat"><div class="n"><span id="heroAvg">&mdash;</span><small id="heroAvgU">km</small></div><div class="l" data-en="average day" data-de="Ø pro Tag">average day</div></div>
      <div class="qstat"><div class="n" id="heroDays">&mdash;</div><div class="l" data-en="days out" data-de="Tage unterwegs">days out</div></div>
    </div>
  </div>
  <div class="hero-map">
    <button class="mapexpand" id="mapExpand" type="button" aria-label="Enlarge map">&#x2921;</button>
    <div id="map" class="map"></div>
    <div class="mapcallout">
      <div class="place" id="mPlace">Locating&hellip;</div>
      <div class="meta" id="mMeta"></div>
    </div>
  </div>
</section>

<div id="elevation"></div>

<div class="card about-card" style="margin-top:12px">
  <div class="about-title" data-en="About the hike" data-de="Über die Wanderung">About the hike</div>
  <p class="about-text" data-en="The Pacific Crest Trail runs 4,265 km (2,650 mi) from the Mexican border to Canada — across the deserts of Southern California, the High Sierra and the Cascades. I'm thru-hiking it northbound in one continuous push. This page follows along in near real time from my GPS, with photos and short journal notes from the trail." data-de="Der Pacific Crest Trail führt 4.265 km von der mexikanischen Grenze bis nach Kanada – durch die Wüsten Südkaliforniens, die High Sierra und die Kaskaden. Ich laufe ihn von Süd nach Nord am Stück. Diese Seite verfolgt meinen Weg nahezu in Echtzeit per GPS, mit Fotos und kurzen Journal-Notizen von unterwegs."></p>
</div>

<div class="mapbackdrop" id="mapBackdrop"></div>

<div class="tele-hidden" aria-hidden="true">
  <span id="status"></span>
  <div id="statusBadge"></div>
  <div id="meta"></div>
  <div id="status-extra"></div>
  <ul id="statsList"></ul>
  <ul id="insightsList"></ul>
</div>
