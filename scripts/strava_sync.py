import os, json, urllib.request, urllib.parse

CLIENT_ID = os.environ["STRAVA_CLIENT_ID"]
CLIENT_SECRET = os.environ["STRAVA_CLIENT_SECRET"]
REFRESH_TOKEN = os.environ["STRAVA_REFRESH_TOKEN"]

TRACK_PATH = "data/track.geojson"
LATEST_PATH = "data/latest.json"
STATE_PATH = "data/strava_state.json"


def post_form(url, data):
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def get_json(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode("utf-8"))


def refresh_access_token():
    tok = post_form("https://www.strava.com/oauth/token", {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
    })
    return tok["access_token"]


def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def get_recent_activities(access_token):
    acts = []
    # 4 Seiten * 50 = 200 Aktivitäten (passe an, wenn du mehr willst)
    for page in range(1, 5):
        url = f"https://www.strava.com/api/v3/athlete/activities?per_page=50&page={page}"
        acts.extend(get_json(url, headers={"Authorization": f"Bearer {access_token}"}))
    return acts


def get_stream(access_token, activity_id):
    # latlng reicht für Linie (time optional)
    url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams?keys=latlng,time&key_by_type=true"
    return get_json(url, headers={"Authorization": f"Bearer {access_token}"})


def main():
    access = refresh_access_token()

    activities = get_recent_activities(access)
    # älteste -> neueste (damit i stabil ist, wenn du nicht dauernd die Sortierung änderst)
    activities.sort(key=lambda a: a.get("start_date", ""))

    # Track JEDES MAL neu bauen: so verschwinden gelöschte Strava-Aktivitäten automatisch
    track = {"type": "FeatureCollection", "features": []}
    latest = None
    kept_ids = []

    idx_for_color = 0

    for a in activities:
        act_id = int(a["id"])

        streams = get_stream(access, act_id)
        latlng = streams.get("latlng", {}).get("data", [])
        if not latlng:
            # keine GPS Daten (Indoor/Privat/keine Berechtigung) -> überspringen
            continue

        # GeoJSON braucht [lon, lat]
        coords = [[p[1], p[0]] for p in latlng]

        # Höhenmeter direkt aus Activity (Strava Feld)
        elev_gain = a.get("total_elevation_gain", None)

        feature = {
            "type": "Feature",
            "properties": {
                # i => abwechselnde Farben pro Aktivität im Frontend
                "i": idx_for_color,
                "strava_id": act_id,
                "name": a.get("name", ""),
                "start_date": a.get("start_date", ""),
                "distance_m": a.get("distance", 0),
                "moving_time_s": a.get("moving_time", 0),
                "type": a.get("type", ""),
                # Patch: Höhenmeter in ein eigenes Feld schreiben (wird im Popup genutzt)
                "elevation_gain_m": elev_gain,
            },
            "geometry": {"type": "LineString", "coordinates": coords}
        }

        track["features"].append(feature)
        kept_ids.append(act_id)

        # latest = letzte Koordinate der neuesten Aktivität mit GPS
        last = latlng[-1]
        latest = {"lat": last[0], "lon": last[1], "ts": a.get("start_date", "")}

        idx_for_color += 1

    # Sicherheit: falls Features doch mal unsortiert reinkommen, nochmals sortieren & i neu vergeben
    try:
        track["features"].sort(key=lambda f: f.get("properties", {}).get("start_date", ""))
        for i, f in enumerate(track["features"]):
            f.setdefault("properties", {})
            f["properties"]["i"] = i
    except Exception:
        pass

    save_json(TRACK_PATH, track)
    if latest:
        save_json(LATEST_PATH, latest)

    # optionaler State (nicht zwingend nötig, aber hilfreich fürs Debuggen)
    save_json(STATE_PATH, {"seen_ids": sorted(kept_ids)})

    print(f"Wrote {len(track['features'])} activities to {TRACK_PATH}.")
    if not latest:
        print("No GPS streams found (check Strava privacy/scope).")


if __name__ == "__main__":
    main()
