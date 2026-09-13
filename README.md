# PCT Tracker

A lightweight personal tracker for a Pacific Crest Trail thru-hike, built on GitHub Pages.

Live-ish map, statistics, photos, a diary, and a gear list, all on one bilingual (DE/EN) site. The position and tracks come from a smartwatch and update on their own once the phone has signal. Designed to be simple, robust, and pleasant to share with friends and family.

Live: https://dacat84.github.io/pct-tracker/

> Note: the site currently shows placeholder test data. The real hike starts in 2027; until then it is fully built and waiting for live data.

---

## Pages

- **Karte / Map** (`index.md`)
  - Hero: where I am right now, distance from Campo, next waypoint, distance to the Northern Terminus.
  - An honest freshness pill ("Letzte Aktivität / Last activity, vor X Tagen") instead of a fake "live" label.
  - Interactive **elevation profile** of the whole PCT (`assets/js/elevation.js`): peaks, passes, towns, water, parks and terminals as tiered landmarks, six section bands, tap to zoom into a section, fullscreen view, and a marker showing the current position. Tracked sections are drawn solid, the rest stays faded.
  - MapLibre map with the full PCT route as a thin white baseline and the walked days in warm amber/terracotta.
  - Short "Über die Wanderung / About the hike" intro for people who do not know the PCT.

- **Statistik / Stats** (`stats.md`, self-contained)
  - Hero: total distance hiked with a PCT progress bar and remaining kilometres.
  - Tiles: elevation gain, total time, average per day, average pace, days out, zero days.
  - Longest and shortest day.
  - **Tag für Tag / Day by day**: the full history, newest first, each day with date, a proportional bar, and kilometres.

- **Fotos / Photos** (`photos.md`)
  - Auto-synced from a Flickr album, newest first, with a larger featured (newest) image.
  - No local image management.

- **Tagebuch / Diary** (`updates.md`, entries in `_updates/`)
  - Short Markdown notes from the trail, bilingual, fast to write from a phone.

- **Ausrüstung / Gear** (`gear.md`)
  - At-a-glance cards: base weight plus shelter, sleep system and pack, so non-hikers get it at a glance.
  - Full itemised list embedded from [lighterpack.com](https://lighterpack.com), always current.

---

## Design

- Warm off-white theme, Fraunces (serif) headings and Inter (sans) body.
- Natural green and terracotta accents; rounded cards; the same look across every page.
- Full **DE/EN** language toggle (stored per browser).
- Shareable: OpenGraph preview tags and a mountain favicon.

---

## How it works

- Built with **GitHub Pages (Jekyll)**: no server, no database.
- **Data sync**: recent hiking activities are pulled from **Garmin Connect** by a scheduled GitHub Action and written into `data/track.geojson` and `data/latest.json`. The front end reads those files unchanged. See `scripts/GARMIN_SETUP.md` to activate it. (The older Strava sync is kept for reference and can be removed once Garmin is verified.)
- **Elevation profile** data is precomputed into `data/pct_profile.json` (total_km 4196.7) by `scripts/build_elevation.py`.
- **Photos** load client-side from the Flickr API; **gear** is an embedded LighterPack list.
- A **keep-alive** workflow runs twice a month so GitHub does not disable scheduled jobs on an inactive repo.
- Track coordinates are **downsampled** (max ~300 points per activity) to keep the map fast and the repo small.
- The PCT centerline is `data/Full_PCT_Simplified.geojson` (PCTA data, CC BY 4.0).

---

## Data sync setup (Garmin)

The sync ships in **scaffold mode**: without credentials it does nothing and the workflow never fails. To turn it on:

1. Follow `scripts/GARMIN_SETUP.md` to create either a cached token secret (`GARMIN_TOKENS_B64`, recommended) or `GARMIN_EMAIL` / `GARMIN_PASSWORD`.
2. Uncomment the `schedule:` block in `.github/workflows/garmin-sync.yml`.
3. Trigger it once from the Actions tab to test.

The sync is append-only and self-healing: it only downloads activities it has not seen, so a partial run cannot corrupt the data.

---

## Folder structure

```
.
├── .github/workflows/
│   ├── garmin-sync.yml        # Pull activities from Garmin Connect (scaffold)
│   ├── strava-sync.yml        # Legacy Strava sync (kept for reference)
│   ├── build-elevation.yml    # Build the PCT elevation profile data
│   └── keep-alive.yml         # Keep scheduled workflows alive
├── _layouts/                  # Jekyll page layouts (default, post)
├── _updates/                  # Diary entries (Markdown, one file each)
├── assets/
│   ├── css/style.css          # All styles (design system)
│   └── js/
│       ├── elevation.js       # Home hero + interactive elevation profile
│       ├── map.js             # MapLibre map + live marker
│       └── flickr-grid.js     # Photo grid helper
├── data/
│   ├── track.geojson          # Recorded tracks (auto-updated)
│   ├── latest.json            # Current position marker (auto-updated)
│   ├── pct_profile.json       # Precomputed PCT elevation profile
│   ├── garmin_state.json      # Garmin sync bookkeeping (auto-created)
│   ├── strava_state.json      # Legacy Strava sync state
│   └── Full_PCT_Simplified.geojson  # PCT centerline (PCTA, CC BY 4.0)
├── scripts/
│   ├── garmin_sync.py         # Garmin Connect -> data files
│   ├── GARMIN_SETUP.md        # How to activate the Garmin sync
│   ├── build_elevation.py     # Build data/pct_profile.json
│   └── strava_sync.py         # Legacy Strava sync
├── index.md                   # Karte / Map
├── stats.md                   # Statistik / Stats
├── photos.md                  # Fotos / Photos
├── updates.md                 # Tagebuch / Diary
├── gear.md                    # Ausrüstung / Gear
└── _config.yml
```
