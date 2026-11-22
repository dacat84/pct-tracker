"""Town zones for the live track: walking around in a town is not part of the hike.

A recorded point is dropped when it lies inside a town's zone AND off the PCT (more than
250 m from the trail line, the same rule the site uses for "on the PCT"). So:
  * the trail itself is never cut, also where it runs through a town (Cascade Locks, Agua Dulce),
  * the walk from the trail to the edge of town stays (it shows that you went into town),
  * the streets to the motel, the supermarket and back are gone: no km, and the track
    does not end at the door of the place where you sleep.
A recording that lies completely in town (a stroll on a zero day) disappears, so the zero stays a zero.

Towns come from labs/pct.js (TOWNS), the trail line from data/pct_line.json.
"""
import json, math, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ON_PCT_M = 250.0
DEFAULT_R = 3000.0
# spread-out towns get a bigger zone (metres)
RADIUS = {"South Lake Tahoe": 7000, "Big Bear Lake": 6000, "Ridgecrest": 6000, "Beaumont": 5000, "Bishop": 4500,
          "Mammoth Lakes": 4500, "Ashland": 4500, "Truckee": 4500, "Tehachapi": 4500, "Lake Isabella": 4500,
          "Mount Shasta": 3500, "Leavenworth": 3500, "Sisters": 3500, "Quincy": 3500}

def _dist(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

_towns, _grid, _line = None, None, None

def _load():
    global _towns, _grid, _line
    if _towns is not None:
        return
    js = open(os.path.join(ROOT, "labs/pct.js"), encoding="utf-8").read()
    block = js[js.index("var TOWNS"):js.index("];", js.index("var TOWNS"))]
    _towns = [(n, float(a), float(b), RADIUS.get(n, DEFAULT_R)) for n, a, b in re.findall(r'\["([^"]+)", ([\d.]+), (-[\d.]+),', block)]
    d = json.load(open(os.path.join(ROOT, "data/pct_line.json"), encoding="utf-8"))
    cs = d["coordinates"] if "coordinates" in d else d["features"][0]["geometry"]["coordinates"]
    if cs and isinstance(cs[0][0], list):
        cs = [c for part in cs for c in part]
    _line, _grid = cs, {}
    for i, c in enumerate(cs):
        _grid.setdefault((int(math.floor(c[1] * 100)), int(math.floor(c[0] * 100))), []).append(i)

def _near_pct(lat, lon):
    a, b = int(math.floor(lat * 100)), int(math.floor(lon * 100))
    best = 1e9
    for i in range(a - 1, a + 2):
        for j in range(b - 1, b + 2):
            for k in _grid.get((i, j), ()):
                d = _dist(lat, lon, _line[k][1], _line[k][0])
                if d < best:
                    best = d
    return best

def in_town(lat, lon):
    """Name of the town whose zone holds this off-PCT point, else None."""
    _load()
    for n, tl, tn, r in _towns:
        if abs(lat - tl) < 0.08 and abs(lon - tn) < 0.1 and _dist(lat, lon, tl, tn) < r:
            return n if _near_pct(lat, lon) > ON_PCT_M else None
    return None

def runs(pts):
    """pts: [(lat, lon, ...)]. Returns [(i0, i1), ...]: index ranges (inclusive) to keep."""
    out, start = [], None
    for i, p in enumerate(pts):
        if in_town(p[0], p[1]):
            if start is not None:
                out.append((start, i - 1)); start = None
        elif start is None:
            start = i
    if start is not None:
        out.append((start, len(pts) - 1))
    # drop crumbs: a few points where the path just grazes the zone edge are not a piece of hike
    def length(r):
        return sum(_dist(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) for i in range(r[0] + 1, r[1] + 1))
    return [r for r in out if r[1] > r[0] and length(r) >= 300]
