(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  // URLs (funktioniert auch unter /demo-tracker/ auf GitHub Pages)
  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---- Basemap tile URLs ----
  const SAT_URL  = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
  const OSM_URL  = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TOPO_URL = "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png";
  const DARK_URL = "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  // ---- 4 modes to cycle (satellite is default) ----
  const MODES = [
    { key: "sat",  layerId: "base-satellite", icon: "🛰️", title: "Satellite" },
    { key: "osm",  layerId: "base-osm",       icon: "🗺️", title: "OSM" },
    { key: "topo", layerId: "base-topo",      icon: "🗻", title: "Topo" },
    { key: "dark", layerId: "base-dark",      icon: "💡", title: "Dark" }
  ];
  let modeIndex = 0; // 0 = satellite

  // --- Style: Satellite as DEFAULT ---
  const style = {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [SAT_URL],
        tileSize: 256,
        attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and others"
      },
      osm: {
        type: "raster",
        tiles: [OSM_URL],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      },
      topo: {
        type: "raster",
        tiles: [TOPO_URL],
        tileSize: 256,
        attribution: "© OpenTopoMap (CC-BY-SA) © OpenStreetMap contributors"
      },
      dark: {
        type: "raster",
        tiles: [DARK_URL],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors © CARTO"
      }
    },
    layers: [
      { id: "base-satellite", type: "raster", source: "satellite", layout: { visibility: "visible" } },
      { id: "base-osm",       type: "raster", source: "osm",       layout: { visibility: "none" } },
      { id: "base-topo",      type: "raster", source: "topo",      layout: { visibility: "none" } },
      { id: "base-dark",      type: "raster", source: "dark",      layout: { visibility: "none" } }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 12
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  function fmtTs(ts) {
    try { return new Date(ts).toLocaleString(); }
    catch { return String(ts); }
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // --- Pulsierender Marker (grün ↔ orange) ---
  let marker;
  function createPulsingMarkerEl() {
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
    ring.style.left = "-11px";
    ring.style.top = "-11px";
    ring.style.width = "38px";
    ring.style.height = "38px";
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

  // --- BBox helper ---
  function geojsonBbox(geojson) {
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const feats = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
      for (const f of feats) {
        const g = f.type === "Feature" ? f.geometry : f;
        const coords =
          g.type === "LineString" ? g.coordinates :
          g.type === "MultiLineString" ? g.coordinates.flat() :
          g.type === "Point" ? [g.coordinates] : [];
        for (const [x, y] of coords) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      return (minX === Infinity) ? null : [minX, minY, maxX, maxY];
    } catch { return null; }
  }

  // --- Basemap apply helper ---
  function applyBasemapMode() {
    const active = MODES[modeIndex];

    // Hide all base layers
    for (const m of MODES) {
      map.setLayoutProperty(m.layerId, "visibility", "none");
    }
    // Show active
    map.setLayoutProperty(active.layerId, "visibility", "visible");

    // Dark mode tuning (optional)
    const isDark = active.key === "dark";
    if (map.getLayer("brighten-overlay")) {
      map.setLayoutProperty("brighten-overlay", "visibility", isDark ? "visible" : "none");
    }
    if (isDark) {
      try {
        map.setPaintProperty("base-dark", "raster-saturation", -0.15);
        map.setPaintProperty("base-dark", "raster-contrast", 0.18);
        map.setPaintProperty("base-dark", "raster-brightness-min", 0.06);
        map.setPaintProperty("base-dark", "raster-brightness-max", 0.98);
      } catch {}
    }
    return active;
  }

  // --- Icon-only toggle control (cycles 4 modes) ---
  function addBasemapToggle() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("aria-label", "Toggle basemap");
    btn.title = "Toggle basemap";

    btn.style.width = "38px";
    btn.style.height = "38px";
    btn.style.borderRadius = "12px";
    btn.style.border = "1px solid rgba(255,255,255,.18)";
    btn.style.background = "rgba(15,18,20,.55)";
    btn.style.backdropFilter = "blur(10px)";
    btn.style.cursor = "pointer";
    btn.style.display = "grid";
    btn.style.placeItems = "center";
    btn.style.boxShadow = "0 12px 26px rgba(0,0,0,.35)";
    btn.style.padding = "0";

    const icon = document.createElement("div");
    icon.style.fontSize = "18px";
    icon.style.lineHeight = "1";
    icon.textContent = MODES[modeIndex].icon;
    btn.appendChild(icon);

    const ctrl = document.createElement("div");
    ctrl.className = "maplibregl-ctrl maplibregl-ctrl-group";
    ctrl.style.border = "0";
    ctrl.style.background = "transparent";
    ctrl.style.boxShadow = "none";
    ctrl.appendChild(btn);

    map.addControl(
      {
        onAdd: () => ctrl,
        onRemove: () => ctrl.parentNode && ctrl.parentNode.removeChild(ctrl)
      },
      "top-right"
    );

    // keep title synced
    const syncBtnMeta = () => {
      const m = MODES[modeIndex];
      icon.textContent = m.icon;
      btn.title = `Basemap: ${m.title} (click to change)`;
    };
    syncBtnMeta();

    btn.addEventListener("click", () => {
      modeIndex = (modeIndex + 1) % MODES.length;
      applyBasemapMode();
      syncBtnMeta();
    });
  }

  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      if (!map.getSource("track")) {
        map.addSource("track", { type: "geojson", data: track });

        // brighten overlay for dark mode (hidden by default because sat is default)
        map.addLayer({
          id: "brighten-overlay",
          type: "background",
          layout: { visibility: "none" },
          paint: { "background-color": "rgba(255,255,255,0.16)" }
        });

        // Alternate colors per activity (properties.i)
        const colorExpr = [
          "case",
          ["==", ["%", ["to-number", ["get", "i"]], 2], 0], "#39e9ff",
          "#ff3fe0"
        ];

        // Glow + main + highlight
        map.addLayer({
          id: "track-glow",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
            "line-width": 14,
            "line-opacity": 0.30,
            "line-blur": 7
          }
        });

        map.addLayer({
          id: "track-main",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
            "line-width": 5.5,
            "line-opacity": 0.95
          }
        });

        map.addLayer({
          id: "track-highlight",
          type: "line",
          source: "track",
          paint: {
            "line-color": "rgba(255,255,255,0.75)",
            "line-width": 1.8,
            "line-opacity": 0.70
          }
        });

        // Toggle + ensure current mode (sat default)
        addBasemapToggle();
        applyBasemapMode();
      } else {
        map.getSource("track").setData(track);
      }

      // Marker
      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createPulsingMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      metaEl.textContent = `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

      // Fit bounds
      const bbox = geojsonBbox(track);
      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 800 });
      } else {
        map.easeTo({ center: lngLat, zoom: 13, duration: 800 });
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "Fehler (Daten fehlen?)";
      metaEl.textContent = "Lege data/track.geojson und data/latest.json an.";
    }
  }

  map.on("load", () => {
    refresh();
    setInterval(refresh, 60_000);
  });
})();
