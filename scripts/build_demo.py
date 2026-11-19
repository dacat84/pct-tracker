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
ZEROS = [(cum[trail_km(33.7769, -116.6658)], 1), (cum[trail_km(34.2439, -116.9114)], 2), (cum[trail_km(34.3608, -117.6334)], 1)]
NERO = cum[trail_km(33.0998, -116.4700)]   # Julian via Scissors Crossing: a nero, no zero
nero_next = 0
day = datetime.date(2026, 4, 22)
km, feats = 0.0, []
for n in range(30):
    base = 17 + n * 0.5 if n < 12 else 26
    dist = max(17.0, min(36.0, random.gauss(base, 4)))
    zero = 0
    if nero_next:   # short day: into town in the morning, resupply, a few km out again
        dist, nero_next = nero_next, 0
    elif km + dist < NERO <= km + dist + 16 and NERO - km - 9 >= 12:   # camp ~9 km before town
        dist, nero_next = NERO - km - 9, 9 + random.uniform(3, 5)
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
    feats.append({"type": "Feature", "properties": {
        "garmin_id": 900000 + n, "name": "Demo Tag %d" % (n + 1), "start_date": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "distance_m": round(dist * 1000, 1), "moving_time_s": moving, "type": "hiking", "elevation_gain_m": round(up, 1)},
        "geometry": {"type": "LineString", "coordinates": [[round(x, 6), round(y, 6)] for x, y in pts]}})
    km = b
    day += datetime.timedelta(days=1)
    day += datetime.timedelta(days=zero)

(ROOT / "data/demo/track.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": feats}))
last = feats[-1]
end = last["geometry"]["coordinates"][-1]
ts = (datetime.datetime.strptime(last["properties"]["start_date"], "%Y-%m-%dT%H:%M:%SZ") + datetime.timedelta(seconds=last["properties"]["moving_time_s"])).strftime("%Y-%m-%dT%H:%M:%SZ")
(ROOT / "data/demo/latest.json").write_text(json.dumps({"lat": end[1], "lon": end[0], "ts": ts}, indent=2) + "\n")
print("days:", len(feats), "km:", round(km), "end:", end, "last day:", last["properties"]["start_date"])
