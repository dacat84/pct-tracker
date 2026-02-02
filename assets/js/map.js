(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = new URL("./data/track.geojson", window.location.href).toString();
  const latestUrl = new URL("./data/latest.json", window.location.href).toString();

  /* -------------------------------------------------------
     BASEMAP DEFINITIONS
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
        attribution: "© CARTO © OSM"
      }
    },
    osm: {
      id: "osm",
      icon: "🗺",
      source: {
        type: "raster",
        tiles: [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenStreetMap"
      }
    },
    topo: {
      id: "topo",
      icon: "🏔",
      source: {
        type: "raster",
        tiles: [
          "https://a.tile.opentopomap.org/{z}/{x}/{y}.png"
        ],
        tileSize: 256,
        attribution: "© OpenTopoMap"
      }
    }
  };

  const ORDER = ["satellite", "dark", "osm", "topo"];
  let basemapIndex = 0;

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
    zoom: 11
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  /* -------------------------------------------------------
     BASEMAP TOGGLE BUTTON (ICON ONLY)
  ------------------------------------------------------- */
  const toggle = document.createElement("button");
  toggle.innerHTML = BASEMAPS.satellite.icon;
  toggle.title = "Toggle basemap";
  toggle.style.cssText = `
    position:absolute;
    top:12px;
    right:52px;
    width:36px;
    height:36px;
    border-radius:10px;
    border:none;
    font-size:18px;
    cursor:pointer;
    background:#0f172a;
    color:#fff;
    box-shadow:0 6px 20px rgba(0,0,0,.45);
  `;
  document.getElementById("map").appendChild(toggle);

  toggle.onclick = () => {
    basemapIndex = (basemapIndex + 1) % ORDER.length;
    const key = ORDER[basemapIndex];
    toggle.innerHTML = BASEMAPS[key].icon;
    map.setStyle(buildStyle(key));

    map.once("styledata", () => {
      injectTrackLayers();
      applyBasemapTweaks(key);
    });
  };

  /* -------------------------------------------------------
     VISUAL TWEAKS PER BASEMAP
  ------------------------------------------------------- */
  function applyBasemapTweaks(key) {
    try {
      if (key === "dark") {
        map.addLayer({
          id: "brighten-overlay",
          type: "background",
          paint: { "background-color": "rgba(255,255,255,0.16)" }
        });
        map.setPaintProperty("basemap", "raster-saturation", -0.2);
        map.setPaintProperty("basemap", "raster-contrast", 0.15);
      }

      if (key === "topo") {
        map.setPaintProperty("basemap", "raster-saturation", 0.1);
        map.setPaintProperty("basemap", "raster-contrast", 0.2);
        map.setPaintProperty("basemap", "raster-brightness-min", 0.1);
        map.setPaintProperty("basemap", "raster-brightness-max", 1.0);
      }
    } catch {}
  }

  /* -------------------------------------------------------
     DATA + TRACKS
  ------------------------------------------------------- */
  async function loadJson(url) {
    const r = await fetch(url, { cache: "no-store" });
    return r.json();
  }

  function injectTrackLayers() {
    if (!map.getSource("track")) {
      map.addSource("track", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    }

    const colorExpr = [
      "case",
      ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
      "#46f3ff",
      "#ff4bd8"
    ];

    map.addLayer({
      id: "track-glow",
      type: "line",
      source: "track",
      paint: {
        "line-color": colorExpr,
        "line-width": 12,
        "line-opacity": 0.3,
        "line-blur": 6
      }
    });

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

  /* -------------------------------------------------------
     MARKER
  ------------------------------------------------------- */
  let marker;
  function pulsingMarker() {
    const el = document.createElement("div");
    el.style.cssText = `
      width:16px;height:16px;border-radius:50%;
      background:#2bff88;
      border:2px solid white;
      box-shadow:0 0 20px rgba(43,255,136,.8);
    `;
    let on = false;
    setInterval(() => {
      on = !on;
      el.style.background = on ? "#ff7a18" : "#2bff88";
    }, 700);
    return el;
  }

  /* -------------------------------------------------------
     REFRESH
  ------------------------------------------------------- */
  async function refresh() {
    try {
      const [track, latest] = await Promise.all([
        loadJson(trackUrl),
        loadJson(latestUrl)
      ]);

      map.getSource("track").setData(track);

      const lngLat = [latest.lon, latest.lat];
      if (!marker) {
        marker = new maplibregl.Marker({ element: pulsingMarker() })
          .setLngLat(lngLat)
          .addTo(map);
      } else {
        marker.setLngLat(lngLat);
      }

      metaEl.textContent =
        `Last updated: ${new Date(latest.ts).toLocaleString()}`;
      statusEl.textContent = "online";
    } catch {
      statusEl.textContent = "Fehler";
    }
  }

  map.on("load", () => {
    injectTrackLayers();
    applyBasemapTweaks("satellite");
    refresh();
    setInterval(refresh, 60000);
  });
})();
