(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---------- Basemap sources ----------
  const CARTO_DARK = {
    type: "raster",
    tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
    tileSize: 256,
    attribution: "© OpenStreetMap contributors © CARTO"
  };

  const ESRI_SAT = {
    type: "raster",
    // NOTE: Esri tiles use {z}/{y}/{x}
    tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    tileSize: 256,
    attribution: "© Esri, Maxar, Earthstar Geographics"
  };

  // Initial style: start in "dark"
  const style = {
    version: 8,
    sources: {
      base: CARTO_DARK
    },
    layers: [
      { id: "base", type: "raster", source: "base" }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 11
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

  // ---------- Pulsing marker ----------
  let marker;
  function createPulsingMarkerEl() {
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "999px";
    el.style.border = "2px solid rgba(232,238,245,.95)";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
    el.style.background = "#2bff88";

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
    el.style.position = "relative";
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

  // ---------- BBox helper ----------
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

  // ---------- Basemap toggle (Satellite <-> Dark) ----------
  let mode = "dark"; // "dark" | "sat"

  function applyMode(newMode) {
    mode = newMode;

    // Switch raster tiles
    map.getSource("base").setTiles(mode === "sat" ? ESRI_SAT.tiles : CARTO_DARK.tiles);

    // (Optional) tweak raster appearance per mode
    try {
      if (mode === "sat") {
        // Satellite: slightly darken to make neon tracks pop
        map.setPaintProperty("base", "raster-saturation", 0.0);
        map.setPaintProperty("base", "raster-contrast", 0.10);
        map.setPaintProperty("base", "raster-brightness-min", 0.00);
        map.setPaintProperty("base", "raster-brightness-max", 0.95);
      } else {
        // Dark: cleaner + a bit brighter
        map.setPaintProperty("base", "raster-saturation", -0.2);
        map.setPaintProperty("base", "raster-contrast", 0.15);
        map.setPaintProperty("base", "raster-brightness-min", 0.05);
        map.setPaintProperty("base", "raster-brightness-max", 0.95);
      }
    } catch {}

    // Overlay logic:
    // - Dark mode: your "brighten overlay" (white transparent)
    // - Satellite mode: slight dark overlay (black transparent)
    if (map.getLayer("mode-overlay")) map.removeLayer("mode-overlay");

    map.addLayer({
      id: "mode-overlay",
      type: "background",
      paint: {
        "background-color": mode === "sat"
          ? "rgba(0,0,0,0.10)"     // subtle darken on satellite
          : "rgba(255,255,255,0.24)" // brighten on carto dark
      }
    }, "track-glow"); // insert below tracks when possible
  }

  function addToggleControl() {
    const ctrl = document.createElement("div");
    ctrl.className = "maplibregl-ctrl maplibregl-ctrl-group";
    ctrl.style.display = "flex";
    ctrl.style.flexDirection = "column";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Toggle basemap";
    btn.setAttribute("aria-label", "Toggle basemap");
    btn.style.fontWeight = "700";
    btn.style.padding = "8px 10px";
    btn.style.cursor = "pointer";
    btn.textContent = "Satellite";

    btn.addEventListener("click", () => {
      const next = (mode === "dark") ? "sat" : "dark";
      applyMode(next);
      btn.textContent = (mode === "dark") ? "Satellite" : "Dark";
    });

    ctrl.appendChild(btn);

    // Custom control wrapper
    const Custom = function () {};
    Custom.prototype.onAdd = function () {
      return ctrl;
    };
    Custom.prototype.onRemove = function () {
      ctrl.parentNode && ctrl.parentNode.removeChild(ctrl);
    };

    map.addControl(new Custom(), "top-right");
  }

  // ---------- main refresh ----------
  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      if (!map.getSource("track")) {
        map.addSource("track", { type: "geojson", data: track });

        // Alternating colors per activity (properties.i)
        const colorExpr = [
          "case",
          ["==", ["%", ["to-number", ["coalesce", ["get", "i"], 0]], 2], 0],
          "#46f3ff", // cyan
          "#ff4bd8"  // magenta
        ];

        // Glow layer
        map.addLayer({
          id: "track-glow",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
            "line-width": 12,
            "line-opacity": 0.28,
            "line-blur": 6
          }
        });

        // Main line
        map.addLayer({
          id: "track-main",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
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

        // Apply basemap mode & overlays after layers exist
        applyMode(mode);
        addToggleControl();

      } else {
        map.getSource("track").setData(track);
      }

      // Marker / latest
      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createPulsingMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      metaEl.textContent =
        `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

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
