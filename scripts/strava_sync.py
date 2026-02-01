import os, json, urllib.request, urllib.parse, urllib.error

CLIENT_ID = os.environ["STRAVA_CLIENT_ID"]
CLIENT_SECRET = os.environ["STRAVA_CLIENT_SECRET"]
REFRESH_TOKEN = os.environ["STRAVA_REFRESH_TOKEN"]

TRACK_PATH = "data/track.geojson"
LATEST_PATH = "data/latest.json"
STATE_PATH = "data/strava_state.json"

MAX_PAGES = 4          # 4 * 50 = 200 Aktivitäten
PER_PAGE = 50

def post_form(url, data):
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))

def get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print("HTTPError", e.code, "URL:", url)
        print("Response:", body[:1200])
        raise

def refresh_access_token():
    tok = post_form("https://www.strava.com/oauth/token", {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
    })
    # Optional: Print scope, falls Strava es liefert
    if "scope" in tok:
        print("Token scope:", tok["scope"])
    return tok["access_token"]

def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)

def get_recent_activities(access_token):
    acts = []
    for page in range(1, MAX_PAGES + 1):
        url = f"https://www.strava.com/api/v3/athlete/activities?per_page={PER_PAGE}&page={page}"
        chunk = get_json(url, headers={"Authorization": f"Bearer {access_token}"})
        if not isinstance(chunk, list):
            print("Unexpected activities response:", chunk)
            break
        acts.extend(chunk)
        if len(chunk) < PER_PAGE:
            break
    return acts

def get_stream(access_token, activity_id):
    # latlng = GPS Track
    # time = optional
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams?keys=latlng,time&key_by_type=true"
    return get_json(url, headers={"Authorization": f"Bearer {access_token}"})

def main():
    access = refresh_access_token()

    activities = get_recent_activities(access)
    print("Activities fetched:", len(activities))

    # Sort: älteste -> neueste (stabile Reihenfolge)
    activities.sort(key=lambda a: a.get("start_date", ""))

    # Track jedes Mal neu bauen
    track = {"type": "FeatureCollection", "features": []}

    latest = None
    kept_ids = []

    skipped_no_latlng = 0
    skipped_errors = 0

    # Erstmal Features sammeln
    for a in activities:
        act_id = int(a.get("id"))
        name = a.get("name", "")
        start_date = a.get("start_date", "")
        act_type = a.get("type", "")

        try:
            streams = get_stream(access, act_id)
        except Exception as e:
            print("Stream error for activity:", act_id, name, start_date, "->", str(e))
            skipped_errors += 1
            continue

        latlng = streams.get("latlng", {}).get("data", [])
        if not latlng:
            print("No latlng for activity:", act_id, name, start_date, "type:", act_type)
            skipped_no_latlng += 1
            continue

        # GeoJSON braucht [lon, lat]
        coords = [[p[1], p[0]] for p in latlng if isinstance(p, (list, tuple)) and len(p) == 2]

        if len(coords) < 2:
            print("Too few coords for activity:", act_id, name, start_date)
            skipped_no_latlng += 1
            continue

        feature = {
            "type": "Feature",
            "properties": {
                # i kommt später nach Sortierung rein (stabil, ohne Lücken)
                "strava_id": act_id,
                "name": name,
                "start_date": start_date,
                "distance_m": a.get("distance", 0),
                "moving_time_s": a.get("moving_time", 0),
                "type": act_type,
            },
            "geometry": {"type": "LineString", "coordinates": coords}
        }

        track["features"].append(feature)
        kept_ids.append(act_id)

    # Jetzt nach Datum sortieren und i sauber 0..n setzen (für alternierende Farben)
    track["features"].sort(key=lambda f: f.get("properties", {}).get("start_date", ""))
    for idx, f in enumerate(track["features"]):
        f.setdefault("properties", {})
        f["properties"]["i"] = idx

    # latest aus der neuesten Aktivität mit GPS
    if track["features"]:
        newest = track["features"][-1]
        coords = newest["geometry"]["coordinates"]
        last = coords[-1]              # [lon, lat]
        latest = {
            "lat": last[1],
            "lon": last[0],
            "ts": newest["properties"].get("start_date", "")
        }

    save_json(TRACK_PATH, track)
    if latest:
        save_json(LATEST_PATH, latest)

    # STATE aktualisieren (optional)
    save_json(STATE_PATH, {"seen_ids": sorted(kept_ids)})

    print(f"Wrote {len(track['features'])} activities to {TRACK_PATH}.")
    print("Skipped (no latlng):", skipped_no_latlng)
    print("Skipped (errors):", skipped_errors)

    if not track["features"]:
        print("⚠️ No activities with GPS streams found.")
        print("Check: Strava privacy settings, activity visibility, and API scope (activity:read_all).")

if __name__ == "__main__":
    main()
