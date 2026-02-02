(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  /* -------------------------------------------------------
     BASEMAPS (4 MODES) — Satellite ist Standard
  ------------------------------------------------------- */
  const BASEMAPS = {
    satellite: {
      icon: "🛰",
      source: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        attribution: "© Esri"
      }
    },
    dark: {
      icon: "🌙",
      source: {
        type: "raster",
        tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap"
      }
    },
    osm: {
      icon: "🗺",
      source: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap"
      }
    },
    topo: {
      icon: "🏔",
      source: {
        type: "raster",
        tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenTopoMap"
      }
    }
  };

  const ORDER = ["satellite", "dark", "osm", "topo"];
  let basemapIndex = 0; // 0 = satellite

  function buildStyle(key) {
    const bm = BASEMAPS[key];
    return {
      version: 8,
      sources: { basemap: bm.source },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }]
    };
  }

  const map = new maplibregl.Map({
    container: "map",
    style: buildStyle("satellite"),
    center: [9.17, 48.78],
    zoom: 11
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  /* -------------------------------------------------------
     ONE BUTTON: cycle basemaps (icon only)
  ------------------------------------------------------- */
  const mapEl = document.getElementById("map");

  function makeBtn({ right, icon, title }) {
    const b = document.createElement("button");
    b.innerHTML = icon;
    b.title = title;
    b.style.cssText = `
      position:absolute;
      top:12px;
      right:${right}px;
      width:36px;
      height:36px;
      border-radius:10px;
      border:none;
      font-size:18px;
      cursor:pointer;
      background:#0f172a;
      color:#fff;
      box-shadow:0 6px 20px rgba(0,0,0,.45);
      display:flex;
      align-items:center;
      justify-content:center;
      user-select:none;
      z-index:2;
    `;
    mapEl.appendChild(b);
    return b;
  }

  const btnBasemap = makeBtn({
    right: 12,
    icon: BASEMAPS.satellite.icon,
    title: "Basemap wechseln"
  });

  btnBasemap.onclick = () => {
    basemapIndex = (basemapIndex + 1) % ORDER.length;
    const key = ORDER[basemapIndex];
    btnBasemap.innerHTML = BASEMAPS[key].icon;

    // IMPORTANT: setStyle wipes all sources/layers -> we re-inject on style.load
    map.setStyle(buildStyle(key));
  };

  /* -------------------------------------------------------
     Cache latest fetched data so we can reapply it after setStyle()
  ------------------------------------------------------- */
  let lastTrack = null;        // full FeatureCollection
  let lastLatestFeature = null; // newest activity feature
  let lastLatestJson = null;   // latest.json for marker

  /* -------------------------------------------------------
     Basemap tweaks (to make them readable)
  ------------------------------------------------------- */
  function applyBasemapTweaks(key) {
    try {
      if (key === "dark") {
        // brighten dark tiles a bit
        map.addLayer({
          id: "brighten-overlay",
          type: "background",
          paint: { "background-color": "rgba(255,255,255,0.16)" }
        });

        map.setPaintProperty("basemap", "raster-saturation", -0.2);
        map.setPaintProperty("basemap", "raster-contrast", 0.15);
        map.setPaintProperty("basemap", "raster-brightness-min", 0.08);
        map.setPaintProperty("basemap", "raster-brightness-max", 0.98);
      }

      if (key === "topo") {
        // Topo war dir zu dunkel -> heller/kontrastiger, OHNE overlay
        map.setPaintProperty("basemap", "raster-saturation", 0.12);
        map.setPaintProperty("basemap", "raster-contrast", 0.24);
        map.setPaintProperty("basemap", "raster-brightness-min", 0.22);
        map.setPaintProperty("basemap", "raster-brightness-max", 1.0);
      }

      if (key === "satellite") {
        map.setPaintProperty("basemap", "raster-saturation", -0.1);
        map.setPaintProperty("basemap", "raster-contrast", 0.12);
      }

      if (key === "osm") {
        map.setPaintProperty("basemap", "raster-contrast", 0.06);
      }
    } catch {}
  }

  function currentBasemapKey() {
    return ORDER[basemapIndex];
  }

  /* -------------------------------------------------------
     Track layers (all tracks) + live highlight (only newest)
  ------------------------------------------------------- */
  function ensureTrackLayers() {
    // Source for ALL tracks
    if (!map.getSource("track")) {
      map.addSource("track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
    }

    // Source for ONLY newest track (needs lineMetrics for line-progress)
    if (!map.getSource("latestTrack")) {
      map.addSource("latestTrack", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        lineMetrics: true
      });
    }

    // Alternating colors by properties.i
    const colorExpr = [
      "case",
      ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
      "#46f3ff",  // cyan
      "#ff4bd8"   // magenta
    ];

    // ALL tracks: glow underlay
    if (!map.getLayer("track-glow")) {
      map.addLayer({
        id: "track-glow",
        type: "line",
        source: "track",
        paint: {
          "line-color": colorExpr,
          "line-width": 12,
          "line-opacity": 0.30,
          "line-blur": 7
        }
      });
    }

    // ALL tracks: main line
    if (!map.getLayer("track-main")) {
      map.addLayer({
        id: "track-main",
        type: "line",
        source: "track",
        paint: {
          "line-color": colorExpr,
          "line-width": 5,
          "line-opacity": 0.95
        }
      });
    }

    // Newest track: animated live progress highlight
    if (!map.getLayer("latest-live")) {
      map.addLayer({
        id: "latest-live",
        type: "line",
        source: "latestTrack",
        paint: {
          "line-width": 8,
          "line-opacity": 0.98,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0, "rgba(255,255,255,0)",
            1, "rgba(255,255,255,0)"
          ]
        }
      });
    }
  }

  /* -------------------------------------------------------
     Live animation (only newest track)
  ------------------------------------------------------- */
  let rafId = null;
  let animT = 0;

  function setLiveGradient(t) {
    const head = t;                 // moving bright point
    const tail = Math.max(0, head - 0.10);
    const fade = Math.max(0, head - 0.18);

    const grad = [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0, "rgba(255,255,255,0)",
      fade, "rgba(255,255,255,0)",
      tail, "rgba(255,255,255,0.15)",
      head, "rgba(255,255,255,0.98)",
      Math.min(1, head + 0.01), "rgba(255,255,255,0)",
      1, "rgba(255,255,255,0)"
    ];

    try {
      map.setPaintProperty("latest-live", "line-gradient", grad);
    } catch {}
  }

  function startAnim() {
    if (rafId) return;
    const loop = () => {
      animT = (animT + 0.004) % 1;
      setLiveGradient(animT);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function stopAnim() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  /* -------------------------------------------------------
     Marker (blink green <-> orange)
  ------------------------------------------------------- */
  let marker;

  function createBlinkMarkerEl() {
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "999px";
    el.style.border = "2px solid rgba(255,255,255,.95)";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
    el.style.background = "#2bff88";
    el.style.position = "relative";

    const ring = document.createElement("div");
    ring.style.position = "absolute";
    ring.style.left = "-12px";
    ring.style.top = "-12px";
    ring.style.width = "40px";
    ring.style.height = "40px";
    ring.style.borderRadius = "999px";
    ring.style.border = "2px solid rgba(43,255,136,.55)";
    ring.style.boxShadow = "0 0 24px rgba(43,255,136,.45)";
    ring.style.animation = "pctPulse 1.6s ease-out infinite";
    el.appendChild(ring);

    if (!document.getElementById("pctPulseStyle")) {
      const s = document.createElement("style");
      s.id = "pctPulseStyle";
      s.textContent = `
        @keyframes pctPulse {
          0%   { transform: scale(0.55); opacity: 0.85; }
          70%  { transform: scale(1.18); opacity: 0.20; }
          100% { transform: scale(1.28); opacity: 0.00; }
        }
      `;
      document.head.appendChild(s);
    }

    let on = false;
    setInterval(() => {
      on = !on;
      const c = on ? "#ff7a18" : "#2bff88";
      el.style.background = c;
      ring.style.borderColor = on ? "rgba(255,122,24,.55)" : "rgba(43,255,136,.55)";
      ring.style.boxShadow = on ? "0 0 24px rgba(255,122,24,.45)" : "0 0 24px rgba(43,255,136,.45)";
    }, 700);

    return el;
  }

  /* -------------------------------------------------------
     Helpers
  ------------------------------------------------------- */
  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  function fmtTs(ts) {
    try { return new Date(ts).toLocaleString(); }
    catch { return String(ts); }
  }

  function pickNewestFeature(track) {
    const feats = (track && track.features) ? track.features : [];
    if (!feats.length) return null;

    // pick max start_date (string ISO)
    let newest = feats[0];
    for (const f of feats) {
      const a = (f.properties && f.properties.start_date) ? f.properties.start_date : "";
      const b = (newest.properties && newest.properties.start_date) ? newest.properties.start_date : "";
      if (a > b) newest = f;
    }
    return newest;
  }

  function setSourcesDataFromCache() {
    // After setStyle: sources are new/empty -> reapply cached data
    try {
      if (map.getSource("track") && lastTrack) {
        map.getSource("track").setData(lastTrack);
      }
      if (map.getSource("latestTrack")) {
        const fc = {
          type: "FeatureCollection",
          features: lastLatestFeature ? [lastLatestFeature] : []
        };
        map.getSource("latestTrack").setData(fc);
      }
    } catch {}
  }

  function ensureMarkerFromCache() {
    try {
      if (!lastLatestJson) return;
      const lngLat = [lastLatestJson.lon, lastLatestJson.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createBlinkMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }
    } catch {}
  }

  /* -------------------------------------------------------
     Core refresh: fetch data & update caches & sources
  ------------------------------------------------------- */
  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      lastTrack = track;
      lastLatestJson = latest;
      lastLatestFeature = pickNewestFeature(track);

      // If style just changed, layers might not exist yet -> ensure
      ensureTrackLayers();

      // Update sources
      if (map.getSource("track")) map.getSource("track").setData(track);

      const latestFc = {
        type: "FeatureCollection",
        features: lastLatestFeature ? [lastLatestFeature] : []
      };
      if (map.getSource("latestTrack")) map.getSource("latestTrack").setData(latestFc);

      // Marker
      ensureMarkerFromCache();

      metaEl.textContent =
        `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

      statusEl.textContent = "online";

      // Start animation (always on)
      startAnim();
    } catch (e) {
      statusEl.textContent = "Fehler";
      metaEl.textContent = "Daten fehlen? (data/track.geojson, data/latest.json)";
      console.warn(e);
    }
  }

  /* -------------------------------------------------------
     KEY FIX: after any style change, re-inject everything + reapply cached data
  ------------------------------------------------------- */
  map.on("style.load", () => {
    // re-add layers/sources
    ensureTrackLayers();

    // apply tweaks based on current basemap
    applyBasemapTweaks(currentBasemapKey());

    // reapply cached track data so lines don't disappear
    setSourcesDataFromCache();

    // ensure marker stays
    ensureMarkerFromCache();

    // keep animation running
    startAnim();
  });

  map.on("load", () => {
    applyBasemapTweaks("satellite");
    ensureTrackLayers();
    refresh();
    setInterval(refresh, 60_000);
  });
})();