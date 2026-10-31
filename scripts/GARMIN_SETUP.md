# Garmin Connect sync - setup

This replaces the old Strava sync. It pulls your recent hiking activities from
Garmin Connect and writes them into the same data files the site already uses
(`data/track.geojson`, `data/latest.json`), so nothing on the front end changes.

Files:
- `scripts/garmin_sync.py` - the sync script
- `.github/workflows/garmin-sync.yml` - the scheduled GitHub Action

Until credentials are configured the script runs in **scaffold mode**: it does
nothing and exits cleanly, so the workflow never fails.

## Setup (garminconnect 0.3+, since Oct 2026)

Garmin changed its login in 2026 and the old garth-based tokens
(`GARMIN_TOKENS_B64`) stopped working. The sync now uses garminconnect 0.3.20
with its own token file `garmin_tokens.json`.

1. On your Mac, log in once (needs Python 3.12+; `uv` brings its own):

   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh     # once, if uv is missing
   curl -fsSL https://raw.githubusercontent.com/dacat84/pct-tracker/main/scripts/garmin_login.py -o ~/garmin_login.py
   ~/.local/bin/uv run --python 3.12 --with garminconnect==0.3.20 python ~/garmin_login.py
   ```

2. Add two repository secrets
   (GitHub -> repo -> Settings -> Secrets and variables -> Actions):
   - `GARMIN_TOKENS`: the content of `~/.garminconnect-pct/garmin_tokens.json`
     (`pbcopy < ~/.garminconnect-pct/garmin_tokens.json`, then paste)
   - `GARMIN_TOKEN_KEY`: any long random string
     (`openssl rand -base64 32 | pbcopy`, then paste)

3. Test: Actions -> "Garmin Sync" -> "Run workflow" (dry run is the default).

Garmin refreshes the access token regularly. Each run writes the newest tokens
back, encrypts them with `GARMIN_TOKEN_KEY` and keeps them in the Actions cache
for the next run, so the secret only has to be set once. If the sync ever fails
on login again, repeat step 1 and update `GARMIN_TOKENS`.

The old secret `GARMIN_TOKENS_B64` is no longer used and can be deleted.

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
