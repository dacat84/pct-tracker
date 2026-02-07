(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");
  const statusExtraEl = document.getElementById("status-extra");
  const statsListEl = document.getElementById("statsList");
  const insightsListEl = document.getElementById("insightsList");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---------- Basemaps (Satellite default + OSM toggle) ----------
  const style = {
    version: 8,
    sources: {
      sat: {
        type: "raster",
        tiles: [
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        attribution:
          "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      },
      osm: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors"
      }
    },
    layers: [
      { id: "basemap-sat", type: "raster", source: "sat" }, // visible by default
      { id: "basemap-osm", type: "raster", source: "osm", layout: { visibility: "none" } }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 11
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  // ---------- formatting helpers ----------
  function fmtDate(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function mToFt(m) { return m * 3.28084; }
  function kmToMi(km) { return km * 0.621371; }

  function fmtDistanceBoth(meters) {
    const km = (Number(meters || 0)) / 1000;
    const mi = kmToMi(km);
    return `${km.toFixed(1)} km / ${mi.toFixed(1)} mi`;
  }

  function fmtElevationBoth(meters) {
    if (meters == null || !isFinite(meters)) return "—";
    const ft = mToFt(meters);
    const mStr = Math.round(meters).toLocaleString();
    const ftStr = Math.round(ft).toLocaleString();
    return `${mStr} m / ${ftStr} ft`;
  }

  function fmtDuration(sec) {
    sec = Math.max(0, Number(sec || 0));
    const days = Math.floor(sec / 86400);
    sec -= days * 86400;
    const hours = Math.floor(sec / 3600);
    sec -= hours * 3600;
    const mins = Math.floor(sec / 60);

    if (days > 0) return `${days} Day ${hours} h ${mins} min`;
    if (hours > 0) return `${hours} h ${mins} min`;
    return `${mins} min`;
  }

  function fmtSpeedBoth(mps) {
    if (!isFinite(mps) || mps <= 0) return "—";
    const kmh = mps * 3.6;
    const mph = kmToMi(kmh);
    return `${kmh.toFixed(1)} km/h / ${mph.toFixed(1)} mi/h`;
  }

  function safeNum(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // ---------- Pulsing marker (green <-> orange) ----------
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

  // ---------- Basemap toggle (no setStyle -> tracks stay!) ----------
  function addBasemapToggle() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Toggle basemap";
    btn.setAttribute("aria-label", "Toggle basemap");

    btn.style.width = "44px";
    btn.style.height = "34px";
    btn.style.borderRadius = "10px";
    btn.style.border = "1px solid rgba(255,255,255,.18)";
    btn.style.background = "rgba(18,22,28,.55)";
    btn.style.backdropFilter = "blur(10px)";
    btn.style.color = "rgba(245,248,255,.92)";
    btn.style.cursor = "pointer";
    btn.style.display = "grid";
    btn.style.placeItems = "center";
    btn.style.boxShadow = "0 10px 22px rgba(0,0,0,.35)";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "700";
    btn.style.letterSpacing = ".6px";

    // Satellite is default -> show what you'll switch TO on click:
    let showingSat = true;
    btn.textContent = "OSM";

    btn.addEventListener("click", () => {
      showingSat = !showingSat;
      map.setLayoutProperty("basemap-sat", "visibility", showingSat ? "visible" : "none");
      map.setLayoutProperty("basemap-osm", "visibility", showingSat ? "none" : "visible");
      btn.textContent = showingSat ? "OSM" : "SAT";
    });

    const ctrl = {
      onAdd() {
        const container = document.createElement("div");
        container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        container.style.marginTop = "8px"; // below zoom control
        container.appendChild(btn);
        return container;
      },
      onRemove() {}
    };

    map.addControl(ctrl, "top-right");
  }

  // ---------- GeoJSON bbox helper ----------
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

  // ---------- Track layers + hover highlight + popup ----------
  let hoveredId = null;
  let popup;

  function ensureTrackIds(track) {
    if (!track || !Array.isArray(track.features)) return track;
    for (const f of track.features) {
      if (f && f.type === "Feature") {
        const sid = f.properties?.strava_id;
        if (sid != null) f.id = sid; // needed for feature-state hover
      }
    }
    return track;
  }

  function addTrackLayers(track) {
    map.addSource("track", { type: "geojson", data: track });

    const colorExpr = [
      "case",
      ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
      "#46f3ff",
      "#ff4bd8"
    ];
    const hoverBoost = ["case", ["boolean", ["feature-state", "hover"], false], 1, 0];

    map.addLayer({
      id: "track-glow",
      type: "line",
      source: "track",
      paint: {
        "line-color": colorExpr,
        "line-width": ["+", 12, ["*", 4, hoverBoost]],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.42, 0.26],
        "line-blur": ["+", 6, ["*", 2, hoverBoost]]
      }
    });

    map.addLayer({
      id: "track-main",
      type: "line",
      source: "track",
      paint: {
        "line-color": colorExpr,
        "line-width": ["+", 5, ["*", 2.2, hoverBoost]],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1.0, 0.92]
      }
    });

    map.addLayer({
      id: "track-highlight",
      type: "line",
      source: "track",
      paint: {
        "line-color": "rgba(255,255,255,0.65)",
        "line-width": ["+", 1.6, ["*", 0.9, hoverBoost]],
        "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.75, 0.55]
      }
    });

    map.on("mousemove", "track-main", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features?.[0];
      if (!f || f.id == null) return;

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

    map.on("click", "track-main", (e) => {
      const f = e.features?.[0];
      if (!f) return;

      const p = f.properties || {};
      const type = (p.type || "Activity").toString();

      const dateStr = fmtDate(p.start_date);
      const distStr = fmtDistanceBoth(safeNum(p.distance_m));
      const timeStr = fmtDuration(safeNum(p.moving_time_s));
      const elevGain = Number(p.elevation_gain_m);
      const elevStr = fmtElevationBoth(isFinite(elevGain) ? elevGain : null);

      const container = document.createElement("div");
      container.style.minWidth = "260px";

      const h = document.createElement("div");
      h.style.fontWeight = "700";
      h.style.fontSize = "16px";
      h.style.marginBottom = "6px";
      h.textContent = type; // only "Hike", no custom title
      container.appendChild(h);

      const rows = document.createElement("div");
      rows.style.display = "grid";
      rows.style.gridTemplateColumns = "90px 1fr";
      rows.style.rowGap = "4px";
      rows.style.columnGap = "10px";
      rows.style.fontSize = "13px";

      const addRow = (k, v) => {
        const a = document.createElement("div");
        a.style.opacity = "0.85";
        a.textContent = k;
        const b = document.createElement("div");
        b.style.textAlign = "right";
        b.style.fontWeight = "600";
        b.textContent = v;
        rows.appendChild(a);
        rows.appendChild(b);
      };

      addRow("Date", dateStr);
      addRow("Distance", distStr);
      addRow("Time", timeStr);
      addRow("Elevation", elevStr);

      container.appendChild(rows);

      if (popup) popup.remove();
      popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        maxWidth: "320px",
        className: "pct-popup"
      })
        .setLngLat(e.lngLat)
        .setDOMContent(container)
        .addTo(map);

      if (!document.getElementById("pctPopupStyle")) {
        const s = document.createElement("style");
        s.id = "pctPopupStyle";
        s.textContent = `
          .pct-popup .maplibregl-popup-content{
            background: rgba(18,22,28,.85);
            backdrop-filter: blur(14px);
            border: 1px solid rgba(255,255,255,.14);
            border-radius: 14px;
            color: rgba(245,248,255,.95);
            box-shadow: 0 20px 50px rgba(0,0,0,.45);
            padding: 12px 14px 12px 14px;
          }
          .pct-popup .maplibregl-popup-close-button{
            color: rgba(200,210,225,.9);
            font-size: 18px;
            padding: 6px 8px;
          }
          .pct-popup .maplibregl-popup-tip{
            border-top-color: rgba(18,22,28,.85) !important;
          }
        `;
        document.head.appendChild(s);
      }
    });
  }

  // ---------- build Statistics & Insights ----------
  function clearList(el) {
    if (!el) return;
    el.innerHTML = "";
  }

  function addLi(el, html) {
    const li = document.createElement("li");
    li.innerHTML = html;
    el.appendChild(li);
  }

  function isoDay(ts) {
    try {
      return (new Date(ts)).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  function computeSummary(track) {
    const feats = Array.isArray(track?.features) ? track.features : [];
    const activities = feats.filter(f => f && f.type === "Feature" && f.geometry && f.geometry.type === "LineString");

    let totalDistM = 0;
    let totalTimeS = 0;
    let totalElevGainM = 0;

    let firstDate = null;
    let lastDate = null;

    const activeDaySet = new Set();

    for (const f of activities) {
      const p = f.properties || {};
      totalDistM += safeNum(p.distance_m);
      totalTimeS += safeNum(p.moving_time_s);

      const eg = Number(p.elevation_gain_m);
      if (isFinite(eg)) totalElevGainM += eg;

      const sd = (p.start_date || "").toString();
      if (sd) {
        if (!firstDate || sd < firstDate) firstDate = sd;
        if (!lastDate || sd > lastDate) lastDate = sd;
        activeDaySet.add(isoDay(sd));
      }
    }

    const count = activities.length;
    const avgDistM = count ? totalDistM / count : 0;
    const avgSpeedMps = totalTimeS > 0 ? (totalDistM / totalTimeS) : 0;

    let restDays = 0;
    if (firstDate && lastDate) {
      const a = new Date(firstDate);
      const b = new Date(lastDate);
      const spanDays = Math.max(0, Math.round((b - a) / 86400000)) + 1;
      restDays = Math.max(0, spanDays - activeDaySet.size);
    }

    return {
      count,
      totalDistM,
      totalTimeS,
      totalElevGainM,
      avgDistM,
      avgSpeedMps,
      firstDate,
      lastDate,
      activeDays: activeDaySet.size,
      restDays
    };
  }

  function renderStatsAndInsights(summary) {
    if (!statsListEl || !insightsListEl) return;

    clearList(statsListEl);
    clearList(insightsListEl);

    // --- Statistics (order requested) ---
    addLi(statsListEl, `<b>Total Distance:</b> ${fmtDistanceBoth(summary.totalDistM)}`);
    addLi(statsListEl, `<b>Total Elevation:</b> ${fmtElevationBoth(summary.totalElevGainM)}`);
    addLi(statsListEl, `<b>Total Time:</b> ${fmtDuration(summary.totalTimeS)} <span class="muted">· ${summary.count} activities</span>`);
    addLi(statsListEl, `<b>Avg Distance / Activity:</b> ${fmtDistanceBoth(summary.avgDistM)}`);
    addLi(statsListEl, `<b>Avg Speed:</b> ${fmtSpeedBoth(summary.avgSpeedMps)}`);

    // --- Insights: Progress + Timeline only ---
    const PCT_MI = 2650.0;
    const PCT_KM = 4265.0;

    const completedKm = summary.totalDistM / 1000;
    const completedMi = kmToMi(completedKm);

    const remainingKm = Math.max(0, PCT_KM - completedKm);
    const remainingMi = Math.max(0, PCT_MI - completedMi);

    const pct = PCT_MI > 0 ? (completedMi / PCT_MI) : 0;
    const pctStr = (pct * 100).toFixed(1) + "%";
    const barPct = Math.max(0, Math.min(100, pct * 100));

    addLi(insightsListEl, `<b>Progress</b>`);
    addLi(
      insightsListEl,
      `PCT completed: ${completedKm.toFixed(1)} km / ${completedMi.toFixed(1)} mi of ${PCT_KM.toFixed(0)} km / ${PCT_MI.toFixed(0)} mi (${pctStr})`
    );

    addLi(insightsListEl, `
      <div style="margin:8px 0 6px 0; height:10px; border-radius:999px; background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.10); overflow:hidden;">
        <div style="height:100%; width:${barPct}%; background: linear-gradient(90deg, rgba(70,243,255,.95), rgba(255,75,216,.95));"></div>
      </div>
    `);

    addLi(insightsListEl, `Remaining: ${remainingKm.toFixed(1)} km / ${remainingMi.toFixed(1)} mi`);

    addLi(insightsListEl, `<br><b>Timeline</b>`);
    addLi(insightsListEl, `First activity: ${summary.firstDate ? fmtDate(summary.firstDate) : "—"}`);
    addLi(insightsListEl, `Last activity: ${summary.lastDate ? fmtDate(summary.lastDate) : "—"}`);
    addLi(insightsListEl, `Days: ${summary.activeDays} active days · ${summary.restDays} rest days`);
  }

  // ---------- status header (two lines) ----------
  function renderStatus(latest, newestFeature, summary) {
    const lat = Number(latest.lat);
    const lon = Number(latest.lon);

    const line1 = `Last updated: ${fmtDate(latest.ts)} · Lat/Lon: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

    let line2 = "";
    if (newestFeature?.properties) {
      const p = newestFeature.properties;
      const type = (p.type || "Activity").toString();
      line2 = `${type}: ${fmtDistanceBoth(safeNum(p.distance_m))} · ${fmtDuration(safeNum(p.moving_time_s))}`;
    }

    // use innerHTML so <br> works
    metaEl.innerHTML = `${line1}${line2 ? "<br>" + line2 : ""}`;

    // helper text
    if (statusExtraEl) {
      statusExtraEl.textContent = "Tap a track to see details. Hover highlights on desktop.";
    }
  }

  // ---------- Find newest activity feature ----------
  function findNewestFeature(track) {
    let newest = null;
    const feats = Array.isArray(track?.features) ? track.features : [];
    for (const f of feats) {
      const sd = f?.properties?.start_date || "";
      if (!newest || sd > (newest.properties?.start_date || "")) newest = f;
    }
    return newest;
  }

  async function refresh() {
    try {
      statusEl.textContent = "loading…";

      const [trackRaw, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);
      const track = ensureTrackIds(trackRaw);

      if (!map.getSource("track")) addTrackLayers(track);
      else map.getSource("track").setData(track);

      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createPulsingMarkerEl() }).setLngLat(lngLat).addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      const newest = findNewestFeature(track);
      const summary = computeSummary(track);

      renderStatus(latest, newest, summary);
      renderStatsAndInsights(summary);

      const bbox = geojsonBbox(track);
      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 800 });
      } else {
        map.easeTo({ center: lngLat, zoom: 13, duration: 800 });
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "error";
      if (metaEl) metaEl.textContent = "Create data/track.geojson and data/latest.json.";
      if (statusExtraEl) statusExtraEl.textContent = "";
      if (statsListEl) statsListEl.innerHTML = "";
      if (insightsListEl) insightsListEl.innerHTML = "";
    }
  }

  map.on("load", () => {
    addBasemapToggle();
    refresh();
    setInterval(refresh, 60_000);
  });
})();