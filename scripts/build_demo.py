#!/usr/bin/env python3
"""Build fake demo data: 30 hiking days from Campo along the PCT (for designing the pages).

Writes data/demo/track.geojson and data/demo/latest.json in the same format the
Garmin sync produces. Uses the PCTA centerline for the route and
data/pct_profile.json for elevation. Deterministic (fixed random seed).
Not used by the live site (tracker.mode decides what is shown).
"""
import json, math, random, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
random.seed(2027)

def hav(a, b):
    R = 6371.0088
    (lo1, la1), (lo2, la2) = a, b
    p1, p2 = math.radians(la1), math.radians(la2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

gj = json.loads((ROOT / "data/Full_PCT_Simplified.geojson").read_text())
coords = []
for f in gj["features"]:
    g = f["geometry"]
    parts = [g["coordinates"]] if g["type"] == "LineString" else g["coordinates"]
    for p in parts:
        coords += [(c[0], c[1]) for c in p]
cum = [0.0]
for i in range(1, len(coords)):
    cum.append(cum[-1] + hav(coords[i - 1], coords[i]))

prof = json.loads((ROOT / "data/pct_profile.json").read_text())["points"]
def elev_at(km):
    lo, hi = 0, len(prof) - 1
    while hi - lo > 1:
        m = (lo + hi) // 2
        if prof[m]["km"] <= km: lo = m
        else: hi = m
    a, b = prof[lo], prof[hi]
    t = 0 if b["km"] == a["km"] else (km - a["km"]) / (b["km"] - a["km"])
    return a["m"] + (b["m"] - a["m"]) * t

def slice_km(a, b):
    """Points of the centerline between trail km a and b (interpolated ends)."""
    out = []
    def point_at(km):
        lo, hi = 0, len(cum) - 1
        while hi - lo > 1:
            m = (lo + hi) // 2
            if cum[m] <= km: lo = m
            else: hi = m
        t = 0 if cum[hi] == cum[lo] else (km - cum[lo]) / (cum[hi] - cum[lo])
        return (coords[lo][0] + (coords[hi][0] - coords[lo][0]) * t, coords[lo][1] + (coords[hi][1] - coords[lo][1]) * t)
    out.append(point_at(a))
    out += [coords[i] for i in range(len(cum)) if a < cum[i] < b]
    out.append(point_at(b))
    if len(out) > 300:   # same thinning as the real sync
        step = len(out) / 299
        out = [out[int(i * step)] for i in range(299)] + [out[-1]]
    return out

# zero days in these towns: the day before ends where the trail meets the town access
# (Idyllwild via Devils Slide, Big Bear Lake, Wrightwood), the next day starts there again
def trail_km(lat, lon):
    return min(range(len(coords)), key=lambda i: hav(coords[i], (lon, lat)))
# Julian via Scissors Crossing: a nero (into town in the evening, night there, back on the trail next morning)
ZEROS = [(cum[trail_km(33.0998, -116.4700)], 0), (cum[trail_km(33.7769, -116.6658)], 1), (cum[trail_km(34.2439, -116.9114)], 2), (cum[trail_km(34.3608, -117.6334)], 1)]
# Warner Springs: a hero (in and out of town the same day, night back on the trail)
HERO = cum[trail_km(33.2828, -116.6339)]
day = datetime.date(2026, 4, 22)
km, feats = 0.0, []
for n in range(30):
    base = 17 + n * 0.5 if n < 12 else 26
    dist = max(17.0, min(36.0, random.gauss(base, 4)))
    zero = 0
    for town_km, z in ZEROS:
        if km < town_km <= km + dist + 8:   # walk on (or stop a bit early) to reach town
            dist, zero = town_km - km, z
    a, b = km, km + dist
    pts = slice_km(a, b)
    up = 0.0
    prev = elev_at(a)
    for k in range(1, 41):
        e = elev_at(a + dist * k / 40)
        if e > prev: up += e - prev
        prev = e
    start = datetime.datetime.combine(day, datetime.time(13, 30)) + datetime.timedelta(minutes=random.randint(-40, 40))  # ~06:30 Pacific
    moving = int(dist / random.uniform(3.2, 4.0) * 3600)
    def feat(gid, name, st, d, mv, upm, p):
        return {"type": "Feature", "properties": {
            "garmin_id": gid, "name": name, "start_date": st.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "distance_m": round(d * 1000, 1), "moving_time_s": mv, "type": "hiking", "elevation_gain_m": round(upm, 1)},
            "geometry": {"type": "LineString", "coordinates": [[round(x, 6), round(y, 6)] for x, y in p]}}
    if a + 2 < HERO < b - 2:   # hero: recording stops at the town, 3 h of chores, then on again the same day
        f1 = (HERO - a) / dist
        st2 = start + datetime.timedelta(seconds=int(moving * f1) + 3 * 3600)
        feats.append(feat(900000 + n, "Demo Tag %d (bis Warner Springs)" % (n + 1), start, HERO - a, int(moving * f1), up * f1, slice_km(a, HERO)))
        feats.append(feat(905000 + n, "Demo Tag %d (ab Warner Springs)" % (n + 1), st2, b - HERO, moving - int(moving * f1), up * (1 - f1), slice_km(HERO, b)))
    else:
        feats.append(feat(900000 + n, "Demo Tag %d" % (n + 1), start, dist, moving, up, pts))
    km = b
    day += datetime.timedelta(days=1)
    day += datetime.timedelta(days=zero)

# Off-PCT examples: out-and-back walks from the trail (side trail to a summit, walks into town).
# The paths follow the real trail/road (OpenStreetMap routing, BRouter): demo_detours.json holds
# each path from the PCT to the target; Wrightwood uses the Acorn Trail like the town line on the map.
PATHS = json.loads((ROOT / "scripts/demo_detours.json").read_text())
def access_path(town):
    # the town's access line from labs/pct.js (exit → town), so the demo walks the same way
    import re
    js = (ROOT / "labs/pct.js").read_text()
    m = re.search(r'"%s": \["[^"]+", ([\d.]+), (-[\d.]+), \[(.*?)\]\],?\n' % re.escape(town), js)
    via = [[float(lo), float(la)] for la, lo in re.findall(r"\[([\d.]+),(-[\d.]+)\]", m.group(3))]
    return [[float(m.group(2)), float(m.group(1))]] + via
DETOURS = [
    ("San Jacinto Peak", PATHS["San Jacinto Peak"]),        # side trail to the summit
    ("Paradise Valley Cafe", PATHS["Paradise Valley Cafe"]),  # road walk along Hwy 74
    ("Wrightwood", access_path("Wrightwood") + [[-117.6334, 34.3608]]),  # Acorn Trail into town and back
    ("Mount Laguna store", PATHS["Mount Laguna store"]),    # short walk to the store
]
for name, path in DETOURS:
    start = tuple(path[0])
    best = None
    for fi, f in enumerate(feats):
        for ci, c in enumerate(f["geometry"]["coordinates"]):
            d = hav((c[0], c[1]), start)
            if best is None or d < best[0]: best = (d, fi, ci)
    d, fi, ci = best
    c = feats[fi]["geometry"]["coordinates"]
    there = [tuple(q) for q in path]
    L = sum(hav(there[i - 1], there[i]) for i in range(1, len(there)))
    # the turn-off is where one day ends and the next begins (a night in town): walk in at the end of
    # the day before, sleep there, walk out at the start of the next day
    if fi > 0 and hav(tuple(feats[fi - 1]["geometry"]["coordinates"][-1]), start) < 0.3 and hav(tuple(c[0]), start) < 0.3:
        pv = feats[fi - 1]
        pv["geometry"]["coordinates"] += [[round(x, 6), round(y, 6)] for x, y in there]
        feats[fi]["geometry"]["coordinates"] = [[round(x, 6), round(y, 6)] for x, y in reversed(there)] + c
        for g in (pv, feats[fi]): g["properties"]["distance_m"] = round(g["properties"]["distance_m"] + L * 1000, 1)
        print("detour", name, "evening of day", fi, "+ morning of day", fi + 1, round(2 * L, 1), "km")
        continue
    trip = [[round(x, 6), round(y, 6)] for x, y in there + list(reversed(there[:-1])) + [tuple(c[ci])]]
    feats[fi]["geometry"]["coordinates"] = c[:ci + 1] + trip + c[ci + 1:]
    feats[fi]["properties"]["distance_m"] = round(feats[fi]["properties"]["distance_m"] + 2 * L * 1000, 1)
    print("detour", name, "day", fi + 1, round(2 * L, 1), "km", "gap", round(d * 1000), "m")

(ROOT / "data/demo/track.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
last = feats[-1]
end = last["geometry"]["coordinates"][-1]
ts = (datetime.datetime.strptime(last["properties"]["start_date"], "%Y-%m-%dT%H:%M:%SZ") + datetime.timedelta(seconds=last["properties"]["moving_time_s"])).strftime("%Y-%m-%dT%H:%M:%SZ")
(ROOT / "data/demo/latest.json").write_text(json.dumps({"lat": end[1], "lon": end[0], "ts": ts}, indent=2) + "\n")
print("days:", len(feats), "km:", round(km), "end:", end, "last day:", last["properties"]["start_date"])
