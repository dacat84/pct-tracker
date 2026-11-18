# PCT Tracker

A personal tracker for my Pacific Crest Trail thru-hike in 2027 (start: 22 April 2027, Campo, northbound). Built on GitHub Pages, bilingual (DE/EN).

The idea: family and friends can follow along without me spending much time on my phone. My Garmin watch records the route, the site updates itself, and I only add a few lines or photos now and then.

Live: https://dacat84.github.io/pct-tracker/

> Until the start the site is in **waiting mode**: the marker sits at the Southern Terminus and a countdown runs. Test hikes from home only show up in the hidden test view: https://dacat84.github.io/pct-tracker/?test

---

## Pages

- **Karte / Map** (`index.md`)
  - Where I am on the trail, % done, km from Campo and to Canada.
  - Interactive **elevation profile** of the whole PCT (`assets/js/elevation.js`): passes, peaks, towns, water, sections, tap to zoom, fullscreen. Walked parts solid, the rest faded.
  - MapLibre map: the PCT as a baseline, walked days on top, a blinking position marker and a "where am I" button. On load it zooms to the last day.
- **Statistik / Stats** (`stats.md`): total distance, progress, elevation gain, time, averages, longest/shortest day and a **day by day** list (km and elevation gain; miles and feet on the English page).
- **Fotos / Photos** (`photos.md`): loaded straight from a Flickr album, newest first.
- **Tagebuch / Diary** (`updates.md`, entries in `_updates/`): short notes, DE and EN, posted from the phone.
- **Ausrüstung / Gear** (`gear.md`): base weight, shelter, sleep system and pack as cards, plus the full LighterPack list.

Design: neobrutalist black/yellow look (`assets/css/neo.css`, Space Grotesk / Space Mono).

---

## How the data gets in

No server, no database. Everything is static files in this repo, GitHub Pages rebuilds the site whenever something changes.

```
Garmin watch ──(Garmin Connect app, Bluetooth)──> Garmin Connect
                                                      │
              GitHub Action "Garmin Sync" (hourly + on every diary post)
                                                      ▼
                       data/track.geojson + data/latest.json  ──>  site

iPhone note ──(Shortcut, GitHub API)──> _updates/*.md            ──>  site
Photos      ──(Flickr app)──> Flickr album  ──(loaded in the browser)──>  site
LighterPack list ──(GitHub Action "Gear Sync", every 3 h)──> _data/gear.json ──> site
```

### Track and position (Garmin)

- The watch syncs to Garmin Connect through the phone app whenever there is signal.
- `scripts/garmin_sync.py` logs in to Garmin Connect (unofficial `garminconnect` library, v0.3.20), looks for new hiking/walking activities, downloads them as GPX, thins them out (max ~300 points per activity) and appends them to `data/track.geojson`. The end point goes to `data/latest.json` (the marker).
- Append-only: it remembers which activities it has seen (`garmin_state.json`), a failed run can't break anything.
- Runs hourly (`.github/workflows/garmin-sync.yml`) and on every push to `_updates/`. GitHub often delays or skips scheduled runs, in practice it's every few hours.
- `tracker.mode` in `_config.yml`: `waiting` writes to `data/test/` (test view only), `live` writes to `data/` and only takes activities from `tracker.start` on.

### Logins and tokens

No password is stored anywhere.

- **Garmin:** log in once on your own computer with `scripts/garmin_login.py`. That creates a token file, which goes into the repo secret `GARMIN_TOKENS`. Garmin renews the access token regularly; after each run the newest tokens are encrypted with `GARMIN_TOKEN_KEY` (second secret) and kept in the Actions cache for the next run. Details: `scripts/GARMIN_SETUP.md`.
- **Diary shortcut:** the iOS Shortcut talks to the GitHub API with a personal access token. Best use a fine-grained token that can only write contents of this one repo.
- **Flickr:** public album, read-only API key in `photos.md`.
- **LighterPack:** public list, no login (`lighterpack_id` in `_config.yml`).

### Diary

An iOS Shortcut takes a (dictated) note, creates a file `_updates/YYYY-MM-DD-HHMMSS.md` with `date`, `de` and `en`, and commits it through the GitHub API. Blank lines become paragraphs.

### Gear

`scripts/gear_sync.py` reads the public LighterPack list every 3 hours and writes the card numbers to `_data/gear.json`. Categories are matched by the start of their name (`Shelter…`, `Stakes`, `Sleep…`, `Pack…`), so renaming e.g. "Shelter #1" doesn't break it.

### Elevation profile

Built once by `scripts/build_elevation.py`: it walks the PCTA centerline, takes ~2000 evenly spaced points and looks up their elevation in the free SRTM 30 m elevation model (OpenTopoData). Result: `data/pct_profile.json`. Passes, peaks, towns and water along the profile are hand-picked in `assets/js/elevation.js`.

### Other

- PCT centerline: `data/Full_PCT_Simplified.geojson` (PCTA, CC BY 4.0).
- `keep-alive.yml` makes sure GitHub doesn't switch off scheduled jobs.

---

## Limits

- Not live tracking. The site is only as fresh as the last time the phone had signal, plus the delay of GitHub's scheduler.
- `garminconnect` is unofficial. Garmin changed its login in 2026 and the old token method stopped working, it can happen again.
- No inReach/satellite position yet.

---

## Folder structure

```
.
├── .github/workflows/
│   ├── garmin-sync.yml        # Garmin Connect -> track (hourly + on diary push)
│   ├── gear-sync.yml          # LighterPack -> gear cards (every 3 h)
│   ├── build-elevation.yml    # Build the PCT elevation profile
│   ├── keep-alive.yml         # Keep scheduled workflows alive
│   └── strava-sync.yml        # Old Strava sync (manual only, unused)
├── _config.yml                # tracker.mode / tracker.start, lighterpack_id
├── _data/gear.json            # Gear card numbers (auto)
├── _layouts/default.html
├── _updates/                  # Diary entries
├── assets/css/                # style.css + neo.css (current look)
├── assets/js/                 # elevation.js, map.js
├── data/
│   ├── track.geojson, latest.json, garmin_state.json   # live data (auto)
│   ├── test/                  # test hikes before the start (auto)
│   ├── demo/                  # old demo data, not shown
│   ├── pct_profile.json       # elevation profile
│   └── Full_PCT_Simplified.geojson
├── scripts/
│   ├── garmin_sync.py, garmin_login.py, GARMIN_SETUP.md
│   ├── gear_sync.py
│   ├── build_elevation.py
│   └── strava_sync.py         # old, unused
├── index.md  stats.md  photos.md  updates.md  gear.md
```

---

## How this was built

Inspired by Karel Sabbe's tracker (https://pct.karelsabbe.com/). I'm not a programmer. It started with asking ChatGPT "can you build me something like this for free?", then copy and paste and a lot of "I have no idea, explain it step by step". These days the AI is wired into GitHub directly, so I mostly just chat and it makes the changes itself.

## Build your own

Fork the repo, turn on GitHub Pages, put your own Flickr album, LighterPack id and start date in, and follow `scripts/GARMIN_SETUP.md`. Works with any Garmin that syncs to Garmin Connect.

Not tied to the PCT either: swap `data/Full_PCT_Simplified.geojson` for the route of any other trail (a GPX/GeoJSON line is enough), rebuild the profile with `scripts/build_elevation.py`, adjust the landmarks in `assets/js/elevation.js` and the texts, and it works for the CDT, AT, GR20, a Te Araroa or a two-week hike in the Alps.

Easiest way if you don't code: give an AI assistant the link to this repo and ask something like *"Have a look at this tracker. Can you build the same for me? I'd like to change a few things. Tell me what you need from me and how to start."*
