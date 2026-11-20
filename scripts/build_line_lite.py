"""Smaller copy of the PCT centerline for the labs pages.

data/Full_PCT_Simplified.geojson has 15 decimals per coordinate (5 MB). For the
map and the on/off-trail checks ~1 m precision is plenty, and points closer
than 15 m to the previous one add nothing. Writes data/pct_line.json.
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "data/Full_PCT_Simplified.geojson").read_text())

def hav(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[1], a[0], b[1], b[0]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(h))

feats, n_in, n_out = [], 0, 0
for f in src["features"]:
    g = f["geometry"]
    parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    for part in parts:
        out = []
        for i, c in enumerate(part):
            n_in += 1
            if out and i < len(part) - 1 and hav(out[-1], c) < 15:
                continue
            out.append([round(c[0], 5), round(c[1], 5)])
        n_out += len(out)
        feats.append({"type": "Feature", "properties": {}, "geometry": {"type": "LineString", "coordinates": out}})

dst = ROOT / "data/pct_line.json"
dst.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
print(f"{n_in} -> {n_out} points, {dst.stat().st_size / 1e6:.2f} MB")
