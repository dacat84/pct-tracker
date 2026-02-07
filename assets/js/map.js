(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  // URLs (funktioniert auch unter /demo-tracker/ auf GitHub Pages)
  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---------- Helpers ----------
  function fmtDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function mToKm(m) { return (m / 1000); }
  function mToMi(m) { return (m / 1609.344); }
  function mToFt(m) { return (m * 3.280839895); }

  function fmtNum(n, digits = 1) {
    if (n == null || !isFinite(n)) return "—";
    return Number(n).toFixed(digits);
  }

  function fmtDistanceDual(meters) {
    if (meters == null || !isFinite(meters)) return "—";
    const km = mToKm(meters);
    const mi = mToMi(meters);
    return `${fmtNum(km, 1)} km / ${fmtNum(mi, 1)} mi`;
  }

  function fmtElevDual(meters) {
    if (meters == null || !isFinite(meters)) return "—";
    const ft = mToFt(meters);
    return `${fmtNum(meters, 0)} m / ${fmtNum(ft, 0)} ft`;
  }

  function fmtDuration(seconds) {
    if (seconds == null || !isFinite(seconds)) return "—";
    const s = Math.max(0, Math.floor(seconds));
    const days = Math.floor(s / 86400);
    const hrs = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);

    if (days > 0) {
      return `${days} Day${days === 1 ? "" : "s"} ${hrs} h ${mins} min`;
    }
    if (hrs > 0) return `${hrs} h ${mins} min`;
    return `${mins} min`;
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // Find “elevation gain” property (robust gegen verschiedene Keys)
  function getElevationMeters(props) {
    if (!props) return null;
    const keys = [
      "elevation_m",
      "elev_m",
      "elev_gain_m",
      "elevation_gain_m",
      "total_elev_m",
      "total_elevation_gain_m",
      "total_elevation_gain", // Strava typical (meters)
      "elev_gain",
      "elevation_gain",
    ];
    for (const k of keys) {
      const v = props[k];
      if (v != null && isFinite(v)) return Number(v);
    }
    return null;
  }

  function getDurationSeconds(props) {
    if (!props) return null;
    const keys = ["moving_time_s", "moving_time", "elapsed_time_s", "elapsed_time", "time_s", "time"];
    for (const k of keys) {
      const v = props[k];
      if (v != null && isFinite(v)) return Number(v);
    }
    return null;
  }

  function getDistanceMeters(props) {
    if (!props) return null;
    const keys = ["distance_m", "distance", "meters"];
    for (const k of keys) {
      const v = props[k];
      if (v != null && isFinite(v)) return Number(v);
    }
    return null;
  }

  // Minimal bbox without dependencies
  function geojsonBbox(geojson) {
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const feats = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
      for (const f of feats) {
        const g = f.type === "Feature" ? f.geometry : f;
        const coords =
          g.type === "LineString" ? g.coordinates :
          g.type === "MultiLineString" ? g.coordinates.flat() :
          g.type === "Point" ? [g.coordinates] :
          [];
        for (const c of coords) {
          const [x, y] = c;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (minX === Infinity) return null;
      return [minX, minY, maxX, maxY];
    } catch {
      return null;
    }
  }

  // ---------- Pulsing marker (grün ↔ orange) ----------
  let marker;
  function createPulsingMarkerEl() {
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "999px";
    el.style.border = "2px solid rgba(232,238,245,.95)";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
    el.style.background = "#2bff88";
    el.style.position = "relative";

    const ring = document.createElement("div");
    ring.style.position = "absolute";
    ring.style.left = "-10px";
    ring.style.top = "-10px";
    ring.style.width = "36px";
    ring.style.height = "36px";
    ring.style.borderRadius = "999px";
    ring.style.border = "2px solid rgba(43,255,136,.55)";
    ring.style.boxShadow = "0 0 22px rgba(43,255,136,.40)";
    ring.style.animation = "pctPulse 1.6s ease-out infinite";
    el.appendChild(ring);

    if (!document.getElementById("pctPulseStyle")) {
      const s = document.createElement("style");
      s.id = "pctPulseStyle";
      s.textContent = `
        @keyframes pctPulse {
          0%   { transform: scale(0.55); opacity: 0.85; }
          70%  { transform: scale(1.15); opacity: 0.20; }
          100% { transform: scale(1.25); opacity: 0.00; }
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
      ring.style.boxShadow = on ? "0 0 22px rgba(255,122,24,.40)" : "0 0 22px rgba(43,255,136,.40)";
    }, 700);

    return el;
  }

  // ---------- Basemap (Satellite default + OSM toggle) ----------
  // Satellite tiles (Esri/World Imagery-like in deinem Setup)
  const SAT_TILES = [
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
  ];

  // OSM Standard tiles
  const OSM_TILES = [
    "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
    "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
  ];

  const style = {
    version: 8,
    sources: {
      sat: {
        type: "raster",
        tiles: SAT_TILES,
        tileSize: 256,
        attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      },
      osm: {
        type: "raster",
        tiles: OSM_TILES,
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      // Satellite visible by default
      { id: "sat", type: "raster", source: "sat", layout: { visibility: "visible" } },
      // OSM hidden by default
      { id: "osm", type: "raster", source: "osm", layout: { visibility: "none" } }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 11
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  // Custom basemap toggle button under the existing zoom control (right side)
  function injectToggleCss() {
    if (document.getElementById("pctBasemapCss")) return;
    const s = document.createElement("style");
    s.id = "pctBasemapCss";
    s.textContent = `
      .pct-basemap-ctl {
        margin-top: 8px;
      }
      .pct-basemap-btn {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(14,18,22,.55);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 10px 24px rgba(0,0,0,.35);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .pct-basemap-btn:active { transform: translateY(1px); }
      .pct-basemap-icon {
        font-size: 20px;
        line-height: 1;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,.4));
      }
    `;
    document.head.appendChild(s);
  }

  class BasemapToggleControl {
    onAdd(map) {
      this._map = map;
      injectToggleCss();
      this._container = document.createElement("div");
      this._container.className = "maplibregl-ctrl maplibregl-ctrl-group pct-basemap-ctl";

      this._btn = document.createElement("button");
      this._btn.type = "button";
      this._btn.className = "pct-basemap-btn";
      this._btn.title = "Toggle basemap (Satellite/OSM)";

      this._icon = document.createElement("div");
      this._icon.className = "pct-basemap-icon";
      this._icon.textContent = "🛰️"; // Satellite icon
      this._btn.appendChild(this._icon);

      this._btn.addEventListener("click", () => {
        const satVis = map.getLayoutProperty("sat", "visibility") !== "none";
        if (satVis) {
          map.setLayoutProperty("sat", "visibility", "none");
          map.setLayoutProperty("osm", "visibility", "visible");
          this._icon.textContent = "🗺️"; // OSM icon
        } else {
          map.setLayoutProperty("osm", "visibility", "none");
          map.setLayoutProperty("sat", "visibility", "visible");
          this._icon.textContent = "🛰️";
        }
      });

      this._container.appendChild(this._btn);
      return this._container;
    }
    onRemove() {
      this._container.parentNode.removeChild(this._container);
      this._map = undefined;
    }
  }

  // Put toggle below nav control
  map.addControl(new BasemapToggleControl(), "top-right");

  // ---------- Popup styling ----------
  function injectPopupCss() {
    if (document.getElementById("pctPopupCss")) return;
    const s = document.createElement("style");
    s.id = "pctPopupCss";
    s.textContent = `
      .maplibregl-popup-content {
        background: rgba(14,18,22,.78) !important;
        color: rgba(240,245,255,.95) !important;
        border: 1px solid rgba(255,255,255,.12) !important;
        border-radius: 14px !important;
        box-shadow: 0 18px 40px rgba(0,0,0,.45) !important;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        padding: 12px 14px !important;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }
      .maplibregl-popup-close-button {
        color: rgba(240,245,255,.75) !important;
        font-size: 18px !important;
        padding: 6px 10px !important;
      }
      .pct-pop-title {
        font-weight: 700;
        font-size: 16px;
        margin-bottom: 6px;
      }
      .pct-pop-grid {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 2px 16px;
        font-size: 14px;
        opacity: .95;
      }
      .pct-pop-k { opacity: .78; }
      .pct-pop-v { font-variant-numeric: tabular-nums; text-align: right; }
    `;
    document.head.appendChild(s);
  }
  injectPopupCss();

  // ---------- Track layers (glow) + hover highlight ----------
  const colorExpr = [
    "case",
    ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
    "#46f3ff",  // cyan
    "#ff4bd8"   // magenta
  ];

  // Hover state styling uses feature-state hover=true
  const hoverColorExpr = [
    "case",
    ["boolean", ["feature-state", "hover"], false],
    "#ffffff",
    colorExpr
  ];

  // Keep reference for hover
  let hoveredId = null;

  // ---------- Stats box ----------
  // We try to find the left card that currently says "Features" and replace its content
  function getStatsCard() {
    const cards = Array.from(document.querySelectorAll(".card"));
    // Prefer a card that contains "Features" or "Statistics"
    return (
      cards.find(c => (c.textContent || "").includes("Features")) ||
      cards.find(c => (c.textContent || "").includes("Statistics")) ||
      cards[0] ||
      null
    );
  }

  function setStatsCard(totalMeters, totalSeconds, totalElevMeters) {
    const card = getStatsCard();
    if (!card) return;

    // Make it look like your existing style: heading + list
    const km = totalMeters != null ? mToKm(totalMeters) : null;
    const mi = totalMeters != null ? mToMi(totalMeters) : null;

    const elevM = totalElevMeters;
    const elevFt = elevM != null ? mToFt(elevM) : null;

    card.innerHTML = `
      <h3>Statistics</h3>
      <ul>
        <li>Total: ${fmtNum(km, 1)} km / ${fmtNum(mi, 1)} mi</li>
        <li>Time: ${fmtDuration(totalSeconds)}</li>
        <li>Elevation: ${fmtNum(elevM, 0)} m / ${fmtNum(elevFt, 0)} ft</li>
      </ul>
    `;
  }

  // ---------- Remove the “Tipp:” line (if it’s outside meta element) ----------
  function removeTipLine() {
    // Search within the status card/container first
    const rootCandidates = [
      metaEl?.parentElement,
      document.querySelector(".status"),
      document.querySelector("#statusCard"),
      document.body
    ].filter(Boolean);

    for (const root of rootCandidates) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null);
      let node;
      while ((node = walker.nextNode())) {
        const txt = (node.textContent || "").trim();
        if (txt.startsWith("Tipp:") || txt.includes("Tipp: Ersetze später")) {
          // If it's a paragraph/div dedicated to tip -> hide it
          node.style.display = "none";
          return;
        }
      }
    }

    // Fallback: if "Tipp:" is inside metaEl, we overwrite metaEl anyway.
  }

  // ---------- Popup ----------
  let popup;
  function showPopupForFeature(feature, lngLat) {
    const p = feature.properties || {};
    const type = (p.type || "Activity").toString(); // Hike/Run/Walk...
    const distM = getDistanceMeters(p);
    const durS = getDurationSeconds(p);
    const elevM = getElevationMeters(p);
    const date = p.start_date ? fmtDate(p.start_date) : "—";

    const html = `
      <div class="pct-pop-title">${type}</div>
      <div class="pct-pop-grid">
        <div class="pct-pop-k">Date</div><div class="pct-pop-v">${date}</div>
        <div class="pct-pop-k">Distance</div><div class="pct-pop-v">${fmtDistanceDual(distM)}</div>
        <div class="pct-pop-k">Time</div><div class="pct-pop-v">${fmtDuration(durS)}</div>
        <div class="pct-pop-k">Elevation</div><div class="pct-pop-v">${fmtElevDual(elevM)}</div>
      </div>
    `;

    if (!popup) {
      popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" });
    }
    popup.setLngLat(lngLat).setHTML(html).addTo(map);
  }

  // ---------- Refresh / Render ----------
  let firstFitDone = false;

  async function refresh() {
    try {
      statusEl.textContent = "updating…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      // Make sure features have stable ids for feature-state hover:
      // We assign a numeric id if missing.
      if (track && track.type === "FeatureCollection" && Array.isArray(track.features)) {
        track.features.forEach((f, idx) => {
          if (f.id == null) f.id = idx;
          if (!f.properties) f.properties = {};
          if (f.properties.i == null) f.properties.i = idx;
        });
      }

      // Determine newest activity feature (by start_date)
      let newestFeature = null;
      if (track?.features?.length) {
        newestFeature = [...track.features].sort((a, b) => {
          const da = (a.properties?.start_date || "");
          const db = (b.properties?.start_date || "");
          return da.localeCompare(db);
        })[track.features.length - 1];
      }

      // Stats: totals over all features
      let totalDistM = 0;
      let totalDurS = 0;
      let totalElevM = 0;
      let elevCount = 0;

      for (const f of (track.features || [])) {
        const p = f.properties || {};
        const d = getDistanceMeters(p);
        const t = getDurationSeconds(p);
        const e = getElevationMeters(p);
        if (d != null) totalDistM += d;
        if (t != null) totalDurS += t;
        if (e != null) { totalElevM += e; elevCount++; }
      }

      setStatsCard(totalDistM, totalDurS, elevCount ? totalElevM : null);

      // Track source/layers
      if (!map.getSource("track")) {
        map.addSource("track", { type: "geojson", data: track });

        // Glow under
        map.addLayer({
          id: "track-glow",
          type: "line",
          source: "track",
          paint: {
            "line-color": hoverColorExpr,
            "line-width": 12,
            "line-opacity": 0.28,
            "line-blur": 6
          }
        });

        // Main
        map.addLayer({
          id: "track-main",
          type: "line",
          source: "track",
          paint: {
            "line-color": hoverColorExpr,
            "line-width": 5,
            "line-opacity": 0.92
          }
        });

        // Highlight
        map.addLayer({
          id: "track-highlight",
          type: "line",
          source: "track",
          paint: {
            "line-color": "rgba(255,255,255,0.65)",
            "line-width": 1.6,
            "line-opacity": 0.55
          }
        });

        // Hover interactions
        map.on("mousemove", "track-main", (e) => {
          map.getCanvas().style.cursor = "pointer";
          if (!e.features || !e.features.length) return;
          const f = e.features[0];
          if (hoveredId !== null && hoveredId !== f.id) {
            map.setFeatureState({ source: "track", id: hoveredId }, { hover: false });
          }
          hoveredId = f.id;
          map.setFeatureState({ source: "track", id: hoveredId }, { hover: true });
        });

        map.on("mouseleave", "track-main", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredId !== null) {
            map.setFeatureState({ source: "track", id: hoveredId }, { hover: false });
          }
          hoveredId = null;
        });

        // Click popup
        map.on("click", "track-main", (e) => {
          if (!e.features || !e.features.length) return;
          const f = e.features[0];
          const lngLat = e.lngLat;
          showPopupForFeature(f, lngLat);
        });

      } else {
        map.getSource("track").setData(track);
      }

      // Marker / latest point
      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createPulsingMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      // Status box: "Last updated" + latest activity (no Tipp)
      // If tip is separate element in DOM, hide it:
      removeTipLine();

      // Latest activity summary from newestFeature (best) fallback to latest.json only
      let latestSummary = "";
      if (newestFeature?.properties) {
        const p = newestFeature.properties;
        const type = (p.type || "Activity").toString();
        const distM = getDistanceMeters(p);
        const durS = getDurationSeconds(p);
        latestSummary = `${type}: ${fmtDistanceDual(distM)} · ${fmtDuration(durS)}`;
      } else {
        latestSummary = "Latest activity: —";
      }

      // IMPORTANT: overwrite whole meta block so Tipp is gone even if it was inside.
      metaEl.textContent =
        `Last updated: ${fmtDate(latest.ts)} · Lat/Lon: ${Number(latest.lat).toFixed(5)}, ${Number(latest.lon).toFixed(5)}\n` +
        `${latestSummary}`;

      // Fit bounds: only first time (so user can pan/zoom without constant snapping)
      if (!firstFitDone) {
        const bbox = geojsonBbox(track);
        if (bbox) {
          map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 800 });
          firstFitDone = true;
        } else {
          map.easeTo({ center: lngLat, zoom: 13, duration: 800 });
          firstFitDone = true;
        }
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "error (missing data?)";
      metaEl.textContent = "Create data/track.geojson and data/latest.json.";
    }
  }

  map.on("load", () => {
    refresh();
    setInterval(refresh, 60_000);
  });
})();