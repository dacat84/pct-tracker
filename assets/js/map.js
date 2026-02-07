(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  // URLs (funktioniert unter GitHub Pages /demo-tracker/ etc.)
  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  // ---------- Helpers ----------
  const M_TO_KM = 1 / 1000;
  const M_TO_MI = 1 / 1609.344;
  const M_TO_FT = 3.280839895;

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return String(ts);
    }
  }

  function fmtNum(n, digits = 1) {
    if (!isFinite(n)) return "—";
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function fmtInt(n) {
    if (!isFinite(n)) return "—";
    return Math.round(n).toLocaleString();
  }

  function fmtDuration(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "—";
    const s = Math.round(seconds);

    const days = Math.floor(s / 86400);
    const rem1 = s % 86400;
    const hours = Math.floor(rem1 / 3600);
    const rem2 = rem1 % 3600;
    const mins = Math.floor(rem2 / 60);

    // Example: "1 Day 10 h 29 min" or "6 h 59 min"
    const parts = [];
    if (days > 0) parts.push(`${days} Day${days === 1 ? "" : "s"}`);
    if (hours > 0 || days > 0) parts.push(`${hours} h`);
    parts.push(`${mins} min`);
    return parts.join(" ");
  }

  function fmtDistanceBoth(meters) {
    const km = meters * M_TO_KM;
    const mi = meters * M_TO_MI;
    return `${fmtNum(km, 1)} km / ${fmtNum(mi, 1)} mi`;
  }

  function fmtElevationBoth(meters) {
    if (!isFinite(meters)) return "—";
    const ft = meters * M_TO_FT;
    return `${fmtInt(meters)} m / ${fmtInt(ft)} ft`;
  }

  function pickElevationMeters(props) {
    // support different property names (depends on your strava_sync.py)
    const keys = [
      "elevation_m",
      "elev_m",
      "elev_gain_m",
      "elevation_gain_m",
      "total_elevation_gain_m",
      "total_elevation_gain",
      "elevation",
      "elev"
    ];
    for (const k of keys) {
      const v = props?.[k];
      if (typeof v === "number" && isFinite(v)) return v;
    }
    return NaN;
  }

  function pickDistanceMeters(props) {
    const v = props?.distance_m;
    if (typeof v === "number" && isFinite(v)) return v;
    // fallback keys
    const keys = ["distance", "distanceMeters", "distance_meters"];
    for (const k of keys) {
      const x = props?.[k];
      if (typeof x === "number" && isFinite(x)) return x;
    }
    return NaN;
  }

  function pickMovingTimeSeconds(props) {
    const v = props?.moving_time_s;
    if (typeof v === "number" && isFinite(v)) return v;
    const keys = ["moving_time", "elapsed_time", "time_s", "timeSeconds"];
    for (const k of keys) {
      const x = props?.[k];
      if (typeof x === "number" && isFinite(x)) return x;
    }
    return NaN;
  }

  function pickType(props) {
    const t = props?.type || props?.activity_type || "";
    return String(t || "Activity");
  }

  function isoDay(ts) {
    // "2026-02-02T07:00:00Z" -> "2026-02-02"
    if (!ts) return "";
    const s = String(ts);
    const idx = s.indexOf("T");
    return idx > 0 ? s.slice(0, idx) : s.slice(0, 10);
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  // ---------- DOM targets (robust selection) ----------
  function findCardByHeadingText(texts) {
    const cards = Array.from(document.querySelectorAll("section, .card, .panel, .box, .glass, div"));
    const wanted = texts.map(t => t.toLowerCase());
    for (const el of cards) {
      const h = el.querySelector("h1,h2,h3,h4");
      if (!h) continue;
      const ht = (h.textContent || "").trim().toLowerCase();
      if (wanted.includes(ht)) return el;
    }
    return null;
  }

  function ensureList(card) {
    if (!card) return null;
    let ul = card.querySelector("ul");
    if (!ul) {
      ul = document.createElement("ul");
      card.appendChild(ul);
    }
    return ul;
  }

  function setHeading(card, newTitle) {
    if (!card) return;
    const h = card.querySelector("h1,h2,h3,h4");
    if (h) h.textContent = newTitle;
  }

  const featuresCard = findCardByHeadingText(["Features", "Statistics"]);
  const stepsCard = findCardByHeadingText(["Nächste Schritte", "Next Steps", "Insights"]);

  // ---------- Marker (blink green/orange) ----------
  let marker;
  function createBlinkMarkerEl() {
    const el = document.createElement("div");
    el.style.width = "16px";
    el.style.height = "16px";
    el.style.borderRadius = "999px";
    el.style.border = "2px solid rgba(232,238,245,.95)";
    el.style.boxShadow = "0 10px 26px rgba(0,0,0,.45)";
    el.style.background = "#2bff88";

    const ring = document.createElement("div");
    ring.style.position = "absolute";
    ring.style.left = "-12px";
    ring.style.top = "-12px";
    ring.style.width = "40px";
    ring.style.height = "40px";
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
        /* Popup polish (MapLibre default uses .maplibregl-popup...) */
        .maplibregl-popup-content{
          background: rgba(20,22,26,0.92) !important;
          color: rgba(240,245,255,0.92) !important;
          border: 1px solid rgba(255,255,255,0.10);
          box-shadow: 0 18px 50px rgba(0,0,0,0.45);
          border-radius: 14px !important;
          padding: 12px 14px !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .maplibregl-popup-close-button{
          color: rgba(160,185,255,0.9) !important;
          font-size: 18px !important;
          padding: 8px 10px !important;
        }
        .pctPopupTitle{
          font-weight: 700;
          font-size: 16px;
          margin: 0 0 6px 0;
          letter-spacing: .2px;
        }
        .pctPopupGrid{
          display: grid;
          grid-template-columns: 86px 1fr;
          gap: 4px 10px;
          font-size: 14px;
          line-height: 1.25;
        }
        .pctPopupKey{ color: rgba(230,240,255,0.70); }
        .pctPopupVal{ text-align: right; font-variant-numeric: tabular-nums; }
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

  // ---------- Basemap (Satellite default + OSM toggle without re-style) ----------
  const style = {
    version: 8,
    sources: {
      // Satellite (Esri World Imagery)
      sat: {
        type: "raster",
        tiles: [
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        ],
        tileSize: 256,
        attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
      },
      // OSM standard
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
      { id: "basemap-sat", type: "raster", source: "sat", layout: { visibility: "visible" } },
      { id: "basemap-osm", type: "raster", source: "osm", layout: { visibility: "none" } }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [9.17, 48.78],
    zoom: 11
  });

  // keep existing nav control
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  // Custom basemap toggle button placed under nav control
  class BasemapToggleControl {
    onAdd(mapInstance) {
      this.map = mapInstance;
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "Toggle basemap (Satellite / OSM)";
      btn.style.width = "36px";
      btn.style.height = "36px";
      btn.style.fontSize = "18px";
      btn.style.display = "grid";
      btn.style.placeItems = "center";
      btn.style.userSelect = "none";

      // Start: Satellite shown => show OSM icon as “next”
      let showing = "sat"; // sat | osm
      btn.textContent = "🗺️";

      btn.onclick = () => {
        if (showing === "sat") {
          // show OSM
          mapInstance.setLayoutProperty("basemap-sat", "visibility", "none");
          mapInstance.setLayoutProperty("basemap-osm", "visibility", "visible");
          showing = "osm";
          btn.textContent = "🛰️";
        } else {
          // show SAT
          mapInstance.setLayoutProperty("basemap-osm", "visibility", "none");
          mapInstance.setLayoutProperty("basemap-sat", "visibility", "visible");
          showing = "sat";
          btn.textContent = "🗺️";
        }
      };

      container.appendChild(btn);
      this.container = container;
      return container;
    }
    onRemove() {
      this.container?.parentNode?.removeChild(this.container);
      this.map = undefined;
    }
  }

  map.addControl(new BasemapToggleControl(), "top-right");

  // ---------- Track layers + hover + popup ----------
  let hoveredId = null;

  function makeColorExpr() {
    // alternating colors by properties.i (set in your strava_sync.py)
    return [
      "case",
      ["==", ["%", ["to-number", ["get", "i"]], 2], 0], "#46f3ff", // cyan
      "#ff4bd8" // magenta
    ];
  }

  function setUpTrackLayers(track) {
    // Use promoteId so feature-state hover works reliably
    map.addSource("track", { type: "geojson", data: track, promoteId: "strava_id" });

    const colorExpr = makeColorExpr();

    // Glow
    map.addLayer({
      id: "track-glow",
      type: "line",
      source: "track",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "rgba(255,255,255,0.95)",
          colorExpr
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          16,
          12
        ],
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.38,
          0.28
        ],
        "line-blur": 7
      }
    });

    // Main
    map.addLayer({
      id: "track-main",
      type: "line",
      source: "track",
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          "rgba(255,255,255,0.98)",
          colorExpr
        ],
        "line-width": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          7,
          5
        ],
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          1.0,
          0.92
        ]
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
        "line-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.85,
          0.55
        ]
      }
    });

    // Hover highlight
    map.on("mousemove", "track-main", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const f = e.features && e.features[0];
      if (!f) return;

      const id = f.properties?.strava_id;
      if (!id) return;

      if (hoveredId !== null && hoveredId !== id) {
        try { map.setFeatureState({ source: "track", id: hoveredId }, { hover: false }); } catch {}
      }
      hoveredId = id;
      try { map.setFeatureState({ source: "track", id }, { hover: true }); } catch {}
    });

    map.on("mouseleave", "track-main", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredId !== null) {
        try { map.setFeatureState({ source: "track", id: hoveredId }, { hover: false }); } catch {}
      }
      hoveredId = null;
    });

    // Popup on click
    map.on("click", "track-main", (e) => {
      const f = e.features && e.features[0];
      if (!f) return;

      const props = f.properties || {};
      const type = pickType(props);

      const distM = pickDistanceMeters(props);
      const timeS = pickMovingTimeSeconds(props);
      const elevM = pickElevationMeters(props);

      const date = props.start_date ? fmtTs(props.start_date) : "—";

      const html = `
        <div class="pctPopupTitle">${type}</div>
        <div class="pctPopupGrid">
          <div class="pctPopupKey">Date</div><div class="pctPopupVal">${date}</div>
          <div class="pctPopupKey">Distance</div><div class="pctPopupVal">${fmtDistanceBoth(distM)}</div>
          <div class="pctPopupKey">Time</div><div class="pctPopupVal">${fmtDuration(timeS)}</div>
          <div class="pctPopupKey">Elevation</div><div class="pctPopupVal">${fmtElevationBoth(elevM)}</div>
        </div>
      `;

      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });
  }

  // ---------- bbox ----------
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

  // ---------- Statistics + Insights rendering ----------
  function renderStatistics(track) {
    const feats = Array.isArray(track?.features) ? track.features : [];
    const propsList = feats.map(f => f.properties || {});

    let totalDistM = 0;
    let totalTimeS = 0;
    let totalElevM = 0;

    for (const p of propsList) {
      const d = pickDistanceMeters(p);
      const t = pickMovingTimeSeconds(p);
      const e = pickElevationMeters(p);
      if (isFinite(d)) totalDistM += d;
      if (isFinite(t)) totalTimeS += t;
      if (isFinite(e)) totalElevM += e;
    }

    // Statistics card
    if (featuresCard) {
      setHeading(featuresCard, "Statistics");
      const ul = ensureList(featuresCard);
      ul.innerHTML = "";

      // Order requested: Distance -> Elevation -> Time
      const li1 = document.createElement("li");
      li1.textContent = `Total: ${fmtDistanceBoth(totalDistM)}`;
      ul.appendChild(li1);

      const li2 = document.createElement("li");
      li2.textContent = `Elevation: ${fmtElevationBoth(totalElevM)}`;
      ul.appendChild(li2);

      const li3 = document.createElement("li");
      li3.textContent = `Time: ${fmtDuration(totalTimeS)}`;
      ul.appendChild(li3);
    }

    // Insights card
    if (stepsCard) {
      setHeading(stepsCard, "Insights");
      const ul = ensureList(stepsCard);
      ul.innerHTML = "";

      // Progress (PCT)
      const pctTotalMi = 2650;
      const completedMi = totalDistM * M_TO_MI;
      const completedPct = pctTotalMi > 0 ? (completedMi / pctTotalMi) * 100 : 0;
      const remainingMi = Math.max(0, pctTotalMi - completedMi);

      // Active days
      const daysSet = new Set(propsList.map(p => isoDay(p.start_date)).filter(Boolean));
      const activeDays = daysSet.size || 0;

      // Avg per active day
      const avgPerDayMi = activeDays > 0 ? completedMi / activeDays : NaN;

      // Performance
      const activities = propsList.length || 0;
      const avgDistMi = activities > 0 ? completedMi / activities : NaN;
      const avgElevFt = activities > 0 ? (totalElevM * M_TO_FT) / activities : NaN;
      const totalHours = totalTimeS / 3600;
      const avgPaceMph = totalHours > 0 ? completedMi / totalHours : NaN;

      // Timeline
      const dates = propsList.map(p => p.start_date).filter(Boolean).sort();
      const first = dates[0] ? fmtTs(dates[0]) : "—";
      const last = dates[dates.length - 1] ? fmtTs(dates[dates.length - 1]) : "—";

      // Rest days: between first & last inclusive - activeDays
      let restDays = "—";
      try {
        if (dates[0] && dates[dates.length - 1]) {
          const d0 = new Date(dates[0]);
          const d1 = new Date(dates[dates.length - 1]);
          const spanDays = Math.floor((Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate()) - Date.UTC(d0.getFullYear(), d0.getMonth(), d0.getDate())) / 86400000) + 1;
          restDays = Math.max(0, spanDays - activeDays).toString();
        }
      } catch {}

      // Geography (no reverse-geocode on GitHub Pages; show bbox + ranges)
      const bbox = geojsonBbox(track);
      let geoLine = "—";
      if (bbox) {
        const [minX, minY, maxX, maxY] = bbox;
        geoLine = `Lat: ${minY.toFixed(3)}–${maxY.toFixed(3)} · Lon: ${minX.toFixed(3)}–${maxX.toFixed(3)}`;
      }

      // Build list
      const mk = (txt) => {
        const li = document.createElement("li");
        li.textContent = txt;
        return li;
      };

      ul.appendChild(mk(`PCT completed: ${fmtNum(completedMi, 1)} mi / ${pctTotalMi} mi (${fmtNum(completedPct, 1)}%)`));
      ul.appendChild(mk(`Remaining: ${fmtNum(remainingMi, 1)} mi`));
      ul.appendChild(mk(`Average per active day: ${fmtNum(avgPerDayMi, 1)} mi / ${fmtNum(avgPerDayMi / 0.621371, 1)} km`));

      ul.appendChild(mk(`Avg distance per activity: ${fmtNum(avgDistMi, 1)} mi / ${fmtNum(avgDistMi / 0.621371, 1)} km`));
      ul.appendChild(mk(`Avg elevation per activity: ${fmtInt(avgElevFt)} ft / ${fmtInt(avgElevFt / M_TO_FT)} m`));
      ul.appendChild(mk(`Avg speed: ${fmtNum(avgPaceMph, 1)} mi/h / ${fmtNum(avgPaceMph * 1.609344, 1)} km/h`));

      ul.appendChild(mk(`First activity: ${first}`));
      ul.appendChild(mk(`Last activity: ${last}`));
      ul.appendChild(mk(`Active days: ${activeDays} · Rest days: ${restDays}`));

      ul.appendChild(mk(`Geography: ${geoLine}`));
    }

    return { totalDistM, totalTimeS, totalElevM };
  }

  function pickLatestFeature(track) {
    const feats = Array.isArray(track?.features) ? track.features : [];
    if (!feats.length) return null;
    const sorted = feats
      .slice()
      .filter(f => f?.properties?.start_date)
      .sort((a, b) => String(a.properties.start_date).localeCompare(String(b.properties.start_date)));
    return sorted.length ? sorted[sorted.length - 1] : feats[feats.length - 1];
  }

  // ---------- Refresh ----------
  async function refresh() {
    try {
      statusEl.textContent = "updating…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      // Add / update track source & layers
      if (!map.getSource("track")) {
        setUpTrackLayers(track);
      } else {
        map.getSource("track").setData(track);
      }

      // Stats & insights
      const totals = renderStatistics(track);

      // Marker / latest
      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: createBlinkMarkerEl() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      // Status/meta text (2 lines, no "Tipp" anymore)
      const latestFeature = pickLatestFeature(track);
      let latestSummary = "";
      if (latestFeature) {
        const p = latestFeature.properties || {};
        const type = pickType(p);
        const distM = pickDistanceMeters(p);
        const timeS = pickMovingTimeSeconds(p);
        latestSummary = `${type}: ${fmtDistanceBoth(distM)} · ${fmtDuration(timeS)}`;
      }

      // Use innerText so \n becomes a real line break
      metaEl.innerText =
        `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}\n` +
        (latestSummary ? latestSummary : "");

      // Fit bounds
      const bbox = geojsonBbox(track);
      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 40, duration: 800 });
      } else {
        map.easeTo({ center: lngLat, zoom: 13, duration: 800 });
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "Error (data missing?)";
      metaEl.innerText = "Please create data/track.geojson and data/latest.json.";
    }
  }

  map.on("load", () => {
    refresh();
    setInterval(refresh, 60_000);
  });
})();