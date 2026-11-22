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

import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import privacy
import townzones


def tracker_settings(path="_config.yml"):
    """Read `tracker: mode / start / delay_hours` from _config.yml (tiny parser, no PyYAML needed)."""
    mode, start, delay = "live", "", 0.0
    try:
        txt = open(path, encoding="utf-8").read()
        block = re.search(r"^tracker:\s*\n((?:[ \t]+.*\n?)*)", txt, re.M)
        if block:
            m = re.search(r"^\s+mode:\s*\"?(\w+)", block.group(1), re.M)
            s = re.search(r"^\s+start:\s*\"?([0-9-]+)", block.group(1), re.M)
            d = re.search(r"^\s+delay_hours:\s*\"?([0-9.]+)", block.group(1), re.M)
            mode = m.group(1) if m else mode
            start = s.group(1) if s else start
            delay = float(d.group(1)) if d else delay
    except OSError:
        pass
    return mode, start, delay


# waiting: before the hike, everything goes to data/test/ (seen only at ?test)
# live:    on trail, data/ and only activities from the start date on
# delay_hours: an activity only goes public this many hours after it ended
# (it stays unknown until then, so a later run picks it up)
MODE, START_DATE, DELAY_H = tracker_settings()
DATA_DIR = "data/test" if MODE == "waiting" else "data"
TRACK_PATH = f"{DATA_DIR}/track.geojson"
LATEST_PATH = f"{DATA_DIR}/latest.json"
STATE_PATH = f"{DATA_DIR}/garmin_state.json"

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
    """Return list of (lat, lon, ele|None, unix_time|None) from GPX bytes, namespace-agnostic."""
    root = ET.fromstring(gpx_bytes)
    pts = []
    for el in root.iter():
        if el.tag.split("}")[-1] != "trkpt":
            continue
        try:
            lat = float(el.get("lat")); lon = float(el.get("lon"))
        except (TypeError, ValueError):
            continue
        ele, ts = None, None
        for ch in el:
            tag = ch.tag.split("}")[-1]
            if tag == "ele":
                try:
                    ele = float(ch.text)
                except (TypeError, ValueError):
                    ele = None
            elif tag == "time" and ch.text:
                try:
                    ts = datetime.datetime.fromisoformat(ch.text.strip().replace("Z", "+00:00")).timestamp()
                except ValueError:
                    ts = None
        pts.append((lat, lon, ele, ts))
    return pts


# ---------------------------------------------------------------- auth
def init_api():
    """Return a logged-in Garmin client, or None if no credentials are set."""
    try:
        from garminconnect import Garmin
    except ImportError:
        print("::error::garminconnect not installed (pip install garminconnect).")
        return None

    # 1) Preferred: resume from the token store (garminconnect >= 0.3 writes
    #    garmin_tokens.json; see scripts/GARMIN_SETUP.md). Refreshed tokens are
    #    written back to the same folder, and the workflow carries them over to
    #    the next run (encrypted cache).
    if os.path.isfile(os.path.join(TOKENSTORE, "garmin_tokens.json")):
        try:
            g = Garmin()
            g.login(TOKENSTORE)
            print("Logged in via Garmin token store.")
            return g
        except Exception as e:
            print(f"::warning::Token resume failed: {type(e).__name__}: {str(e)[:300]}")

    # 1b) The GARMIN_TOKENS secret as a second option: after a fresh login the
    #     cached tokens may be dead while the new secret works. On success the
    #     secret's tokens become the cached copy for the next runs.
    secret_store = os.path.expanduser("~/.garminconnect-secret")
    if os.path.isfile(os.path.join(secret_store, "garmin_tokens.json")):
        try:
            g = Garmin()
            g.login(secret_store)
            print("Logged in via the GARMIN_TOKENS secret.")
            os.makedirs(TOKENSTORE, exist_ok=True)
            return g
        except Exception as e:
            print(f"::warning::Login with the GARMIN_TOKENS secret failed too: {type(e).__name__}: {str(e)[:300]}")

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


def iso_from_ts(ts):
    return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


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

    # On the trail: walking around in a town is not part of the hike (see townzones.py).
    # The recording is split where it leaves a town zone; each kept piece becomes its own feature.
    if MODE == "live":
        keep = townzones.runs(pts)
        if not keep:
            print(f"  activity {act_id}: only town walking; not imported.")
            return {"skip": True}
        if keep != [(0, len(pts) - 1)]:
            full = sum(haversine_m(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) for i in range(1, len(pts))) or 1.0
            dur = (pts[-1][3] - pts[0][3]) if pts[0][3] is not None and pts[-1][3] is not None else None
            feats = []
            for i0, i1 in keep:
                sub = pts[i0:i1 + 1]
                d = sum(haversine_m(sub[i - 1][0], sub[i - 1][1], sub[i][0], sub[i][1]) for i in range(1, len(sub)))
                share_d = d / full
                share_t = ((sub[-1][3] - sub[0][3]) / dur) if dur and sub[0][3] is not None and sub[-1][3] is not None else share_d
                f = _feature_from(act, sub, share_d, share_t, True)
                if f:
                    feats.append(f)
            print(f"  activity {act_id}: town walking / car ride cut, {len(feats)} piece(s) kept.")
            return feats or {"skip": True}
    return _feature_from(act, pts, 1.0, 1.0, False)


def _feature_from(act, pts, share_d, share_t, piece):
    """One map feature from a list of GPX points (the whole activity or a piece of it)."""
    act_id = act.get("activityId")
    type_key = ((act.get("activityType") or {}).get("typeKey") or "").lower()
    if len(pts) < 2:
        return None

    # Simplified map coordinates ([lon, lat]).
    pts_ds = downsample(pts, COORDS_MAX_POINTS)
    coords = [[p[1], p[0]] for p in pts_ds]
    # Seconds since the first point for every map point (used to place photos without GPS by time).
    times = [int(round(p[3] - pts[0][3])) for p in pts_ds] if all(p[3] is not None for p in pts_ds) and pts[0][3] is not None else None
    t0_ts = pts[0][3]
    last_latlon = [pts[-1][0], pts[-1][1]]
    # Test walks (before the hike) mostly start at home: cut a privacy zone at both ends.
    if MODE == "waiting":
        cut = privacy.trim(coords, times, act_id)
        if cut is None:
            print(f"  activity {act_id}: too short after the privacy cut; skipped.")
            return {"skip": True}
        coords, times_cut, first = cut
        if times:
            t0_ts = t0_ts + times[first]
        times = times_cut
        last_latlon = [coords[-1][1], coords[-1][0]]

    # Elevation profile (cumulative distance vs. elevation), computed from full pts.
    has_alt = all(p[2] is not None for p in pts)
    prof_d, prof_e = [], []
    total_up = float(act.get("elevationGain") or 0.0) * share_d
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
        if not act.get("elevationGain") or piece:
            total_up = up

    return {
        "type": "Feature",
        "properties": {
            "strava_id": act_id,                      # kept name for map.js hover compat
            "activity_id": act_id,
            "name": act.get("activityName", "") or "",
            "start_date": iso_from_ts(pts[0][3]) if piece and pts[0][3] is not None else iso_from_garmin(act.get("startTimeGMT") or act.get("startTimeLocal")),
            "distance_m": round(float(act.get("distance") or 0.0) * share_d, 1),
            "moving_time_s": int((act.get("movingDuration") or act.get("duration") or 0) * share_t),
            "type": type_key,
            "elevation_gain_m": float(total_up),
            "profile_dist_m": prof_d,
            "profile_elev_m": prof_e,
            **({"t0": iso_from_ts(t0_ts), "t": times} if times else {}),
        },
        "geometry": {"type": "LineString", "coordinates": coords},
        "_last_latlon": last_latlon,                  # temp, stripped before write
    }


# ---------------------------------------------------------------- main
def main():
    api = init_api()
    if api is None and os.path.isdir(TOKENSTORE) and os.listdir(TOKENSTORE):
        print("::error::A Garmin token store is configured but login failed. "
              "Log in again locally and update the GARMIN_TOKENS secret "
              "(see scripts/GARMIN_SETUP.md).")
        return 1
    if api is None:
        print("No Garmin credentials configured yet (scaffold mode). "
              "Set the GARMIN_TOKENS secret to activate. "
              "See scripts/GARMIN_SETUP.md. Nothing to do.")
        return 0
    save_tokens(api)

    print(f"Mode: {MODE} -> writing to {DATA_DIR}/"
          + (f", only activities from {START_DATE} on" if MODE == "live" and START_DATE else ""))
    track = load_json(TRACK_PATH, {"type": "FeatureCollection", "features": []})
    if not isinstance(track, dict) or "features" not in track:
        track = {"type": "FeatureCollection", "features": []}
    known = {str(f.get("properties", {}).get("strava_id")) for f in track["features"]}
    known |= {str(k) for k in load_json(STATE_PATH, {}).get("known_ids", [])}

    try:
        activities = api.get_activities(0, SCAN_COUNT)
    except Exception as e:
        print(f"::error::Could not fetch activities: {e}")
        return 1

    # Dry run: prove the connection works and show what would be imported,
    # without touching any data file. (Manual runs default to this.)
    if os.environ.get("GARMIN_DRY_RUN", "").lower() in ("1", "true", "yes"):
        print(f"DRY RUN: connected to Garmin Connect, {len(activities)} recent activity(ies) found.")
        for act in activities:
            tk = ((act.get("activityType") or {}).get("typeKey") or "").lower()
            ok = (not ALLOWED_TYPES) or (tk in ALLOWED_TYPES)
            print(f"  {act.get('startTimeLocal', '?')}  {tk or '?':<16} "
                  f"{float(act.get('distance') or 0) / 1000:6.1f} km  "
                  f"{'would import' if ok and str(act.get('activityId')) not in known else 'skip'}")
        print("DRY RUN: nothing written.")
        return 0

    added = 0
    for act in activities:
        act_id = act.get("activityId")
        type_key = ((act.get("activityType") or {}).get("typeKey") or "").lower()
        if type_key and ALLOWED_TYPES and type_key not in ALLOWED_TYPES:
            continue
        if str(act_id) in known:
            continue
        if MODE == "live" and START_DATE and str(act.get("startTimeLocal") or "")[:10] < START_DATE:
            continue
        if DELAY_H > 0 and MODE == "live":   # test walks before the hike show up right away
            try:
                st = datetime.datetime.strptime(str(act.get("startTimeGMT"))[:19], "%Y-%m-%d %H:%M:%S")
                end = st + datetime.timedelta(seconds=float(act.get("duration") or 0))
                if datetime.datetime.utcnow() - end < datetime.timedelta(hours=DELAY_H):
                    print(f"  ~ activity {act_id} held back ({DELAY_H:g} h delay).")
                    continue
            except ValueError:
                pass
        feat = build_feature(api, act)
        if isinstance(feat, list):      # split at a town: several pieces of one activity
            track["features"].extend(feat)
            known.add(str(act_id))
            added += 1
            print(f"  + added activity {act_id} in {len(feat)} piece(s).")
            continue
        if feat and feat.get("skip"):   # nothing left after the privacy / town cut: remember it, don't retry
            known.add(str(act_id))
            continue
        if feat:
            track["features"].append(feat)
            known.add(str(act_id))
            added += 1
            print(f"  + added activity {act_id} ({type_key}, {feat['properties']['start_date']}).")

    # Backfill point times for activities imported before times were stored (a few per run).
    by_id = {str(a.get("activityId")): a for a in activities}
    filled = 0
    for f in track["features"]:
        pr = f.get("properties", {})
        aid = str(pr.get("strava_id"))
        if "t" in pr or aid not in by_id or filled >= 25:
            continue
        nf = build_feature(api, by_id[aid])
        if isinstance(nf, dict) and "t" in nf.get("properties", {}):
            pr["t0"], pr["t"] = nf["properties"]["t0"], nf["properties"]["t"]
            f["geometry"] = nf["geometry"]   # same thinning, so coordinates and times line up
            filled += 1
    if filled:
        print(f"  backfilled point times for {filled} activity(ies).")

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


def save_tokens(api):
    """Write the (possibly refreshed) tokens back so the next run can use them."""
    try:
        api.client.dump(TOKENSTORE)
    except Exception as e:
        print(f"::warning::Could not save refreshed Garmin tokens: {type(e).__name__}")


if __name__ == "__main__":
    sys.exit(main())
