(async function () {
  const statusEl = document.getElementById("status");
  const metaEl = document.getElementById("meta");

  const trackUrl = (window.location.pathname.includes("/")) ? (new URL("./data/track.geojson", window.location.href)).toString() : "data/track.geojson";
  const latestUrl = (window.location.pathname.includes("/")) ? (new URL("./data/latest.json", window.location.href)).toString() : "data/latest.json";

  // Simple raster tiles from OSM
  const style = {
    "version": 8,
    "sources": {
      "osm": {
        "type": "raster",
        "tiles": [
          "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
          "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
        ],
        "tileSize": 256,
        "attribution": "© OpenStreetMap contributors"
      }
    },
    "layers": [
      { "id": "osm", "type": "raster", "source": "osm" }
    ]
  };

  const map = new maplibregl.Map({
    container: "map",
    style,
    center: [-120.5, 39.2],
    zoom: 5
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

  function fmtTs(ts) {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch { return String(ts); }
  }

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  }

  let marker;

  async function refresh() {
    try {
      statusEl.textContent = "aktualisiere…";

      const [track, latest] = await Promise.all([loadJson(trackUrl), loadJson(latestUrl)]);

      // Track source/layer
      if (!map.getSource("track")) {
        map.addSource("track", { type: "geojson", data: track });
        map.addLayer({
          id: "track-line",
          type: "line",
          source: "track",
          paint: {
           "line-width": 4,
           "line-opacity": 0.9,

           // abwechselnd nach Feature-Index i (0/1/0/1/…)
           "line-color": [
             "case",
             ["==", ["%", ["to-number", ["get", "i"]], 2], 0],
             "#34D399", // grün
             "#F59E0B"  // orange
           ]
         }
        });
      } else {
        map.getSource("track").setData(track);
      }

      const lngLat = [latest.lon, latest.lat];

      if (!marker) {
  // inject CSS once
  if (!document.getElementById("blink-marker-style")) {
    const st = document.createElement("style");
    st.id = "blink-marker-style";
    st.textContent = `
      @keyframes blinkGreenOrange {
        0%, 49%   { background: rgba(52, 211, 153, .95); }  /* grün */
        50%, 100% { background: rgba(245, 158, 11, .95); }  /* orange */
      }
      .blink-marker {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 2px solid rgba(232,238,245,.9);
        box-shadow: 0 8px 20px rgba(0,0,0,.35);
        animation: blinkGreenOrange 1.2s infinite;
      }
    `;
    document.head.appendChild(st);
  }

  const el = document.createElement("div");
  el.className = "blink-marker";
  marker = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
} else {
  marker.setLngLat(lngLat);
}


      metaEl.textContent = `Last updated: ${fmtTs(latest.ts)} · Lat/Lon: ${latest.lat.toFixed(5)}, ${latest.lon.toFixed(5)}`;

      // Fit bounds to track on first load, then follow latest
      const bbox = geojsonBbox(track);
      if (bbox) {
        map.fitBounds([[bbox[0], bbox[1]],[bbox[2], bbox[3]]], { padding: 40, duration: 800 });
      } else {
        map.easeTo({ center: lngLat, zoom: 7, duration: 800 });
      }

      statusEl.textContent = "online";
    } catch (e) {
      statusEl.textContent = "Fehler (Daten fehlen?)";
      metaEl.textContent = "Lege data/track.geojson und data/latest.json an.";
      // still show a working map
    }
  }

  // Minimal bbox without dependencies
  function geojsonBbox(geojson) {
    try {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const feats = geojson.type === "FeatureCollection" ? geojson.features : [geojson];
      for (const f of feats) {
        const g = f.type === "Feature" ? f.geometry : f;
        const coords = g.type === "LineString" ? g.coordinates :
                       g.type === "MultiLineString" ? g.coordinates.flat() :
                       g.type === "Point" ? [g.coordinates] :
                       [];
        for (const c of coords) {
          const [x,y] = c;
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

  map.on("load", () => {
    refresh();
    setInterval(refresh, 60_000); // 1 min
  });
})();
