#!/usr/bin/env python3
"""
Garmin Connect -> PCT tracker sync.

Pulls recent hiking activities from Garmin Connect and writes them into the SAME
data files the site already consumes (no front-end changes needed):

  data/track.geojson   FeatureCollection, one LineString per activity, with
                       properties: strava_id (=Garmin activityId, kept for map.js
                       compatibility), name, start_date, distance_m, moving_time_s,
                       type, elevation_gain_m, profile_dist_m, profile_elev_m, i
  data/latest.json     { lat, lon, ts }  -> the "you are here" marker
  data/garmin_state.json  small bookkeeping file (last sync, known ids)

Design:
  * Append-only. Existing activities in track.geojson are reused; only NEW
    activity ids are downloaded each run. Fast and self-healing.
  * Auth: prefers a cached Garth token store (recommended, avoids repeated logins
    and MFA prompts). Falls back to email/password. If NO credentials are set,
    the script prints a friendly notice and exits 0 (scaffold mode) so the
    workflow never hard-fails before you've added secrets.

Setup: see scripts/GARMIN_SETUP.md
"""
import os, sys, json, math, base64, io, datetime
import xml.etree.ElementTree as ET

TRACK_PATH = "data/track.geojson"
LATEST_PATH = "data/latest.json"
STATE_PATH = "data/garmin_state.json"

# How many recent activities to scan per run, and how far to simplify tracks.
SCAN_COUNT = int(os.environ.get("GARMIN_SCAN_COUNT", "30"))
COORDS_MAX_POINTS = 300     # points kept per map track
PROFILE_MAX_POINTS = 220    # points kept per elevation profile
# Which Garmin activity types count as "on trail".
ALLOWED_TYPES = set(
    (os.environ.get("GARMIN_ACTIVITY_TYPES") or "hiking,walking,trail_running,rucking").split(",")
)

TOKENSTORE = os.path.expanduser(os.environ.get("GARMINTOKENS", "~/.garminconnect"))


# ---------------------------------------------------------------- helpers
def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def load_json(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def downsample(seq, max_points):
    n = len(seq)
    if n <= max_points:
        return list(seq)
    step = (n - 1) / (max_points - 1)
    return [seq[min(n - 1, int(round(i * step)))] for i in range(max_points)]


def downsample_pair(xs, ys, max_points):
    n = min(len(xs), len(ys))
    if n <= max_points:
        return xs[:n], ys[:n]
    step = (n - 1) / (max_points - 1)
    idx = [min(n - 1, int(round(i * step))) for i in range(max_points)]
    return [xs[i] for i in idx], [ys[i] for i in idx]


def iso_from_garmin(s):
    """Garmin 'startTimeGMT' looks like '2027-04-15 13:04:00'. Return ISO+Z."""
    if not s:
        return ""
    s = s.strip().replace("/", "-")
    if "T" not in s:
        s = s.replace(" ", "T", 1)
    if not s.endswith("Z") and "+" not in s:
        s += "Z"
    return s


def parse_gpx(gpx_bytes):
    """Return list of (lat, lon, ele|None) from GPX bytes, namespace-agnostic."""
    root = ET.fromstring(gpx_bytes)
    pts = []
    for el in root.iter():
        if el.tag.split("}")[-1] != "trkpt":
            continue
        try:
            lat = float(el.get("lat")); lon = float(el.get("lon"))
        except (TypeError, ValueError):
            continue
        ele = None
        for ch in el:
            if ch.tag.split("}")[-1] == "ele":
                try:
                    ele = float(ch.text)
                except (TypeError, ValueError):
                    ele = None
        pts.append((lat, lon, ele))
    return pts


# ---------------------------------------------------------------- auth
def init_api():
    """Return a logged-in Garmin client, or None if no credentials are set."""
    try:
        from garminconnect import Garmin
    except ImportError:
        print("::error::garminconnect not installed (pip install garminconnect).")
        return None

    # 1) Preferred: resume from a cached token store (set up once, see SETUP.md).
    if os.path.isdir(TOKENSTORE) and os.listdir(TOKENSTORE):
        try:
            g = Garmin()
            g.login(TOKENSTORE)
            print("Logged in via cached Garmin token store.")
            return g
        except Exception as e:
            print(f"Token resume failed ({e}); will try email/password.")

    # 2) Fallback: email + password.
    email = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")
    if not (email and password):
        return None
    g = Garmin(email=email, password=password)
    g.login()
    print("Logged in with email/password.")
    # Persist tokens so future runs can resume without a fresh login.
    try:
        g.garth.dump(TOKENSTORE)
        print("Saved Garmin token store. Tip: base64 it into the GARMIN_TOKENS_B64 "
              "secret so scheduled runs resume without re-login "
              "(see scripts/GARMIN_SETUP.md).")
    except Exception as e:
        print(f"Could not persist token store: {e}")
    return g


# ---------------------------------------------------------------- activity -> feature
def build_feature(api, act):
    act_id = act.get("activityId")
    type_key = ((act.get("activityType") or {}).get("typeKey") or "").lower()

    # Download the GPS track as GPX (most reliable across Garmin activity types).
    try:
        from garminconnect import Garmin
        gpx_bytes = api.download_activity(act_id, dl_fmt=Garmin.ActivityDownloadFormat.GPX)
    except Exception as e:
        print(f"  activity {act_id}: GPX download failed ({e}); skipped.")
        return None
    if isinstance(gpx_bytes, str):
        gpx_bytes = gpx_bytes.encode("utf-8")

    pts = parse_gpx(gpx_bytes)
    if len(pts) < 2:
        print(f"  activity {act_id}: no GPS points; skipped.")
        return None

    # Simplified map coordinates ([lon, lat]).
    pts_ds = downsample(pts, COORDS_MAX_POINTS)
    coords = [[p[1], p[0]] for p in pts_ds]

    # Elevation profile (cumulative distance vs. elevation), computed from full pts.
    has_alt = all(p[2] is not None for p in pts)
    prof_d, prof_e = [], []
    total_up = float(act.get("elevationGain") or 0.0)
    if has_alt:
        cum = 0.0
        prof_d.append(0.0); prof_e.append(pts[0][2])
        up = 0.0
        for i in range(1, len(pts)):
            cum += haversine_m(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1])
            prof_d.append(cum); prof_e.append(pts[i][2])
            d = pts[i][2] - pts[i - 1][2]
            if d > 0:
                up += d
        prof_d, prof_e = downsample_pair(prof_d, prof_e, PROFILE_MAX_POINTS)
        if not act.get("elevationGain"):
            total_up = up

    return {
        "type": "Feature",
        "properties": {
            "strava_id": act_id,                      # kept name for map.js hover compat
            "activity_id": act_id,
            "name": act.get("activityName", "") or "",
            "start_date": iso_from_garmin(act.get("startTimeGMT") or act.get("startTimeLocal")),
            "distance_m": float(act.get("distance") or 0.0),
            "moving_time_s": int(act.get("movingDuration") or act.get("duration") or 0),
            "type": type_key,
            "elevation_gain_m": float(total_up),
            "profile_dist_m": prof_d,
            "profile_elev_m": prof_e,
        },
        "geometry": {"type": "LineString", "coordinates": coords},
        "_last_latlon": [pts[-1][0], pts[-1][1]],     # temp, stripped before write
    }


# ---------------------------------------------------------------- main
def main():
    api = init_api()
    if api is None:
        print("No Garmin credentials configured yet (scaffold mode). "
              "Set GARMIN_TOKENS_B64 or GARMIN_EMAIL/GARMIN_PASSWORD secrets to activate. "
              "See scripts/GARMIN_SETUP.md. Nothing to do.")
        return 0

    track = load_json(TRACK_PATH, {"type": "FeatureCollection", "features": []})
    if not isinstance(track, dict) or "features" not in track:
        track = {"type": "FeatureCollection", "features": []}
    known = {str(f.get("properties", {}).get("strava_id")) for f in track["features"]}

    try:
        activities = api.get_activities(0, SCAN_COUNT)
    except Exception as e:
        print(f"::error::Could not fetch activities: {e}")
        return 1

    added = 0
    for act in activities:
        act_id = act.get("activityId")
        type_key = ((act.get("activityType") or {}).get("typeKey") or "").lower()
        if type_key and ALLOWED_TYPES and type_key not in ALLOWED_TYPES:
            continue
        if str(act_id) in known:
            continue
        feat = build_feature(api, act)
        if feat:
            track["features"].append(feat)
            known.add(str(act_id))
            added += 1
            print(f"  + added activity {act_id} ({type_key}, {feat['properties']['start_date']}).")

    track["features"].sort(key=lambda f: f.get("properties", {}).get("start_date", ""))
    latest = None
    for idx, f in enumerate(track["features"]):
        f.setdefault("properties", {})["i"] = idx
        endpt = f.pop("_last_latlon", None)
        if endpt is None:
            c = f.get("geometry", {}).get("coordinates", [])
            if c:
                endpt = [c[-1][1], c[-1][0]]
        if endpt is not None:
            latest = {"lat": endpt[0], "lon": endpt[1],
                      "ts": f.get("properties", {}).get("start_date", "")}

    save_json(TRACK_PATH, track)
    if latest:
        save_json(LATEST_PATH, latest)
    save_json(STATE_PATH, {
        "source": "garmin",
        "last_sync_utc": datetime.datetime.utcnow().isoformat(),
        "activity_count": len(track["features"]),
        "known_ids": sorted(int(k) for k in known if str(k).isdigit()),
    })

    print(f"Done. {added} new activity(ies); {len(track['features'])} total on the trail.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
