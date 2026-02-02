(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  // URLs (funktioniert auch unter /demo-tracker/ auf GitHub Pages)
  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ------------------------------------------------------------
  // 1) Basemap: SATELLITE (Standard) – keine Toggles mehr
  // ------------------------------------------------------------
  // ESRI World Imagery (sehr verbreitet). Attribution ist wichtig.
  const style = {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      }
    },
    layers: [
      { id: "satellite", type: "raster", source: "satellite" }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    // Stuttgart als Default, damit du nicht "Weltkarte" siehst, falls Daten kurz fehlen
    center: [9.17, 48.78],
    zoom: 12
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  // ------------------------------------------------------------
  // 2) Dark Popup Styling (UI)
  // ------------------------------------------------------------
  function injectPopupCssOnce() {
    if (document.getElementById("pctPopupCss")) return;
    const s = document.createElement("style");
    s.id = "pctPopupCss";
    s.textContent = `
      .maplibregl-popup {
        z-index: 30;
      }
      .maplibregl-popup-content {
        background: rgba(14, 18, 26, 0.92);
        color: rgba(240,245,255,.95);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,.55);
        padding: 10px 12px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .maplibregl-popup-close-button {
        color: rgba(240,245,255,.75);
        font-size: 18px;
        padding: 6px 10px;
      }
      .maplibregl-popup-tip {
        border-top-color: rgba(14, 18, 26, 0.92) !important;
        border-bottom-color: rgba(14, 18, 26, 0.92) !important;
      }
      .pct-popup-title {
        font: 700 13px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        margin: 0 0 6px 0;
        letter-spacing: .2px;
      }
      .pct-popup-sub {
        font: 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        opacity: .82;
        margin: 0 0 8px 0;
      }
      .pct-popup-row {
        font: 12px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        display: flex;
        justify-content: space-between;
        gap: 12px;
        opacity: .95;
      }
      .pct-popup-row b {
        font-weight: 650;
        opacity: .95;
      }
    `;
    document.head.appendChild(s);
  }
  injectPopupCssOnce();

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function fmtDistance(m) {
    const km = (Number(m) || 0) / 1000;
    return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
  }

  function fmtDuration(sec) {
    sec = Math.max(0, Number(sec) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function fmtElev(m) {
    if (m === null || m === undefined) return "–";
    const v = Number(m);
    if (!Number.isFinite(v)) return "–";
    return `${Math.round(v)} m`;
  }

  async function loadJson(url) {
    // no-store damit GitHub Pages nicht cached
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // ------------------------------------------------------------
  // 3) Pulsierender Marker (grün ↔ orange)
  // ------------------------------------------------------------
  let marker;
  function createPulsingMarkerEl() {
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "999px";
    el.style.border = "2px solid rgba(232,238,245,.95)";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
    el.style.background = "#2bff88"; // Startfarbe

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

  // ------------------------------------------------------------
  // 4) Track Layer + Glow + Alternating Colors
  // ------------------------------------------------------------
  function ensureTrackLayers(trackData) {
    if (!map.getSource("track")) {
      map.addSource("track", { type: "geojson", data: trackData });

      // Alternating colors pro Aktivität via properties.i
      // (knallt auf Satellite)
      const colorExpr = [
        "case",
        ["==", ["%", ["to-number", ["get", "i"]], 2], 0], "#46f3ff", // cyan
        "#ff4bd8" // magenta
      ];

      // Glow (unter)
      map.addLayer({
        id: "track-glow",
        type: "line",
        source: "track",
        paint: {
          "line-color": colorExpr,
          "line-width": 14,
          "line-opacity": 0.32,
          "line-blur": 7
        }
      });

      // Hauptlinie
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

      // Highlight (weiß)
      map.addLayer({
        id: "track-highlight",
        type: "line",
        source: "track",
        paint: {
          "line-color": "rgba(255,255,255,0.75)",
          "line-width": 1.8,
          "line-opacity": 0.55
        }
      });

      bindTrackPopups(); // Click/Popup an die Layer hängen
    }
  }

  // ------------------------------------------------------------
  // 5) Popup on click (stabil)
  // ------------------------------------------------------------
  let trackPopup = null;

  function bindTrackPopups() {
    if (!map.getLayer("track-main")) return;

    map.on("mouseenter", "track-main", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "track-main", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("click", "track-main", (e) => {
      if (!e.features || !e.features.length) return;
      const f = e.features[0];
      const p = f.properties || {};

      const name = p.name || "Aktivität";
      const type = p.type || "";
      const start = p.start_date ? new Date(p.start_date).toLocaleString() : "–";
      const dist = fmtDistance(p.distance_m);
      const time = fmtDuration(p.moving_time_s);

      // Höhenmeter: wird angezeigt, wenn vorhanden
      const elev =
        (p.elevation_gain_m !== undefined ? p.elevation_gain_m :
        (p.total_elevation_gain !== undefined ? p.total_elevation_gain : null));

      const html = `
        <div>
          <div class="pct-popup-title">${name}</div>
          <div class="pct-popup-sub">${type ? `${type} · ` : ""}${start}</div>
          <div class="pct-popup-row"><span><b>Distanz</b></span><span>${dist}</span></div>
          <div class="pct-popup-row"><span><b>Zeit</b></span><span>${time}</span></div>
          <div class="pct-popup-row"><span><b>Höhenmeter</b></span><span>${fmtElev(elev)}</span></div>
        </div>
      `;

      if (trackPopup) trackPopup.remove();
      trackPopup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "300px",
        offset: 12
      })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });
  }

  // ------------------------------------------------------------
  // 6) BBox helper + Fit bounds (nur einmal beim ersten validen Track)
  // ------------------------------------------------------------
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

  let didFitOnce = false;

  // ------------------------------------------------------------
  // 7) Refresh loop (stabil, schnell)
  // ------------------------------------------------------------
  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      // Track layers/sources initial
      ensureTrackLayers(track);

      // Update track data
      if (map.getSource("track")) {
        map.getSource("track").setData(track);
      }

      // Marker / latest
      if (latest && typeof latest.lat === "number" && typeof latest.lon === "number") {
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
      } else {
        metaEl.textContent = "latest.json fehlt oder ist ungültig.";
      }

      // Fit bounds nur einmal, sobald Track wirklich vorhanden ist
      const bbox = geojsonBbox(track);
      if (bbox && !didFitOnce) {
        didFitOnce = true;
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], {
          padding: 40,
          duration: 800
        });
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "Fehler (Daten fehlen?)";
      metaEl.textContent = "Lege data/track.geojson und data/latest.json an.";
    }
  }

  map.on("load", () => {
    // Satellite ist bereits Standard-Style, keine Toggles nötig.
    refresh();
    setInterval(refresh, 60_000); // alle 60s
  });
})();