(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---------- Base maps (raster) ----------
  const BASEMAPS = {
    satellite: {
      id: "satellite",
      icon: "🛰️",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      ],
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
    },
    osm: {
      id: "osm",
      icon: "🗺️",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      attribution: "© OpenStreetMap contributors"
    }
  };

  let currentBasemapKey = "satellite"; // ✅ Standard

  const style = {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: BASEMAPS[currentBasemapKey].tiles,
        tileSize: 256,
        attribution: BASEMAPS[currentBasemapKey].attribution
      }
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap" }]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 11
  });

  // ---------- Controls ----------
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  // ---------- Utils ----------
  function fmtTs(ts) {
    try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
  }
  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }
  function formatKm(m) {
    if (typeof m !== "number") return "—";
    return (m / 1000).toFixed(m >= 10000 ? 0 : 1) + " km";
  }
  function formatMeters(m) {
    if (typeof m !== "number") return "—";
    return Math.round(m) + " hm";
  }
  function formatDuration(sec) {
    if (typeof sec !== "number") return "—";
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function getElevGain(p) {
    const a = p && typeof p.elev_gain_m === "number" ? p.elev_gain_m : null;
    const b = p && typeof p.total_elevation_gain_m === "number" ? p.total_elevation_gain_m : null;
    const c = p && typeof p.total_elevation_gain === "number" ? p.total_elevation_gain : null;
    return a ?? b ?? c ?? null;
  }

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
        for (const [x, y] of coords) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (minX === Infinity) return null;
      return [minX, minY, maxX, maxY];
    } catch { return null; }
  }

  // ---------- Mini stats in Features box ----------
  function findFeaturesListEl() {
    const byId = document.getElementById("features-list");
    if (byId) return byId;
    const uls = Array.from(document.querySelectorAll("ul"));
    return uls.length ? uls[0] : null;
  }

  function sumStats(track) {
    const feats = track?.features || [];
    let dist = 0, time = 0, elev = 0, elevHas = false;
    for (const f of feats) {
      const p = f?.properties || {};
      if (typeof p.distance_m === "number") dist += p.distance_m;
      if (typeof p.moving_time_s === "number") time += p.moving_time_s;
      const eg = getElevGain(p);
      if (typeof eg === "number") { elev += eg; elevHas = true; }
    }
    return { dist, time, elev: elevHas ? elev : null };
  }

  function upsertMiniStats(track) {
    const ul = findFeaturesListEl();
    if (!ul) return;
    ul.querySelectorAll('li[data-role="mini-stats"]').forEach(li => li.remove());

    const st = sumStats(track);

    const li1 = document.createElement("li");
    li1.dataset.role = "mini-stats";
    li1.textContent = `Gesamt: ${formatKm(st.dist)}`;

    const li2 = document.createElement("li");
    li2.dataset.role = "mini-stats";
    li2.textContent = `Zeit: ${formatDuration(st.time)}`;

    const li3 = document.createElement("li");
    li3.dataset.role = "mini-stats";
    li3.textContent = `Höhenmeter: ${st.elev == null ? "—" : formatMeters(st.elev)}`;

    ul.insertBefore(li3, ul.firstChild);
    ul.insertBefore(li2, ul.firstChild);
    ul.insertBefore(li1, ul.firstChild);
  }

  // ---------- Popup styling ----------
  function ensurePopupStyleOnce() {
    if (document.getElementById("pctPopupStyle")) return;
    const s = document.createElement("style");
    s.id = "pctPopupStyle";
    s.textContent = `
      .pct-popup .maplibregl-popup-content{
        background: rgba(16,18,22,.92);
        color: rgba(245,247,250,.96);
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 14px;
        box-shadow: 0 16px 40px rgba(0,0,0,.45);
        padding: 10px 12px;
        font: 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        min-width: 220px;
      }
      .pct-popup .maplibregl-popup-tip{ border-top-color: rgba(16,18,22,.92) !important; }
      .pct-popup .pct-title{ font-weight:700; margin-bottom:4px; }
      .pct-popup .pct-row{ display:flex; justify-content:space-between; gap:12px; }
      .pct-popup .pct-k{ opacity:.75; }
      .pct-popup .pct-v{ font-weight:600; }
    `;
    document.head.appendChild(s);
  }

  function buildPopupHtml(p) {
    const name = p.name || "Aktivität";
    const typ = p.type || "";
    const date = p.start_date ? fmtTs(p.start_date) : "—";
    const dist = typeof p.distance_m === "number" ? formatKm(p.distance_m) : "—";
    const time = typeof p.moving_time_s === "number" ? formatDuration(p.moving_time_s) : "—";
    const eg = getElevGain(p);
    const elev = typeof eg === "number" ? formatMeters(eg) : "—";

    return `
      <div class="pct-title">${name}${typ ? ` · ${typ}` : ""}</div>
      <div class="pct-row"><div class="pct-k">Datum</div><div class="pct-v">${date}</div></div>
      <div class="pct-row"><div class="pct-k">Distanz</div><div class="pct-v">${dist}</div></div>
      <div class="pct-row"><div class="pct-k">Zeit</div><div class="pct-v">${time}</div></div>
      <div class="pct-row"><div class="pct-k">Höhenmeter</div><div class="pct-v">${elev}</div></div>
    `;
  }

  // ---------- Blinking marker ----------
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

  // ---------- Basemap switching without losing tracks ----------
  function switchBasemap(key) {
    const src = map.getSource("basemap");
    if (!src) return;

    // Best case: update tiles in place
    if (typeof src.setTiles === "function") {
      src.setTiles(BASEMAPS[key].tiles);
      return;
    }

    // Fallback: re-create basemap source/layer only
    try {
      if (map.getLayer("basemap")) map.removeLayer("basemap");
      if (map.getSource("basemap")) map.removeSource("basemap");
      map.addSource("basemap", {
        type: "raster",
        tiles: BASEMAPS[key].tiles,
        tileSize: 256,
        attribution: BASEMAPS[key].attribution
      });

      // Insert below tracks (if present) so tracks stay on top
      const beforeId = map.getLayer("track-glow") ? "track-glow" : undefined;
      map.addLayer({ id: "basemap", type: "raster", source: "basemap" }, beforeId);
    } catch (e) {
      console.warn("Basemap switch fallback failed:", e);
    }
  }

  // ---------- Toggle as MapLibre Control (under zoom) ----------
  class BasemapToggleControl {
    onAdd(mapInstance) {
      this._map = mapInstance;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "pctBasemapToggle";
      btn.title = "Basemap wechseln";
      btn.textContent = BASEMAPS[currentBasemapKey].icon;

      btn.style.width = "40px";
      btn.style.height = "40px";
      btn.style.borderRadius = "10px";
      btn.style.border = "1px solid rgba(0,0,0,.18)";
      btn.style.background = "rgba(255,255,255,.92)";
      btn.style.backdropFilter = "blur(8px)";
      btn.style.color = "#111";
      btn.style.fontSize = "18px";
      btn.style.display = "grid";
      btn.style.placeItems = "center";
      btn.style.cursor = "pointer";
      btn.style.boxShadow = "0 10px 22px rgba(0,0,0,.18)";

      // Make it look like other controls (stackable)
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";
      container.style.marginTop = "8px"; // ✅ unter Zoom

      container.appendChild(btn);

      btn.addEventListener("click", () => {
        currentBasemapKey = (currentBasemapKey === "satellite") ? "osm" : "satellite";
        btn.textContent = BASEMAPS[currentBasemapKey].icon;
        switchBasemap(currentBasemapKey);
      });

      this._container = container;
      return container;
    }
    onRemove() {
      this._container?.parentNode?.removeChild(this._container);
      this._map = undefined;
    }
  }

  // ---------- Track layers + hover + popup ----------
  let hoveredId = null;
  let popup = null;

  function removePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";
      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      upsertMiniStats(track);

      if (!map.getSource("track")) {
        map.addSource("track", { type: "geojson", data: track, generateId: true });

        const colorExpr = [
          "case",
          ["==", ["%", ["to-number", ["get", "i"]], 2], 0], "#46f3ff",
          "#ff4bd8"
        ];

        const wGlow = ["case", ["boolean", ["feature-state", "hover"], false], 18, 12];
        const oGlow = ["case", ["boolean", ["feature-state", "hover"], false], 0.45, 0.30];
        const wMain = ["case", ["boolean", ["feature-state", "hover"], false], 7, 5];
        const oMain = ["case", ["boolean", ["feature-state", "hover"], false], 1.0, 0.92];

        map.addLayer({
          id: "track-glow",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
            "line-width": wGlow,
            "line-opacity": oGlow,
            "line-blur": 6
          }
        });

        map.addLayer({
          id: "track-main",
          type: "line",
          source: "track",
          paint: {
            "line-color": colorExpr,
            "line-width": wMain,
            "line-opacity": oMain
          }
        });

        map.addLayer({
          id: "track-highlight",
          type: "line",
          source: "track",
          paint: {
            "line-color": ["case", ["boolean", ["feature-state", "hover"], false], "rgba(255,255,255,0.95)", "rgba(255,255,255,0.65)"],
            "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 2.2, 1.6],
            "line-opacity": 0.65
          }
        });

        map.on("mousemove", "track-main", (e) => {
          if (!e.features?.length) return;
          const f = e.features[0];
          const id = f.id;
          map.getCanvas().style.cursor = "pointer";

          if (hoveredId !== null && hoveredId !== id) {
            map.setFeatureState({ source: "track", id: hoveredId }, { hover: false });
          }
          hoveredId = id;
          map.setFeatureState({ source: "track", id }, { hover: true });
        });

        map.on("mouseleave", "track-main", () => {
          map.getCanvas().style.cursor = "";
          if (hoveredId !== null) map.setFeatureState({ source: "track", id: hoveredId }, { hover: false });
          hoveredId = null;
        });

        ensurePopupStyleOnce();
        map.on("click", "track-main", (e) => {
          if (!e.features?.length) return;
          const p = e.features[0].properties || {};
          removePopup();
          popup = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: "320px",
            className: "pct-popup"
          })
            .setLngLat(e.lngLat)
            .setHTML(buildPopupHtml(p))
            .addTo(map);
        });

        // ✅ Toggle unter Zoom
        map.addControl(new BasemapToggleControl(), "top-right");
      } else {
        map.getSource("track").setData(track);
      }

      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createPulsingMarkerEl() }).setLngLat(lngLat).addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      metaEl.textContent = `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

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
      console.error(e);
    }
  }

  map.on("load", () => {
    refresh();
    setInterval(refresh, 60_000);
  });
})();