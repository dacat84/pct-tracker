# Garmin Connect sync - setup

This replaces the old Strava sync. It pulls your recent hiking activities from
Garmin Connect and writes them into the same data files the site already uses
(`data/track.geojson`, `data/latest.json`), so nothing on the front end changes.

Files:
- `scripts/garmin_sync.py` - the sync script
- `.github/workflows/garmin-sync.yml` - the scheduled GitHub Action

Until credentials are configured the script runs in **scaffold mode**: it does
nothing and exits cleanly, so the workflow never fails.

## Recommended: cached token store (most reliable, survives MFA)

Do this once on your Mac after the watch is set up and a first hike is in
Garmin Connect:

```bash
pip install garminconnect
python - <<'PY'
from garminconnect import Garmin
g = Garmin(email="YOU@example.com", password="YOUR_PASSWORD")
g.login()                       # complete MFA here if Garmin asks
g.garth.dump("~/.garminconnect")
print("Tokens saved.")
PY

# Package the tokens into one line for a GitHub secret:
tar -czf - -C ~/.garminconnect . | base64 -w0 ; echo
```

Copy the long base64 line and add it as a repository secret:
GitHub -> repo -> Settings -> Secrets and variables -> Actions -> New repository secret
- Name: `GARMIN_TOKENS_B64`
- Value: (the base64 line)

Garth tokens are long-lived; refresh by re-running the snippet if sync ever
starts failing on auth.

## Simpler alternative: email + password

Add two secrets instead:
- `GARMIN_EMAIL`
- `GARMIN_PASSWORD`

Works, but if your Garmin account uses MFA, repeated logins from the Action may
get challenged. Prefer the token method above for a months-long hike.

## Turn it on

1. Add the secret(s) above.
2. In `.github/workflows/garmin-sync.yml`, uncomment the `schedule:` block
   (default every 4 hours).
3. Test once manually: Actions tab -> "Garmin Sync" -> "Run workflow".

## Options (optional env / repo variables)

- `GARMIN_ACTIVITY_TYPES` - comma list of Garmin type keys to include
  (default: `hiking,walking,trail_running,rucking`).
- `GARMIN_SCAN_COUNT` - how many recent activities to scan per run (default 30).

## Notes

- The sync is **append-only**: it only downloads activity ids it hasn't seen,
  so runs stay fast and data can't get corrupted by a partial run.
- The unofficial Garmin API can occasionally change. If it breaks, the fallback
  is to run `scripts/garmin_sync.py` from your Mac (or a Raspberry Pi) on a
  schedule and let it push - same script, no code changes.
- Once Garmin is verified working you can delete the Strava bits:
  `scripts/strava_sync.py`, `.github/workflows/strava-sync.yml`,
  `data/strava_state.json`, and the `STRAVA_*` secrets.
