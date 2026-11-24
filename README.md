# PCT Tracker

A lightweight personal tracker for a Pacific Crest Trail thru-hike, built on GitHub Pages.

Live-ish map, statistics, photos, a diary, and a gear list, all on one bilingual (DE/EN) site. The position and tracks come from a smartwatch and update on their own once the phone has signal. Designed to be simple, robust, and pleasant to share with friends and family.

Live: https://dacat84.github.io/pct-tracker/

> Note: the site currently shows placeholder test data. The real hike starts in 2027; until then it is fully built and waiting for live data.

---

## Pages

- **Karte / Map** (`/`): satellite map with the walked days, tents for every night, zero, nero and hero days, a replay of the whole hike, an elevation strip, the photo strip and a small card with the numbers of the day.
- **Tagebuch / Journal** (`/tagebuch/`): the diary entries from `_updates/`. On a computer the map next to it follows the entry you are reading.
- **Fotos / Photos** (`/fotos/`): the Flickr album as a gallery. Photos with a location also appear on the map.
- **Statistik / Stats** (`/statistik/`): km hiked and km on the PCT, elevation gain, time, every day in a list, elevation profile.
- **Ausrüstung / Gear** (`/ausruestung/`): base weight and the three big items from LighterPack, plus the full list.

All pages are built from the same files in `_includes/pct/` and one script, `labs/pct.js`.

### Labs (test copy)

The same pages also run under `/labs/`. There they can show demo data (`?data=demo`, 30 made-up days from Campo) or the test walks at home (`?data=test`). The main site only ever reads the real data in `data/`; in waiting mode that stays empty until the start. Every change to the pages shows up in both places.

---

## Design

- Warm off-white theme, Fraunces (serif) headings and Inter (sans) body.
- Natural green and terracotta accents; rounded cards; the same look across every page.
- Full **DE/EN** language toggle (stored per browser).
- Shareable: OpenGraph preview tags and a mountain favicon.

---

## How it works

- Built with **GitHub Pages (Jekyll)**: no server, no database.
- **Data sync**: recent hiking activities are pulled from **Garmin Connect** by a scheduled GitHub Action and written into `data/track.geojson` and `data/latest.json` (in waiting mode into `data/test/`). See `scripts/GARMIN_SETUP.md`.
- **Site check**: after every deploy a GitHub Action opens all pages in a real browser (desktop and phone) and opens an issue if something is broken.
- **Elevation profile** data is precomputed into `data/pct_profile.json` (total_km 4196.7) by `scripts/build_elevation.py`.
- **Photos** load client-side from the Flickr API; **gear** is an embedded LighterPack list.
- **Gear cards** are generated from the public LighterPack list (`lighterpack_id` in `_config.yml`) by `scripts/gear_sync.py`, run every 3 hours by a GitHub Action into `_data/gear.json`. Edit the list in LighterPack (phone is fine); no CSV export needed. To switch lists, change `lighterpack_id` in one place.
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
│   ├── gear-sync.yml          # Sync gear cards from LighterPack (every 3 h)
│   ├── build-elevation.yml    # Build the PCT elevation profile data
│   └── keep-alive.yml         # Keep scheduled workflows alive
├── _data/
│   └── gear.json              # Gear card numbers (auto-updated from LighterPack)
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
│   ├── gear_sync.py           # LighterPack list -> _data/gear.json
│   ├── build_elevation.py     # Build data/pct_profile.json
│   └── strava_sync.py         # Legacy Strava sync
├── index.md                   # Karte / Map
├── stats.md                   # Statistik / Stats
├── photos.md                  # Fotos / Photos
├── updates.md                 # Tagebuch / Diary
├── gear.md                    # Ausrüstung / Gear
└── _config.yml
```
