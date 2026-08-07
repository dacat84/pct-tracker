# PCT Tracker

A lightweight personal trail tracker built with GitHub Pages.

Live map, stats, photos, and trail updates — synced automatically from Strava. Designed to be simple, robust, and editable from a phone while on trail.

---

## What this site does

- **Map**
  - Displays your recorded trail track (synced from Strava)
  - PCT full route shown as a thin background line for context
  - Live position marker with blinking dot

- **Statistics**
  - Total distance, elevation, time, average speed
  - Per-activity averages

- **Insights**
  - Last active day: km, time, elevation, number of segments
  - Recent days bar chart (up to 7 active days)
  - PCT progress bar with km/mi remaining
  - Timeline: first/last activity, active days, rest days
  - Longest and shortest day

- **Trail Updates**
  - Simple text-based updates written in Markdown
  - Fast to edit from a phone while on trail

- **Photos**
  - Auto-synced from a Flickr album
  - No local image management needed

- **Gear**
  - Embedded gear list from [lighterpack.com](https://lighterpack.com)
  - Always up to date without manual copying

---

## How it works

- Built with **GitHub Pages (Jekyll)** — no server, no database
- Activity data synced automatically via a **GitHub Actions workflow** (Strava API)
- A **keep-alive workflow** runs every 2 weeks to prevent GitHub from disabling the repo
- Strava token age is monitored — a warning appears in the logs after 150 days
- Track coordinates are **downsampled** to max 300 points per activity to keep the map fast
- The PCT centerline is loaded from `data/Full_PCT_Simplified.geojson` (official PCTA data)

---

## Folder structure

```
.
├── .github/
│   └── workflows/
│       ├── strava_sync.yml      # Auto-sync track from Strava (hourly)
│       └── keep-alive.yml       # Keeps repo active (runs 1st & 15th of month)
├── _layouts/                    # Jekyll page layouts
├── assets/
│   ├── css/style.css            # All styles
│   └── js/map.js                # Map, stats, insights logic
├── data/
│   ├── track.geojson            # Your recorded track (auto-updated)
│   ├── latest.json              # Latest position (auto-updated)
│   ├── strava_state.json        # Sync state & token info
│   └── Full_PCT_Simplified.geojson  # PCT centerline (PCTA, CC BY 4.0)
├── scripts/
│   └── strava_sync.py           # Python sync script
