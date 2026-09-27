#!/usr/bin/env python3
"""
LighterPack -> gear summary cards on the Gear page.

Reads the public LighterPack list (id = `lighterpack_id` in _config.yml),
takes the base weight exactly as LighterPack calculates it, sums the
categories that feed the three highlight cards, and writes _data/gear.json.
Jekyll builds the Gear page from that file, so the cards always match the
LighterPack list. Edit the list in LighterPack (phone is fine), the next run
picks it up. No CSV export needed.

Safety: if the page can't be fetched or anything looks implausible, the
script exits with an error and leaves _data/gear.json untouched, so the site
keeps showing the last good numbers.
"""
import datetime
import json
import os
import re
import sys
import time
import urllib.request

from bs4 import BeautifulSoup

CONFIG_PATH = "_config.yml"
OUT_PATH = "_data/gear.json"

# Which LighterPack categories feed which card (names are matched
# case-insensitively). Rename a category in LighterPack -> update it here.
BOXES = {
    "shelter_g": ["Shelter", "Stakes"],
    "sleep_g": ["Sleep"],
    "pack_g": ["Pack"],
}

USER_AGENT = ("Mozilla/5.0 (compatible; pct-tracker-gear-sync/1.0; "
              "+https://dacat84.github.io/pct-tracker/)")


def read_list_id():
    env = os.environ.get("LIGHTERPACK_ID", "").strip()
    if env:
        return env
    with open(CONFIG_PATH, encoding="utf-8") as f:
        for line in f:
            m = re.match(r'\s*lighterpack_id:\s*["\']?([A-Za-z0-9]+)', line)
            if m:
                return m.group(1)
    sys.exit("::error::No lighterpack_id found in _config.yml")


def fetch(list_id):
    url = f"https://lighterpack.com/r/{list_id}"
    last_err = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:  # network hiccup: retry a couple of times
            last_err = e
            time.sleep(5 * (attempt + 1))
    sys.exit(f"::error::Could not fetch {url}: {last_err}")


def parse(html):
    """Return ({category: base_mg}, lighterpack_base_mg, lighterpack_worn_mg)."""
    soup = BeautifulSoup(html, "html.parser")
    cats = {}
    for cat in soup.select("li.lpCategory"):
        name_el = cat.select_one(".lpCategoryName")
        if not name_el:
            continue
        name = name_el.get_text(strip=True)
        base_mg = 0.0
        for it in cat.select("li.lpItem"):
            mg_el = it.select_one("input.lpMG")
            if mg_el is None:  # empty placeholder rows without a weight
                continue
            try:
                mg = float(mg_el.get("value") or 0)
            except ValueError:
                mg = 0.0
            qty_el = it.select_one(".lpQtyCellValue")
            try:
                qty = float(qty_el.get_text(strip=True)) if qty_el else 1.0
            except ValueError:
                qty = 1.0
            worn = it.select_one(".lpWorn.lpActive") is not None
            cons = it.select_one(".lpConsumable.lpActive") is not None
            if not worn and not cons:
                base_mg += mg * qty
        cats[name] = cats.get(name, 0.0) + base_mg

    def total(cls):
        el = soup.select_one(f"ul.lpTotals li.{cls} .lpDisplaySubtotal")
        try:
            return float(el["mg"]) if el is not None else None
        except (KeyError, ValueError):
            return None

    return cats, total("lpBaseWeight"), total("lpWornWeight")


def main():
    list_id = read_list_id()
    html = fetch(list_id)
    cats, lp_base, lp_worn = parse(html)
    print(f"LighterPack list {list_id}: {len(cats)} categories found")

    if len(cats) < 3:
        sys.exit("::error::Too few categories parsed; LighterPack page format "
                 "may have changed. Leaving _data/gear.json untouched.")

    computed_base = sum(cats.values())
    base_mg = lp_base if lp_base is not None else computed_base
    if lp_base is not None and abs(lp_base - computed_base) > 1000:
        print(f"::warning::Own sum ({computed_base/1000:.0f} g) differs from "
              f"LighterPack base weight ({lp_base/1000:.0f} g); using LighterPack's.")

    lower = {k.lower(): v for k, v in cats.items()}
    out = {"list_id": list_id}
    base_g = round(base_mg / 1000)
    out["base_g"] = base_g
    out["base_kg_en"] = f"{base_mg / 1_000_000:.2f}"
    out["base_kg_de"] = out["base_kg_en"].replace(".", ",")
    out["worn_g"] = round((lp_worn or 0) / 1000)

    for key, names in BOXES.items():
        missing = [n for n in names if n.lower() not in lower]
        if missing:
            sys.exit(f"::error::Category {missing} not found in LighterPack list "
                     f"(found: {sorted(cats)}). Rename it back or update BOXES "
                     f"in scripts/gear_sync.py. Leaving _data/gear.json untouched.")
        out[key] = round(sum(lower[n.lower()] for n in names) / 1000)

    # Plausibility: an ultralight base weight, and every card > 0.
    if not (500 <= base_g <= 20000):
        sys.exit(f"::error::Implausible base weight {base_g} g. Not updating.")
    for key in BOXES:
        if out[key] <= 0:
            sys.exit(f"::error::{key} is 0 g. Not updating.")

    for k, v in out.items():
        print(f"  {k}: {v}")

    old = {}
    if os.path.exists(OUT_PATH):
        with open(OUT_PATH, encoding="utf-8") as f:
            try:
                old = json.load(f)
            except json.JSONDecodeError:
                old = {}
    if {k: v for k, v in old.items() if k != "updated"} == out:
        print("Unchanged, nothing to write.")
        return

    out["updated"] = datetime.date.today().isoformat()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {OUT_PATH}.")


if __name__ == "__main__":
    main()
