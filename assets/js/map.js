function applyBasemapMode() {
  const active = MODES[modeIndex];

  // alle Basemaps ausblenden
  for (const m of MODES) {
    map.setLayoutProperty(m.layerId, "visibility", "none");
  }

  // aktive anzeigen
  map.setLayoutProperty(active.layerId, "visibility", "visible");

  // ----- DARK MODE tuning -----
  if (active.key === "dark") {
    if (map.getLayer("brighten-overlay")) {
      map.setLayoutProperty("brighten-overlay", "visibility", "visible");
    }
    try {
      map.setPaintProperty("base-dark", "raster-saturation", -0.15);
      map.setPaintProperty("base-dark", "raster-contrast", 0.18);
      map.setPaintProperty("base-dark", "raster-brightness-min", 0.06);
      map.setPaintProperty("base-dark", "raster-brightness-max", 0.98);
    } catch {}
  } else {
    if (map.getLayer("brighten-overlay")) {
      map.setLayoutProperty("brighten-overlay", "visibility", "none");
    }
  }

  // ----- TOPO: heller & freundlicher (OHNE Overlay) -----
  if (active.key === "topo") {
    try {
      map.setPaintProperty("base-topo", "raster-saturation", -0.25); // weniger „schmutzig“
      map.setPaintProperty("base-topo", "raster-contrast", -0.10);   // Kontrast runter
      map.setPaintProperty("base-topo", "raster-brightness-min", 0.15);
      map.setPaintProperty("base-topo", "raster-brightness-max", 1.00);
      map.setPaintProperty("base-topo", "raster-opacity", 0.95);
    } catch {}
  }

  return active;
}
