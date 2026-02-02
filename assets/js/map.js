(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  /* -------------------------------------------------------
     BASEMAP DEFINITIONS (4 MODES)
  ------------------------------------------------------- */
  const BASEMAPS = {
    satellite: {
      id: "sat",
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
      id: "dark",
      icon: "🌙",
      source: {
        type: "raster",
        tiles: [
          "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        ],
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap"
      }
    },
    osm: {
      id: "osm",
      icon: "🗺",
      source: {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap"
      }
    },
    topo: {
      id: "topo",
      icon: "🏔",
      source: {
        type: "raster",
        tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenTopoMap"
      }
    }
  };

  // Toggle-Reihenfolge
  const ORDER = ["satellite", "dark", "osm", "topo"];
  let basemapIndex = 0; // 0 = satellite default

  // 3D/Terrain Toggle State
  let terrainEnabled = false;

  // Live-Progress Animation Toggle State
  let liveEnabled = true; // standard AN (kannst du auch false setzen)

  // requestAnimationFrame handle
  let rafId = null;
  let animT = 0;

  function buildStyle(key) {
    const bm = BASEMAPS[key];
    return {
      version: 8,
      sources: {
        basemap: bm.source
      },
      layers: [
        { id: "basemap", type: "raster", source: "basemap" }
      ]
    };
  }

  const map = new maplibregl.Map({
    container: "map",
    style: buildStyle("satellite"),
    center: [9.17, 48.78],
    zoom: 11,
    pitch: 0,
    bearing: 0
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  /* -------------------------------------------------------
     BUTTONS (ICON ONLY)
     1) Basemap toggle (4 modes)
     2) 3D terrain toggle
     3) Live-progress toggle
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
    `;
    mapEl.appendChild(b);
    return b;
  }

  // Basemap toggle button
  const btnBasemap = makeBtn({
    right: 52,
    icon: BASEMAPS.satellite.icon,
    title: "Basemap wechseln"
  });

  // 3D toggle button
  const btn3D = makeBtn({
    right: 92,
    icon: "⛰️",
    title: "3D Terrain an/aus"
  });

  // Live toggle button
  const btnLive = makeBtn({
    right: 132,
    icon: "⚡",
    title: "Live-Progress an/aus"
  });

  btnBasemap.onclick = () => {
    basemapIndex = (basemapIndex + 1) % ORDER.length;
    const key = ORDER[basemapIndex];
    btnBasemap.innerHTML = BASEMAPS[key].icon;

    map.setStyle(buildStyle(key));
    map.once("styledata", () => {
      // Style neu -> alles wieder rein
      injectTerrainIfNeeded();
      injectTrackLayersIfNeeded();
      applyBasemapTweaks(key);
      // Live-Animation neu setzen (falls aktiv)
      if (liveEnabled) startLiveAnim();
    });
  };

  btn3D.onclick = () => {
    terrainEnabled = !terrainEnabled;
    // kleine visuelle Rückmeldung
    btn3D.style.background = terrainEnabled ? "#1b2a4a" : "#0f172a";
    injectTerrainIfNeeded(true);
  };

  btnLive.onclick = () => {
    liveEnabled = !liveEnabled;
    btnLive.style.background = liveEnabled ? "#1b2a4a" : "#0f172a";
    if (liveEnabled) startLiveAnim();
    else stopLiveAnim();
  };

  /* -------------------------------------------------------
     VISUAL TWEAKS PER BASEMAP
  ------------------------------------------------------- */
  function applyBasemapTweaks(key) {
    try {
      // erst evtl. alte overlays entfernen (wenn Style neu gebaut wurde, sind sie eh weg)
      if (key === "dark") {
        // Dark leicht heller machen
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
        // Topo “heller”, ohne Overlay
        map.setPaintProperty("basemap", "raster-saturation", 0.12);
        map.setPaintProperty("basemap", "raster-contrast", 0.22);
        map.setPaintProperty("basemap", "raster-brightness-min", 0.18);
        map.setPaintProperty("basemap", "raster-brightness-max", 1.0);
      }

      if (key === "satellite") {
        // Sat minimal entsättigen (Tracks knallen mehr)
        map.setPaintProperty("basemap", "raster-saturation", -0.1);
        map.setPaintProperty("basemap", "raster-contrast", 0.12);
      }

      if (key === "osm") {
        // OSM clean (optional)
        map.setPaintProperty("basemap", "raster-contrast", 0.05);
      }
    } catch {}
  }

  /* -------------------------------------------------------
     TERRAIN / 3D
     Uses MapLibre demo terrain tiles. If you want stable provider, tell me.
  ------------------------------------------------------- */
  function injectTerrainIfNeeded(forceUpdate = false) {
    if (!terrainEnabled) {
      // Terrain AUS
      try { map.setTerrain(null); } catch {}
      try { if (map.getLayer("sky")) map.removeLayer("sky"); } catch {}
      // pitch zurück
      map.easeTo({ pitch: 0, duration: 700 });
      return;
    }

    // Terrain AN
    try {
      // Source nur anlegen, wenn fehlt oder wir bewusst neu initialisieren wollen
      if (forceUpdate || !map.getSource("dem")) {
        if (map.getSource("dem")) {
          // bei style reload: source kann existieren / nicht existieren
          // MapLibre erlaubt removeSource nur wenn nicht genutzt
          // wir versuchen nicht zu löschen -> einfach neu setzen wenn geht
        }

        map.addSource("dem", {
          type: "raster-dem",
          url: "https://demotiles.maplibre.org/terrain-tiles/tiles.json",
          tileSize: 256,
          maxzoom: 14
        });
      }

      map.setTerrain({ source: "dem", exaggeration: 1.35 });

      // Sky Layer (nice bei 3D)
      if (!map.getLayer("sky")) {
        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun": [0.0, 0.0],
            "sky-atmosphere-sun-intensity": 8
          }
        });
      }

      // 3D-Pitch setzen
      map.easeTo({ pitch: 60, duration: 900 });
    } catch (e) {
      console.warn("Terrain konnte nicht aktiviert werden:", e);
    }
  }

  /* -------------------------------------------------------
     DATA LOAD HELPERS
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

  /* -------------------------------------------------------
     TRACK LAYERS + LIVE PROGRESS
     NOTE: For line-progress animation we need lineMetrics:true in source.
  ------------------------------------------------------- */
  function injectTrackLayersIfNeeded() {
    // Track source
    if (!map.getSource("track")) {
      map.addSource("track", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        lineMetrics: true // ✅ needed for line-progress / line-gradient
      });
    }

    // Color: alternating per activity "i"
    const colorExpr = [
      "case",
      ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
      "#46f3ff",  // cyan
      "#ff4bd8"   // magenta
    ];

    // Glow underlay
    if (!map.getLayer("track-glow")) {
      map.addLayer({
        id: "track-glow",
        type: "line",
        source: "track",
        paint: {
          "line-color": colorExpr,
          "line-width": 12,
          "line-opacity": 0.32,
          "line-blur": 7
        }
      });
    }

    // Main line
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

    // Live progress highlight layer (animated via line-gradient)
    if (!map.getLayer("track-live")) {
      map.addLayer({
        id: "track-live",
        type: "line",
        source: "track",
        paint: {
          "line-width": 7,
          "line-opacity": 0.95,
          // placeholder; will be overwritten in animation loop
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

  function setLiveGradient(t) {
    // t in [0..1) : moving head
    const head = t;
    const tail = Math.max(0, head - 0.10); // length of bright segment
    const fade = Math.max(0, head - 0.18);

    // Neon white -> cyan-ish head
    const grad = [
      "interpolate",
      ["linear"],
      ["line-progress"],
      0, "rgba(255,255,255,0)",
      fade, "rgba(255,255,255,0)",
      tail, "rgba(255,255,255,0.12)",
      head, "rgba(255,255,255,0.95)",
      Math.min(1, head + 0.01), "rgba(255,255,255,0)",
      1, "rgba(255,255,255,0)"
    ];

    try {
      map.setPaintProperty("track-live", "line-gradient", grad);
    } catch {}
  }

  function startLiveAnim() {
    stopLiveAnim();
    const loop = () => {
      // speed
      animT = (animT + 0.004) % 1;
      setLiveGradient(animT);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function stopLiveAnim() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    // Live layer "ausblenden"
    try { map.setPaintProperty("track-live", "line-opacity", 0); } catch {}
  }

  /* -------------------------------------------------------
     MARKER (blinks green <-> orange)
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
     REFRESH
  ------------------------------------------------------- */
  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      // ensure layers exist
      injectTrackLayersIfNeeded();

      // update data
      const src = map.getSource("track");
      if (src) src.setData(track);

      // marker latest
      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createBlinkMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      metaEl.textContent = `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

      statusEl.textContent = "online";

      // start anim if enabled
      if (liveEnabled) {
        // make sure live visible
        try { map.setPaintProperty("track-live", "line-opacity", 0.95); } catch {}
        if (!rafId) startLiveAnim();
      } else {
        stopLiveAnim();
      }
    } catch (e) {
      statusEl.textContent = "Fehler";
      metaEl.textContent = "Daten fehlen? (data/track.geojson, data/latest.json)";
      console.warn(e);
    }
  }

  map.on("load", () => {
    // initial setup
    injectTrackLayersIfNeeded();
    applyBasemapTweaks("satellite");

    // 3D starts OFF by default (toggle it on)
    injectTerrainIfNeeded();

    refresh();
    setInterval(refresh, 60_000);
  });
})();