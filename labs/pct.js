// PCT Labs: shared core for the test designs (data, landmarks, photos, hiker marker).
// Not linked from the live site. Data source: ?data=demo (default) | test | live.
(function () {
  "use strict";
  var BASE = "/pct-tracker/";
  var qs = new URLSearchParams(location.search);
  var SRC = qs.get("data") || "demo";
  var DIR = { demo: "data/demo/", test: "data/test/", live: "data/" }[SRC] || "data/demo/";
  var NOMINAL = 4265, MI2KM = 1.60934;
  var START = "2027-04-22";   // official start (PCTA permit), same as tracker.start in _config.yml
  // Language: same setting as the live site (localStorage pctLang). EN shows miles and feet.
  var LANG = "de"; try { LANG = localStorage.getItem("pctLang") === "en" ? "en" : "de"; } catch (e) {}
  var EN = LANG === "en", LOC = EN ? "en-US" : "de-DE";
  function T(de, en) { return EN ? en : de; }

  // Sections of the trail (km on the nominal 4265 km scale) and landmarks [mile, name, type, tier].
  var REGIONS = [
    { de: "Südkalifornien", en: "Southern California", short: "Wüste", en_s: "Desert", a: 0, b: 1130, c: "#e0a06a" },
    { de: "Zentralsierra", en: "Central Sierra", short: "Sierra", en_s: "Sierra", a: 1130, b: 1637, c: "#9dbf78" },
    { de: "Nördliche Sierra", en: "Northern Sierra", short: "Nördl. Sierra", en_s: "N. Sierra", a: 1637, b: 2270, c: "#7fb08a" },
    { de: "Nordkalifornien", en: "Northern California", short: "Nordkalifornien", en_s: "NorCal", a: 2270, b: 2720, c: "#6fae9e" },
    { de: "Oregon", en: "Oregon", short: "Oregon", en_s: "Oregon", a: 2720, b: 3455, c: "#8aa4c0" },
    { de: "Washington", en: "Washington", short: "Washington", en_s: "Washington", a: 3455, b: 4265, c: "#b39ac8" }
  ];
  var LM = [[0,"Campo","term",1],[20,"Lake Morena","water",3],[42,"Mt. Laguna","town",2],[77,"Scissors Crossing","pass",3],[109,"Warner Springs","town",3],[127,"Agua Caliente","park",3],[152,"Paradise Valley Café","town",3],[179,"Idyllwild","town",2],[187,"San Jacinto Peak","peak",2],[210,"San Gorgonio Pass","pass",2],[266,"Big Bear","town",2],[308,"Deep Creek Hot Springs","water",2],[342,"Cajon Pass","pass",2],[369,"Wrightwood","town",2],[379,"Mt. Baden-Powell","peak",1],[444,"Acton","town",3],[452,"Vasquez Rocks","park",3],[454,"Agua Dulce","town",2],[517,"Mojave Desert","desert",2],[566,"Tehachapi","town",2],[652,"Walker Pass","pass",2],[702,"Kennedy Meadows S","town",1],[750,"Cottonwood Pass","pass",3],[767,"Mt. Whitney","peak",1],[779,"Forester Pass","pass",1],[792,"Glen Pass","pass",2],[807,"Pinchot Pass","pass",3],[815,"Mather Pass","pass",2],[843,"Muir Pass","pass",2],[857,"Muir Trail Ranch","town",3],[878,"Vermilion Valley Resort","town",3],[906,"Reds Meadow","town",3],[910,"Mammoth Lakes","town",2],[942,"Tuolumne Meadows","town",1],[1017,"Sonora Pass","pass",2],[1032,"Ebbetts Pass","pass",3],[1077,"Carson Pass","pass",3],[1090,"Lake Tahoe","water",1],[1094,"South Lake Tahoe","town",2],[1153,"Donner Pass","pass",2],[1195,"Sierra Buttes","peak",3],[1250,"Bucks Summit","pass",3],[1287,"Belden","town",3],[1325,"Halfway Point","term",1],[1352,"Lassen Peak","peak",2],[1378,"Subway Cave","water",3],[1410,"Burney","town",3],[1418,"Burney Falls","water",2],[1500,"Mt. Shasta","peak",1],[1501,"Castle Crags","park",2],[1599,"Etna","town",3],[1656,"Seiad Valley","town",2],[1690,"Oregon Border","term",1],[1726,"Ashland","town",2],[1775,"Mt. McLoughlin","peak",3],[1820,"Crater Lake","water",1],[1880,"Diamond Peak","peak",3],[1907,"Willamette Pass","pass",3],[1965,"Three Sisters","peak",2],[1990,"McKenzie Pass","pass",3],[2001,"Santiam Pass","pass",3],[2005,"Three Fingered Jack","peak",3],[2030,"Mt. Jefferson","peak",2],[2045,"Olallie Lake","water",3],[2097,"Mt. Hood","peak",1],[2098,"Timberline Lodge","town",2],[2120,"Tunnel Falls","water",3],[2144,"Cascade Locks","town",1],[2147,"Washington Border","term",1],[2225,"Mt. Adams","peak",2],[2265,"Goat Rocks","peak",2],[2295,"White Pass","pass",3],[2320,"Mt. Rainier","peak",2],[2393,"Snoqualmie Pass","pass",2],[2400,"Kendall Katwalk","peak",3],[2461,"Stevens Pass","pass",2],[2530,"Glacier Peak","peak",2],[2572,"Stehekin","town",2],[2591,"Rainy Pass","pass",3],[2620,"Harts Pass","pass",3],[2650,"Northern Terminus","term",1]];
  // Features that are not on the trail itself: real position. side = a side trip from the trail (dashed link).
  // Real positions for landmarks that are not exactly on the trail (summits, lakes, falls).
  // Whether something counts as "off the trail" is worked out from the distance to the PCT line.
  var OFF = {
    "Mt. Whitney": [36.5785, -118.2923], "San Jacinto Peak": [33.8147, -116.6794], "Mt. Baden-Powell": [34.3586, -117.7647],
    "Mt. Shasta": [41.4092, -122.1949], "Lassen Peak": [40.4882, -121.5050], "Mt. Hood": [45.3736, -121.6959], "Mt. Rainier": [46.8529, -121.7604],
    "Mt. Adams": [46.2024, -121.4909], "Mt. Jefferson": [44.6743, -121.7995], "Three Sisters": [44.1033, -121.7693], "Glacier Peak": [48.1125, -121.1139],
    "Mt. McLoughlin": [42.4451, -122.3155], "Diamond Peak": [43.5207, -122.1496], "Three Fingered Jack": [44.4767, -121.8441],
    "Crater Lake": [42.9446, -122.1090], "Lake Tahoe": [39.0968, -120.0324], "Sierra Buttes": [39.5943, -120.6406],
    "Deep Creek Hot Springs": [34.3394, -117.1769], "Tunnel Falls": [45.5849, -121.8520], "Burney Falls": [41.0122, -121.6513],
    "Subway Cave": [40.6839, -121.4186], "Goat Rocks": [46.5150, -121.4547]
  };
  // Positions of passes and road crossings (summit coordinates), snapped to the nearest point of the
  // PCT line. Only the low crossings ("low") look for the lowest trail point nearby.
  var PASS = {
    "Scissors Crossing": [33.0998, -116.4700, "low"], "San Gorgonio Pass": [33.9230, -116.6930, "low"], "Cajon Pass": [34.3070, -117.4660, "low"],
    "Walker Pass": [35.6633, -118.0270], "Cottonwood Pass": [36.4530, -118.2140], "Forester Pass": [36.6944, -118.3714], "Glen Pass": [36.7888, -118.4126],
    "Pinchot Pass": [36.9358, -118.4056], "Mather Pass": [37.0263, -118.4628], "Muir Pass": [37.1120, -118.6703], "Sonora Pass": [38.3286, -119.6368],
    "Ebbetts Pass": [38.5446, -119.8131], "Carson Pass": [38.6947, -119.9890], "Donner Pass": [39.3170, -120.3290], "Bucks Summit": [39.8999, -121.1186],
    "Willamette Pass": [43.5966, -122.0373], "McKenzie Pass": [44.2603, -121.8100], "Santiam Pass": [44.4253, -121.8546], "White Pass": [46.6440, -121.3810],
    "Snoqualmie Pass": [47.4243, -121.4135], "Stevens Pass": [47.7463, -121.0857], "Rainy Pass": [48.5157, -120.7357], "Harts Pass": [48.7210, -120.6690],
    // other points right on the trail (checked against komoot / Wikipedia / the state lines)
    "Campo": [32.5897, -116.4670], "Lake Morena": [32.6858, -116.5193], "Agua Caliente": [33.3017, -116.6287], "Vasquez Rocks": [34.4878, -118.3197],
    "Halfway Point": [40.2099, -121.3559], "Castle Crags": [41.1478, -122.3197], "Oregon Border": [42.0001, -122.9112], "Olallie Lake": [44.8079, -121.7883],
    "Washington Border": [45.6623, -121.8986], "Kendall Katwalk": [47.4518, -121.3787], "Northern Terminus": [49.0003, -120.8021]
  };
  // Real heights (m) of summits, passes and lakes; everything else uses the trail height at that point.
  var ELEV = {
    "San Jacinto Peak": 3302, "Mt. Baden-Powell": 2865, "Mt. Whitney": 4421, "Sierra Buttes": 2619, "Lassen Peak": 3187, "Mt. Shasta": 4322,
    "Mt. McLoughlin": 2894, "Diamond Peak": 2665, "Three Sisters": 3159, "Three Fingered Jack": 2390, "Mt. Jefferson": 3199, "Mt. Hood": 3429,
    "Mt. Adams": 3743, "Goat Rocks": 2402, "Mt. Rainier": 4392, "Glacier Peak": 3213,
    "Scissors Crossing": 686, "San Gorgonio Pass": 363, "Cajon Pass": 914, "Walker Pass": 1599, "Cottonwood Pass": 3402, "Forester Pass": 4009,
    "Glen Pass": 3635, "Pinchot Pass": 3697, "Mather Pass": 3688, "Muir Pass": 3644, "Sonora Pass": 2933, "Ebbetts Pass": 2661, "Carson Pass": 2613,
    "Donner Pass": 2151, "Bucks Summit": 1663, "Willamette Pass": 1563, "McKenzie Pass": 1623, "Santiam Pass": 1468, "White Pass": 1372,
    "Snoqualmie Pass": 919, "Stevens Pass": 1238, "Rainy Pass": 1480, "Harts Pass": 1889,
    "Lake Tahoe": 1897, "Crater Lake": 1883, "Tunnel Falls": 370
  };
  var TYPE = {
    term: { de: "Terminus", en: "Terminus", c: "#ff4d2e", i: "★" }, town: { de: "Ort / Resupply", en: "Town / resupply", c: "#f5b301", i: "⌂" },
    pass: { de: "Pass", en: "Pass", c: "#7ed6a5", i: "⋀" }, peak: { de: "Gipfel", en: "Peak", c: "#ffffff", i: "▲" },
    water: { de: "Wasser / Sehenswert", en: "Water / feature", c: "#6ec6ff", i: "≈" }, park: { de: "Park / Wildnis", en: "Park / wilderness", c: "#9dbf78", i: "♣" },
    desert: { de: "Wüste", en: "Desert", c: "#e0a06a", i: "☀" }
  };

  function hav(a, b, c, d) {
    var R = 6371.0088, p1 = a * Math.PI / 180, p2 = c * Math.PI / 180, dp = p2 - p1, dl = (d - b) * Math.PI / 180;
    return 2 * R * Math.asin(Math.sqrt(Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
  }
  function J(p) { return fetch(BASE + p, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }); }
  function nf(v, d) { return Number(v).toLocaleString(LOC, { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  // distances / elevations in the right unit: dist(km) -> "12 km" | "7.5 mi", elev(m) -> "1.600 m" | "5,249 ft"
  function distV(km) { return EN ? km / MI2KM : km; } function DU() { return EN ? "mi" : "km"; }
  function dist(km, d) { return nf(distV(km), d || 0) + "\u00a0" + DU(); }
  function nw(s) { return '<span style="white-space:nowrap">' + s + "</span>"; }   // keep a phrase on one line
  function nwList(s) { return String(s).split(" · ").map(nw).join(" · "); }
  function elevV(m) { return EN ? m * 3.28084 : m; } function EU() { return EN ? "ft" : "m"; }
  function elev(m) { return nf(elevV(m), 0) + "\u00a0" + EU(); }
  function dfmt(d, o) { return new Date(d).toLocaleString(LOC, o); }

  function snap(pts, lat, lon) {
    var best = null, bd = 1e18;
    for (var i = 0; i < pts.length; i++) { var d = hav(lat, lon, pts[i].lat, pts[i].lon); if (d < bd) { bd = d; best = pts[i]; } }
    return best ? { km: best.km, m: best.m, lat: best.lat, lon: best.lon, off: bd } : null;
  }
  function atKm(pts, km) {
    var lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (pts[mid].km < km) lo = mid; else hi = mid; }
    return pts[Math.abs(pts[lo].km - km) < Math.abs(pts[hi].km - km) ? lo : hi];
  }

  // ---- Hiker marker (SVG, CSS animated): walks, or falls over and sleeps next to the tent ----
  var HIKER_CSS = "" +
    ".hk{width:84px;height:84px;position:relative;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}" +
    ".hk svg{overflow:visible}" +
    ".hk .leg,.hk .arm{transform-box:fill-box}" +
    ".hk .legA{transform-origin:50% 0;animation:hkLeg .7s ease-in-out infinite}" +
    ".hk .legB{transform-origin:50% 0;animation:hkLeg .7s ease-in-out infinite reverse}" +
    ".hk .armA{transform-origin:50% 0;animation:hkLeg .7s ease-in-out infinite reverse}" +
    ".hk .pole{transform-origin:50% 0;animation:hkLeg .7s ease-in-out infinite reverse}" +
    ".hk .body{animation:hkBob .35s ease-in-out infinite alternate}" +
    "@keyframes hkLeg{0%{transform:rotate(28deg)}50%{transform:rotate(-28deg)}100%{transform:rotate(28deg)}}" +
    "@keyframes hkBob{from{transform:translateY(0)}to{transform:translateY(-1.5px)}}" +
    ".hk .tent{opacity:0;transition:opacity .6s .9s}" +
    ".hk .zz{opacity:0}" +
    ".hk.sleep .person{transform-origin:20px 52px;transform:rotate(-90deg) translate(-4px,2px);transition:transform .55s cubic-bezier(.5,-0.4,.7,1.4)}" +
    ".hk.sleep .legA,.hk.sleep .legB,.hk.sleep .armA,.hk.sleep .pole,.hk.sleep .body{animation:none}" +
    ".hk.sleep .tent{opacity:1}" +
    ".hk.sleep .zz{animation:hkZ 2.6s ease-in infinite 1.2s}" +
    ".hk.sleep .zz.b{animation-delay:2.1s}.hk.sleep .zz.c{animation-delay:3s}" +
    "@keyframes hkZ{0%{opacity:0;transform:translate(0,0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translate(10px,-22px) scale(1.25)}}" +
    ".hk .bub{position:absolute;left:50%;bottom:80px;transform:translateX(-50%);white-space:nowrap;font:600 12px/1 Inter,system-ui,sans-serif;background:#fff;color:#14202a;padding:5px 9px;border-radius:12px;box-shadow:0 3px 10px rgba(0,0,0,.3)}" +
    ".hk .bub b{color:#e0452f}";
  function hikerEl(state, label) {
    if (!document.getElementById("hk-css")) { var s = document.createElement("style"); s.id = "hk-css"; s.textContent = HIKER_CSS; document.head.appendChild(s); }
    var el = document.createElement("div");
    el.className = "hk " + (state || "walk");
    // ink outline, comic style
    var ink = "#14202a";
    el.innerHTML =
      (label ? '<div class="bub">' + label + "</div>" : "") +
      '<svg viewBox="0 0 64 64" width="84" height="84">' +
      // tent (shown when sleeping)
      '<g class="tent"><path d="M30 54 L44 30 L58 54 Z" fill="#f5b301" stroke="' + ink + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M44 30 L44 54" stroke="' + ink + '" stroke-width="1.6"/><path d="M40 54 L44 42 L48 54" fill="#14202a" opacity=".8"/></g>' +
      '<ellipse cx="22" cy="55" rx="12" ry="2.6" fill="rgba(0,0,0,.25)"/>' +
      '<g class="person">' +
      '<g class="leg legB"><path d="M20 38 L20 52" stroke="' + ink + '" stroke-width="4.2" stroke-linecap="round"/></g>' +
      '<g class="body">' +
      '<rect x="10" y="20" width="9" height="15" rx="3" fill="#2235d6" stroke="' + ink + '" stroke-width="2.2"/>' +   // backpack
      '<path d="M20 22 L20 38" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>' +                         // torso
      '<path d="M20 22 L20 37" stroke="#e0452f" stroke-width="2.6" stroke-linecap="round"/>' +                         // shirt
      '<circle cx="21" cy="15" r="5.6" fill="#ffd9b8" stroke="' + ink + '" stroke-width="2.2"/>' +                     // head
      '<path d="M16.4 10.6 Q16.8 5 21.4 5 Q26 5 25.8 10.6 Z" fill="#f5b301" stroke="' + ink + '" stroke-width="1.8" stroke-linejoin="round"/>' + // hat
      '<path d="M13.6 10.8 L29.4 10.8" stroke="' + ink + '" stroke-width="2" stroke-linecap="round"/>' +
      '<circle cx="23.4" cy="15.6" r=".9" fill="' + ink + '"/>' +
      '<g class="arm armA"><path d="M21 24 L23 33" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"/></g>' +
      '<g class="pole"><path d="M23 25 L28 50" stroke="#8a959d" stroke-width="1.6" stroke-linecap="round"/></g>' +
      "</g>" +
      '<g class="leg legA"><path d="M20 38 L20 52" stroke="' + ink + '" stroke-width="4.2" stroke-linecap="round"/></g>' +
      "</g>" +
      '<text class="zz" x="6" y="42" font-family="Inter,sans-serif" font-weight="800" font-size="9" fill="#fff" stroke="' + ink + '" stroke-width=".6">z</text>' +
      '<text class="zz b" x="10" y="35" font-family="Inter,sans-serif" font-weight="800" font-size="11" fill="#fff" stroke="' + ink + '" stroke-width=".6">z</text>' +
      '<text class="zz c" x="15" y="27" font-family="Inter,sans-serif" font-weight="800" font-size="13" fill="#fff" stroke="' + ink + '" stroke-width=".6">Z</text>' +
      "</svg>";
    return el;
  }
  // Asleep when the last activity ended more than 3 h ago, or it is night at the trail (Pacific time, 21:00 to 06:00).
  function hikerState(latestTs) {
    var forced = qs.get("hiker"); if (forced === "walk" || forced === "sleep") return forced;
    var h = Number(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false })) % 24;
    if (h >= 21 || h < 6) return "sleep";
    var t = Date.parse(latestTs || ""); if (!isFinite(t)) return "sleep";
    return (Date.now() - t) > 3 * 3600 * 1000 ? "sleep" : "walk";
  }

  // ---- Photos without GPS: put them on the track by the time they were taken ----
  // Flickr gives the camera's local time without a zone, so it is read in the zone of the
  // track (Pacific on the PCT, Berlin for the test walks at home). Inside an activity the
  // position is interpolated by time; outside one (pause, camp) the nearest end is used.
  function tzOffset(zone, ms) {
    var p = {}; new Intl.DateTimeFormat("en-US", { timeZone: zone, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - ms;
  }
  function placePhotos(ph, D) {
    var acts = D.track.features.map(function (f) {
      var pr = f.properties, c = f.geometry.coordinates;
      if (pr.t && pr.t.length === c.length) {   // exact: the sync stores the time of every map point
        var t0 = Date.parse(pr.t0 || pr.start_date);
        return { s: t0, e: t0 + pr.t[pr.t.length - 1] * 1000, c: c, t: pr.t.map(function (x) { return t0 + x * 1000; }) };
      }
      var s = Date.parse(pr.start_date);
      return { s: s, e: s + (pr.moving_time_s || 0) * 1000 * 1.25, c: c };   // old data: guess from moving time
    });
    if (!acts.length) return ph;
    ph.forEach(function (p) {
      if ((p.lat && p.lon) || !p.taken) return;
      var c0 = acts[0].c[0], zone = c0[0] < -30 ? "America/Los_Angeles" : "Europe/Berlin";
      var loc = Date.parse(p.taken.replace(" ", "T") + "Z"), t = loc - tzOffset(zone, loc);
      var best = null, bd = 6 * 3600 * 1000;   // only within 6 h of a recorded walk
      acts.forEach(function (a) {
        var d = t < a.s ? a.s - t : t > a.e ? t - a.e : 0, ll;
        if (d < bd) { bd = d;
          if (!d && a.t) { var j = 0; while (j < a.t.length - 1 && a.t[j + 1] <= t) j++;
            var j2 = Math.min(a.t.length - 1, j + 1), f2 = a.t[j2] > a.t[j] ? (t - a.t[j]) / (a.t[j2] - a.t[j]) : 0;
            ll = [a.c[j][0] + (a.c[j2][0] - a.c[j][0]) * f2, a.c[j][1] + (a.c[j2][1] - a.c[j][1]) * f2]; }
          else if (!d) { var r = (t - a.s) / (a.e - a.s || 1), k = Math.min(a.c.length - 1, Math.round(r * (a.c.length - 1))); ll = a.c[k]; }
          else ll = t < a.s ? a.c[0] : a.c[a.c.length - 1];
          best = ll; }
      });
      if (best) { p.lon = best[0]; p.lat = best[1]; p.est = true; }
    });
    return ph;
  }

  // ---- Flickr photos of the PCT album, with geo where the phone saved it ----
  var FLICKR = { key: "a8b28521e8527042f868d9b98b567ff3", user: "35469735@N03", set: "72177720331905792" };
  function photos() {
    return new Promise(function (res) {
      var cb = "fl_" + Math.random().toString(36).slice(2), s = document.createElement("script");
      window[cb] = function (d) { delete window[cb]; s.remove(); res(((d && d.photoset && d.photoset.photo) || []).map(function (p) {
        var lat = parseFloat(p.latitude), lon = parseFloat(p.longitude);
        return { id: p.id, title: p.title, taken: p.datetaken, q: p.url_q, m: p.url_m || p.url_z, l: p.url_l || p.url_c || p.url_z,
          lat: lat || null, lon: lon || null, href: "https://www.flickr.com/photos/" + FLICKR.user + "/" + p.id };
      }).sort(function (a, b) { return String(b.taken).localeCompare(String(a.taken)); })); };
      s.src = "https://www.flickr.com/services/rest/?method=flickr.photosets.getPhotos&format=json&jsoncallback=" + cb +
        "&api_key=" + FLICKR.key + "&user_id=" + encodeURIComponent(FLICKR.user) + "&photoset_id=" + FLICKR.set +
        "&extras=" + encodeURIComponent("geo,date_taken,url_q,url_m,url_z,url_c,url_l");
      s.onerror = function () { res([]); }; document.head.appendChild(s);
      setTimeout(function () { res([]); }, 8000);
    });
  }

  // ---- Load everything and derive what the designs need ----
  function load() {
    return Promise.all([J("data/pct_profile.json"), J(DIR + "track.geojson").catch(function () { return { features: [] }; }),
      J(DIR + "latest.json").catch(function () { return null; }), J("data/Full_PCT_Simplified.geojson"),
      J("labs/diary.json").catch(function () { return window.PCT_DIARY || []; }),
      J(DIR + "manual.json").catch(function () { return []; }),
      J(DIR + "closures.json").catch(function () { return []; })])
      .then(function (r) {
        var prof = r[0], track = r[1], latest = r[2], line = r[3], diary = r[4] || [], pts = prof.points, F = prof.total_km / NOMINAL;
        var feats = (track.features || []).filter(function (f) { return f.geometry && f.geometry.coordinates && f.geometry.coordinates.length; })
          .sort(function (a, b) { return String(a.properties.start_date).localeCompare(String(b.properties.start_date)); });
        // Fallback when Garmin is down: positions reported by message, kept in manual.json
        // ([{ "ts": "2027-05-03T18:00:00-07:00", "lat": .., "lon": .., "note": "Idyllwild" }]).
        // A report newer than the last Garmin data becomes the current position.
        var manual = (Array.isArray(r[5]) ? r[5] : []).filter(function (m) { return typeof m.lat === "number" && typeof m.lon === "number" && m.ts; })
          .sort(function (a, b) { return Date.parse(a.ts) - Date.parse(b.ts); });
        var lastMan = manual[manual.length - 1];
        if (lastMan && (!latest || !latest.ts || Date.parse(lastMan.ts) > Date.parse(latest.ts)))
          latest = { lat: lastMan.lat, lon: lastMan.lon, ts: lastMan.ts, manual: true, note: lastMan.note || "" };
        var here = latest && typeof latest.lat === "number" ? snap(pts, latest.lat, latest.lon) : null;
        if (!here || here.off > 50) here = { km: 0, m: pts[0].m, lat: pts[0].lat, lon: pts[0].lon, off: 0 };
        // fine PCT line (the profile points are ~2 km apart, too coarse to tell "on" from "beside" the trail)
        var lc = []; (line.features || []).forEach(function (f) { var g = f.geometry; (g.type === "LineString" ? [g.coordinates] : g.coordinates).forEach(function (part) { lc = lc.concat(part); }); });
        function nearLine(lat, lon) { var b = null, bd = 1e18; for (var i = 0; i < lc.length; i++) { var d = hav(lat, lon, lc[i][1], lc[i][0]); if (d < bd) { bd = d; b = lc[i]; } } return { ll: b, d: bd }; }
        var lms = LM.map(function (m) {
          var km = m[0] * MI2KM * F, o = OFF[m[1]], p = o ? snap(pts, o[0], o[1]) : atKm(pts, km), near = null;
          if (o) { km = p.km; near = nearLine(o[0], o[1]); }
          var ps = PASS[m[1]];
          if (ps) {   // passes: extreme trail point within 4 km of the given position
            var s0 = snap(pts, ps[0], ps[1]), bestP = s0;
            if (ps[2]) pts.forEach(function (q) { if (Math.abs(q.km - s0.km) <= 4 && (ps[2] === "low" ? q.m < bestP.m : q.m > bestP.m)) bestP = q; });
            var nl = ps[2] ? nearLine(bestP.lat, bestP.lon) : nearLine(ps[0], ps[1]); km = bestP.km;
            return { name: m[1], type: m[2], tier: m[3], km: km, lat: nl.ll[1], lon: nl.ll[0], m: ELEV[m[1]] || bestP.m, tm: bestP.m, side: false, off: 0, trail: nl.ll };
          }
          var side = !!(near && near.d > 0.6);   // more than 600 m from the trail: own point + yellow link line
          return { name: m[1], type: m[2], tier: m[3], km: km, lat: o ? o[0] : p.lat, lon: o ? o[1] : p.lon, m: ELEV[m[1]] || p.m, tm: p.m, side: side,
            off: near ? near.d : 0, trail: near ? near.ll : [p.lon, p.lat] };
        });
        var regs = REGIONS.map(function (g) { return Object.assign({}, g, { ka: g.a * F, kb: g.b * F }); });
        var reg = regs.find(function (g) { return here.km >= g.ka && here.km < g.kb; }) || regs[regs.length - 1];
        // local calendar day of every activity (Pacific on the PCT, Berlin for test walks at home):
        // start_date is UTC, and from 17:00 in California UTC is already the next day
        feats.forEach(function (f) {
          var c0 = f.geometry.coordinates[0], zone = c0[0] < -30 ? "America/Los_Angeles" : "Europe/Berlin";
          f.properties.day = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(f.properties.start_date));
        });
        var days = {};
        feats.forEach(function (f) {
          var d = f.properties.day;
          days[d] = days[d] || { date: d, km: 0, up: 0, sec: 0 }; days[d].km += (f.properties.distance_m || 0) / 1000; days[d].up += f.properties.elevation_gain_m || 0; days[d].sec += f.properties.moving_time_s || 0;
        });
        var dayList = Object.keys(days).sort().map(function (k) { return days[k]; });
        var dayIx = {}; dayList.forEach(function (d, i) { dayIx[d.date] = i; });
        feats.forEach(function (f) { f.properties.dayIdx = dayIx[f.properties.day]; });
        // camp = last point of the last activity of each day
        var camps = dayList.map(function (d, i) {
          var fs = feats.filter(function (f) { return f.properties.dayIdx === i; }), last = fs[fs.length - 1], c = last.geometry.coordinates;
          var ll = c[c.length - 1], nx = dayList[i + 1];
          // zero days = calendar days without walking before the next active day
          var zero = nx ? Math.max(0, Math.round((Date.parse(nx.date) - Date.parse(d.date)) / 86400000) - 1) : 0;
          var town = null, bd = 30;   // nearest resupply town within 30 km
          TOWNS.forEach(function (tw) { var dd = hav(ll[1], ll[0], tw[1], tw[2]); if (dd < bd) { bd = dd; town = tw; } });
          return { day: i + 1, date: d.date, km: d.km, lnglat: ll, zero: zero, town: town ? { name: town[0], lnglat: [town[2], town[1]] } : null };
        });
        // nero = hiked that day, slept in town, back on the trail at the same spot the next day (no zero in between)
        var accPts = TOWNS.map(function (tw) { var a = ACCESS[tw[0]]; return { name: tw[0], lat: a ? a[1] : tw[1], lon: a ? a[2] : tw[2], tlat: tw[1], tlon: tw[2] }; });
        dayList.forEach(function (d, i) {
          d.nero = null; var c = camps[i], nx = camps[i + 1]; if (!c || !nx || c.zero) return;
          var nf = feats.filter(function (f) { return f.properties.dayIdx === i + 1; })[0].geometry.coordinates[0], b = c.lnglat;
          if (hav(b[1], b[0], nf[1], nf[0]) > 2) return;   // next day starts somewhere else
          accPts.forEach(function (tw) { if (!d.nero && (hav(b[1], b[0], tw.lat, tw.lon) < 3 || hav(b[1], b[0], tw.tlat, tw.tlon) < 3)) d.nero = tw.name; });
          c.nero = d.nero;
          if (d.nero && !c.town) { var tw = TOWNS.find(function (x) { return x[0] === d.nero; }); c.town = { name: tw[0], lnglat: [tw[2], tw[1]] }; }
        });
        // hero = into town and out again the same day (resupply, laundry, food), night on the trail:
        // a break of 90+ min where one recording ends and the next starts near a town,
        // or the track itself goes into an off-trail town and back
        function actEnd(f) { var pr = f.properties; return pr.t && pr.t.length ? Date.parse(pr.t0 || pr.start_date) + pr.t[pr.t.length - 1] * 1000 : Date.parse(pr.start_date) + (pr.moving_time_s || 0) * 1000; }
        function townNear(p, km) { var hit = null; accPts.forEach(function (tw) { if (!hit && (hav(p[1], p[0], tw.lat, tw.lon) < km || hav(p[1], p[0], tw.tlat, tw.tlon) < km)) hit = tw.name; }); return hit; }
        dayList.forEach(function (d, i) {
          d.hero = null; var c = camps[i]; if (!c || c.zero || d.nero) return;
          var fs = feats.filter(function (f) { return f.properties.dayIdx === i; });
          for (var k = 0; k + 1 < fs.length && !d.hero; k++) {
            var ca = fs[k].geometry.coordinates, a = ca[ca.length - 1], b = fs[k + 1].geometry.coordinates[0];
            if (Date.parse(fs[k + 1].properties.start_date) - actEnd(fs[k]) >= 90 * 60000 && hav(a[1], a[0], b[1], b[0]) < 3) d.hero = townNear(a, 3);
          }
          if (!d.hero) accPts.forEach(function (tw) {   // walked (or rode with the watch on) into a town away from the trail
            if (d.hero || hav(tw.lat, tw.lon, tw.tlat, tw.tlon) < 4) return;
            fs.forEach(function (f) { f.geometry.coordinates.forEach(function (p) { if (!d.hero && hav(p[1], p[0], tw.tlat, tw.tlon) < 1.5) d.hero = tw.name; }); });
          });
          if (d.hero && townNear(c.lnglat, 3) === d.hero) d.hero = null;   // slept there: that's a nero, not a hero
          c.hero = d.hero;
        });

        // Trail sections actually walked on the PCT (fire closures, skips or a flip-flop leave gaps).
        // Only track points within ~250 m of the PCT line count; side trails, alternates and walks
        // into town are hiked km, but not PCT km. Grid index over the fine PCT line for speed.
        var grid = {}, G = 0.01;
        lc.forEach(function (c) { var k = Math.floor(c[0] / G) + "," + Math.floor(c[1] / G); (grid[k] = grid[k] || []).push(c); });
        function onPct(c) {
          var gx = Math.floor(c[0] / G), gy = Math.floor(c[1] / G);
          for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
            var cell = grid[(gx + dx) + "," + (gy + dy)]; if (!cell) continue;
            for (var q = 0; q < cell.length; q++) if (hav(c[1], c[0], cell[q][1], cell[q][0]) < 0.25) return true;
          }
          return false;
        }
        var tks = [];
        feats.forEach(function (f) {
          var j = -1;
          f.geometry.coordinates.forEach(function (c, ci) {
            if (ci % 3 && ci !== f.geometry.coordinates.length - 1) return;
            var lo = j < 0 ? 0 : Math.max(0, j - 30), hi = j < 0 ? pts.length - 1 : Math.min(pts.length - 1, j + 30), bd = 1e18, bj = lo, i, d;
            for (i = lo; i <= hi; i++) { d = hav(c[1], c[0], pts[i].lat, pts[i].lon); if (d < bd) { bd = d; bj = i; } }
            if (bd > 20) for (i = 0; i < pts.length; i++) { d = hav(c[1], c[0], pts[i].lat, pts[i].lon); if (d < bd) { bd = d; bj = i; } }
            j = bj; if (bd <= 5 && onPct(c)) tks.push(pts[bj].km);
          });
        });
        tks.sort(function (a, b) { return a - b; });
        var covered = [];
        // small gaps up to 3 km are bridged (GPS gaps, a few hundred metres skipped at a road crossing
        // or town junction); anything longer stays open as not walked
        tks.forEach(function (k) { var l = covered[covered.length - 1]; if (l && k - l[1] <= 3) l[1] = Math.max(l[1], k); else covered.push([k, k]); });
        if (covered.length && covered[0][0] < 3) covered[0][0] = 0;   // from the terminus
        var coveredKm = covered.reduce(function (s, c) { return s + c[1] - c[0]; }, 0);
        var totalKm = dayList.reduce(function (s, d) { return s + d.km; }, 0);
        // towns with the trail km of the point where you leave the trail for them (same data as on the map)
        var towns = TOWNS.map(function (tw) {
          var acc = ACCESS[tw[0]], s = acc ? snap(pts, acc[1], acc[2]) : snap(pts, tw[1], tw[2]);
          return { name: tw[0], km: s.km, lat: tw[1], lon: tw[2], access: acc ? acc[0] : null };
        }).sort(function (a, b) { return a.km - b.km; });
        var next = towns.filter(function (tw) { return tw.km > here.km + 0.5; })[0] || null;
        return {
          src: SRC, pts: pts, total: prof.total_km, line: line, track: { type: "FeatureCollection", features: feats }, latest: latest,
          here: here, landmarks: lms, regions: regs, region: reg, days: dayList, today: dayList[dayList.length - 1] || null,
          manual: manual, closures: (Array.isArray(r[6]) ? r[6] : []).filter(function (c) { return isFinite(c.from_km) && isFinite(c.to_km); }), dayNo: dayList.length, walkedKm: totalKm, covered: covered, coveredKm: coveredKm, next: next, towns: towns, diary: diary, camps: camps
        };
      });
  }

  // ---- Resupply towns at their real position (not on the trail), with a short note ----
  // Notes are from planning, not checked on site: services change, always look at FarOut.
  var TOWNS = [
    ["Mount Laguna", 32.8686, -116.4211, "General Store · Lodge · Post Office"],
    ["Julian", 33.0786, -116.6020, "Grocery · Post Office · Mom's Pie (free pie for hikers)"],
    ["Warner Springs", 33.2828, -116.6339, "Community Center · Post Office"],
    ["Idyllwild", 33.7400, -116.7189, "Grocery · Outfitter · Post Office · Cafés"],
    ["Big Bear Lake", 34.2439, -116.9114, "Grocery · Outfitter · Post Office · Hostel"],
    ["Wrightwood", 34.3608, -117.6334, "Grocery · Post Office · Mountain Hardware"],
    ["Agua Dulce", 34.4964, -118.3256, "Grocery · Restaurants"],
    ["Tehachapi", 35.1322, -118.4490, "Grocery · Post Office · Restaurants"],
    ["Kennedy Meadows", 36.0190, -118.1233, "General Store · Resupply · Bear Canister"],
    ["Lone Pine", 36.6060, -118.0629, "Grocery · Outfitter · Post Office"],
    ["Bishop", 37.3635, -118.3951, "Grocery · Outfitter · Bakery"],
    ["Mammoth Lakes", 37.6485, -118.9721, "Grocery · Outfitter · Post Office"],
    ["Tuolumne Meadows", 37.8735, -119.3590, "Store · Post Office (Sommer)"],
    ["South Lake Tahoe", 38.9399, -119.9772, "Grocery · Outfitter · Post Office"],
    ["Truckee", 39.3280, -120.1833, "Grocery · Outfitter"],
    ["Sierra City", 39.5657, -120.6324, "General Store · Post Office"],
    ["Belden", 40.0058, -121.2483, "Restaurant · Lodge"],
    ["Chester", 40.3063, -121.2316, "Grocery · Post Office"],
    ["Burney", 40.8824, -121.6608, "Grocery · Post Office"],
    ["Mount Shasta", 41.3099, -122.3106, "Grocery · Outfitter · Post Office"],
    ["Etna", 41.4568, -122.8948, "Grocery · Post Office · Brewery"],
    ["Seiad Valley", 41.8418, -123.1964, "Store · Café · Post Office"],
    ["Ashland", 42.1946, -122.7095, "Grocery · Outfitter · Post Office"],
    ["Mazama Village", 42.8668, -122.1675, "Store · Campground · Resupply"],
    ["Sisters", 44.2910, -121.5492, "Grocery · Outfitter"],
    ["Cascade Locks", 45.6696, -121.8909, "Store · Post Office · Restaurants"],
    ["Trout Lake", 45.9968, -121.5287, "General Store · Post Office"],
    ["White Pass", 46.6378, -121.3913, "Store · Resupply"],
    ["Snoqualmie Pass", 47.4243, -121.4135, "Store · Lodge"],
    ["Skykomish", 47.7090, -121.3590, "Store · Lodge"],
    ["Stehekin", 48.3093, -120.6545, "Post Office · Bakery"],
    ["Mazama", 48.5926, -120.4039, "Store · Resupply"]
  ];
  // Where you leave the trail for a town: [name of the access point, lat, lon], snapped to the trail.
  // Towns not listed use the nearest trail point.
  var ACCESS = {
    "Julian": ["Scissors Crossing", 33.0998, -116.4700], "Idyllwild": ["Saddle Junction / Devils Slide", 33.7769, -116.6658],
    "Tehachapi": ["Hwy 58", 35.1010, -118.2870], "Lone Pine": ["Cottonwood Pass / Horseshoe Meadows", 36.4537, -118.1734, [[36.4501, -118.1694], [36.5560, -118.1100]]],
    "Bishop": ["Kearsarge Pass / Onion Valley", 36.7735, -118.3768, [[36.7726, -118.3409], [36.8027, -118.1999], [37.0500, -118.2500]]], "Mammoth Lakes": ["Reds Meadow", 37.6153, -119.0747],
    "South Lake Tahoe": ["Echo Summit", 38.8125, -120.0302], "Truckee": ["Donner Pass (I-80)", 39.3390, -120.3440],
    "Mount Shasta": ["I-5 at Castle Crags", 41.1500, -122.3100], "Ashland": ["I-5 at Callahan's", 42.0900, -122.6010],
    "Sisters": ["Santiam Pass", 44.4253, -121.8546], "Skykomish": ["Stevens Pass", 47.7463, -121.0857],
    "Stehekin": ["High Bridge", 48.3880, -120.8410], "Mazama": ["Rainy Pass", 48.5157, -120.7357]
  };
  function addTowns(map, D, theme) {
    theme = theme || {};
    var css = document.getElementById("tw-css");
    if (!css) { css = document.createElement("style"); css.id = "tw-css";
      css.textContent = ".tw{display:flex;align-items:center;gap:5px;cursor:pointer}.tw i{width:12px;height:12px;border-radius:3px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)}" +
        ".tw span{font:600 12px Inter,system-ui,sans-serif;white-space:nowrap}" +
        ".tw-pop .maplibregl-popup-content{padding:12px 14px;max-width:300px;font:14px/1.45 Inter,system-ui,sans-serif;color:#14202a;border-radius:6px}" +
        ".tw-pop h4{margin:0 0 2px;font-size:16px}.tw-pop .m{font-size:12px;color:#56636d;margin-bottom:6px}.tw-pop .n{font-size:11px;color:#8a959d;margin-top:8px}";
      document.head.appendChild(css); }
    var lines = { type: "FeatureCollection", features: [] };
    TOWNS.forEach(function (t) {
      var acc = ACCESS[t[0]], s = acc ? snap(D.pts, acc[1], acc[2]) : snap(D.pts, t[1], t[2]);
      // optional via points follow the road/trail to town (e.g. Bishop via Onion Valley and Independence)
      var path = [[t[2], t[1]]].concat(acc && acc[3] ? acc[3].slice().reverse().map(function (v) { return [v[1], v[0]]; }) : []).concat(s ? [[s.lon, s.lat]] : []);
      var off = 0; for (var q = 1; q < path.length; q++) off += hav(path[q - 1][1], path[q - 1][0], path[q][1], path[q][0]);
      var direct = off < 1.5, via = !!(acc && acc[3]);
      if (s && !direct) lines.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: path } });
      var el = document.createElement("div"); el.className = "tw";
      el.innerHTML = '<i style="background:' + (theme.dot || "#f5b301") + '"></i><span style="color:' + (theme.text || "#fff") + ";text-shadow:" + (theme.halo || "0 1px 3px #000,0 0 8px rgba(0,0,0,.7)") + '">' + t[0] + "</span>";
      var tkm = nw("Trail-" + DU() + "\u00a0" + nf(distV(s ? s.km : 0)));
      var pop = new maplibregl.Popup({ offset: 12, className: "tw-pop", maxWidth: "300px" }).setHTML(
        "<h4>" + t[0] + '</h4><div class="m">' + (direct ? nw(T("Direkt am Trail", "Right on the trail")) + " · " + tkm
          : (acc ? nw(T("Zugang: ", "Access: ")) + " " + acc[0] : nw(T("Nächster Trailpunkt", "Nearest trail point"))) + "<br>" + tkm + "<br>" +
            nw(T("ca. ", "approx. ") + dist(off, off < 10 ? 1 : 0) + (via ? T(" über die Straße in den Ort", " by road to town") : T(" Luftlinie in den Ort", " to town (straight line)")))) + "</div>" +
        nwList(t[3]) + '<div class="n">' + T("Stand Planung, vor Ort gilt FarOut.", "From planning, check FarOut on trail.") + "</div>");
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat([t[2], t[1]]).setPopup(pop).addTo(map);
    });
    // link line only for real side trips (a few km, e.g. Whitney); far landmarks like Shasta or Rainier
    // are just seen from the trail, a long line to them would only clutter the map
    D.landmarks.forEach(function (l) { if (l.side && l.off <= 8) lines.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[l.lon, l.lat], l.trail] } }); });
    map.addSource("tw-links", { type: "geojson", data: lines });
    map.addLayer({ id: "tw-links", type: "line", source: "tw-links", minzoom: 7, paint: { "line-color": theme.link || "#f5b301", "line-width": 1.3, "line-opacity": .8, "line-dasharray": [2, 2] } });
  }

  // ---- Trail landmarks (peaks, passes, water, parks, termini), clickable ----
  function addLandmarks(map, D, theme) {
    theme = theme || {};
    D.landmarks.filter(function (l) { return l.type !== "town"; }).forEach(function (l) {
      var Ty = TYPE[l.type] || TYPE.town, el = document.createElement("div");
      el.className = "lm " + l.type + " t" + l.tier; el.style.cursor = "pointer"; el.style.pointerEvents = "auto";
      el.innerHTML = "<i style='background:" + (theme.dot ? theme.dot(l) : Ty.c) + "'></i><span>" + l.name + "</span>";
      if (l.type === "peak" && !theme.dot) el.firstChild.style.background = "transparent";
      var pop = new maplibregl.Popup({ offset: 10, className: "tw-pop", maxWidth: "300px" }).setHTML(
        "<h4>" + l.name + '</h4><div class="m">' + Ty[LANG] + " · " + elev(l.m) + "</div>" +
        (l.side && l.off > 8 ? nw(T("Vom Trail aus zu sehen, ca. ", "Seen from the trail, approx. ") + dist(l.off) + T(" entfernt", " away")) + "<br>" + nw(T("nächster Trailpunkt: Trail-", "nearest trail point: trail ") + DU() + "\u00a0" + nf(distV(l.km)))
        : l.side ? nw(T("Abseits vom Trail, ca. ", "Off the trail, approx. ") + dist(l.off, l.off < 10 ? 1 : 0) + T(" Luftlinie", " straight line")) + "<br>" + nw(T("nächster Trailpunkt: Trail-", "nearest trail point: trail ") + DU() + "\u00a0" + nf(distV(l.km)))
          : nw(T("Am Trail bei Trail-", "On the trail at trail ") + DU() + "\u00a0" + nf(distV(l.km)))) +
        (l.type === "term" ? "" : "<br>" + nw(dist(l.km) + T(" ab Campo", " from Campo")) + "<br>" + nw(dist(D.total - l.km) + T(" bis Kanada", " to Canada"))));
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-5, 0] }).setLngLat([l.lon, l.lat]).setPopup(pop).addTo(map);
    });
  }

  var BED = '<svg viewBox="0 0 24 16" width="18" height="12" style="vertical-align:-1px"><path d="M2 2v12M2 10h20v4M22 10V7a2 2 0 0 0-2-2H11v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="7" r="2" fill="currentColor"/></svg>';

  // ---- "Where am I" button next to + / - ----
  function addLocate(map, getLngLat, pos) {
    // keep the attribution folded to its (i) button, MapLibre opens it on wide-enough maps
    function fold() { document.querySelectorAll(".maplibregl-compact-show").forEach(function (e) { e.classList.remove("maplibregl-compact-show"); }); }
    fold(); map.once("idle", fold);
    function C() {}
    C.prototype.onAdd = function () {
      var w = document.createElement("div"); w.className = "maplibregl-ctrl maplibregl-ctrl-group";
      var b = document.createElement("button"); b.type = "button"; b.title = T("Zu meiner Position", "Where am I");
      // looks like the position marker on the map (red dot, white rim, pulsing ring)
      if (!document.getElementById("loc-css")) { var cs = document.createElement("style"); cs.id = "loc-css";
        cs.textContent = ".loc-dot{position:relative;display:block;width:12px;height:12px;margin:auto;border-radius:50%;background:#e0452f;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}" +
          ".loc-dot::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid #e0452f;animation:locPulse 2s ease-out infinite}" +
          "@keyframes locPulse{from{transform:scale(1);opacity:.9}to{transform:scale(2.4);opacity:0}}";
        document.head.appendChild(cs); }
      b.innerHTML = '<span class="loc-dot"></span>';
      b.onclick = function () {   // back to the newest tracked position (also after dragging the profile or a replay)
        scrubResets.forEach(function (f) { f(); }); if (activeReplay && activeReplay.toEnd) activeReplay.toEnd(); var ll = getLngLat(); if (ll) map.flyTo({ center: ll, zoom: 13, duration: 1200 }); };
      w.appendChild(b); return w;
    };
    C.prototype.onRemove = function () {};
    map.addControl(new C(), pos || "bottom-right");
  }

  // ---- Fire closures: trail section in red with flames ([{ "from_km", "to_km", "name", "since", "note" }]) ----
  var FLAME = '<svg viewBox="0 0 24 30" width="26" height="32"><path d="M12 1c1 5 6 7 6 14a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5 0 2.5 1 4 2.5 4.5C10 9 10.5 5 12 1z" fill="#ff5a1f" stroke="#7a1d00" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 13c.6 2.5 3 3.5 3 6.5a3 3 0 0 1-6 0c0-2 1.5-3 3-6.5z" fill="#ffd23f"/></svg>';
  function addClosures(map, D) {
    if (!D.closures || !D.closures.length) return;
    var feats = D.closures.map(function (c) {
      var a = Math.min(c.from_km, c.to_km), b = Math.max(c.from_km, c.to_km);
      var coords = D.pts.filter(function (p) { return p.km >= a && p.km <= b; }).map(function (p) { return [p.lon, p.lat]; });
      var pa = atKm(D.pts, a), pb = atKm(D.pts, b); coords.unshift([pa.lon, pa.lat]); coords.push([pb.lon, pb.lat]);
      // flames along the section, at most one every ~15 km (min. 1, max. 8)
      var n = Math.max(1, Math.min(8, Math.round((b - a) / 15)));
      for (var k = 0; k < n; k++) {
        var p = atKm(D.pts, a + (b - a) * (k + .5) / n), el = document.createElement("div");
        el.innerHTML = FLAME; el.className = "flame" + (k === Math.floor(n / 2) ? " flame-main" : ""); el.style.cssText = "cursor:pointer;filter:drop-shadow(0 1px 3px rgba(0,0,0,.6))";
        new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([p.lon, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 22, className: "tw-pop", maxWidth: "300px" }).setHTML(
            "<h4>" + T("Waldbrand-Sperrung", "Fire closure") + '</h4><div class="m">' + (c.name ? c.name + "<br>" : "") +
            nw("Trail-" + DU() + "\u00a0" + nf(distV(a))) + " – " + nw(nf(distV(b))) + " · " + nw(dist(b - a)) +
            (c.since ? "<br>" + T("seit ", "since ") + dfmt(c.since + "T12:00", { day: "numeric", month: "long" }) : "") + "</div>" + (c.note || "")))
          .addTo(map);
      }
      return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
    });
    // closed area: a clean band of ~3 km around the (smoothed) trail, hatched like on fire maps.
    // Turf.js does the buffering (real union, so no self-overlaps in bends); loaded only when needed.
    function zoneData() {
      return { type: "FeatureCollection", features: feats.map(function (f) {
        var sm = turf.simplify(f, { tolerance: 0.01, highQuality: true });
        return turf.buffer(sm, 3, { units: "kilometers", steps: 12 });
      }) };
    }
    function withTurf(cb) {
      if (window.turf) return cb();
      var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@turf/turf@6.5.0/turf.min.js"; s.onload = cb; document.head.appendChild(s);
    }
    if (!map.hasImage("hatch")) {
      var cv = document.createElement("canvas"); cv.width = cv.height = 12; var g = cv.getContext("2d");
      g.strokeStyle = "rgba(255,212,0,.85)"; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(0, 12); g.lineTo(12, 0); g.moveTo(-6, 6); g.lineTo(6, -6); g.moveTo(6, 18); g.lineTo(18, 6);
      g.moveTo(0, 0); g.lineTo(12, 12); g.moveTo(-6, 6); g.lineTo(6, 18); g.moveTo(6, -6); g.lineTo(18, 6); g.stroke();
      map.addImage("hatch", g.getImageData(0, 0, 12, 12));
    }
    map.addSource("closure-zone", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    withTurf(function () { map.getSource("closure-zone").setData(zoneData()); });
    map.addLayer({ id: "closure-fill", type: "fill", source: "closure-zone", paint: { "fill-color": "rgba(255,212,0,.12)" } });
    map.addLayer({ id: "closure-hatch", type: "fill", source: "closure-zone", paint: { "fill-pattern": "hatch", "fill-opacity": .9 } });
    map.addLayer({ id: "closure-edge", type: "line", source: "closure-zone", paint: { "line-color": "#ffd400", "line-width": 2.5 }, layout: { "line-join": "round" } });
    map.addSource("closures", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
    // yellow/black like a barrier tape, so it can't be mixed up with the walked (red/orange) track
    map.addLayer({ id: "closures-bg", type: "line", source: "closures", paint: { "line-color": "#111", "line-width": 8, "line-opacity": .9 }, layout: { "line-cap": "butt", "line-join": "round" } });
    map.addLayer({ id: "closures", type: "line", source: "closures", paint: { "line-color": "#ffd400", "line-width": 6, "line-dasharray": [1.4, 1.4] }, layout: { "line-cap": "butt", "line-join": "round" } });
  }

  // closed sections as hatched yellow bands for an SVG elevation profile (x = function km -> svg x)
  function closureBands(D, x, top, bottom) {
    if (!D.closures || !D.closures.length) return "";
    return '<defs><pattern id="hzP" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="rgba(255,212,0,.10)"/><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,212,0,.75)" stroke-width="2"/></pattern></defs>' +
      D.closures.map(function (c) { var a = x(Math.min(c.from_km, c.to_km)), b = x(Math.max(c.from_km, c.to_km));
        return '<rect x="' + a + '" y="' + top + '" width="' + (b - a) + '" height="' + (bottom - top) + '" fill="url(#hzP)"/>' +
          '<line x1="' + a + '" x2="' + b + '" y1="' + top + '" y2="' + top + '" stroke="#ffd400" stroke-width="2" vector-effect="non-scaling-stroke"/>'; }).join("");
  }

  // ---- Less on the map the further out you zoom ----
  //  far  (< 6.5): only termini, position, one flame per closure
  //  lo  (6.5-8.5): + town dots, main landmarks (no labels for minor ones)
  //  mid (8.5-10):  + town names, tents and zero/nero/hero badges
  function declutter(map) {
    if (!document.getElementById("dz-css")) {
      var s = document.createElement("style"); s.id = "dz-css";
      s.textContent =
        ".dz-far .tw,.dz-far .camp,.dz-far .lm:not(.term),.dz-far .flame:not(.flame-main),.dz-far .ph,.dz-far .phm,.dz-far .man{display:none!important}" +
        ".dz-lo .tw span,.dz-lo .camp,.dz-lo .lm.t2,.dz-lo .lm.t3,.dz-lo .flame:not(.flame-main),.dz-lo .man{display:none!important}" +
        ".dz-mid .lm.t3 span{display:none!important}";
      document.head.appendChild(s);
    }
    var el = map.getContainer();
    function upd() { var z = map.getZoom(); el.classList.toggle("dz-far", z < 6.5); el.classList.toggle("dz-lo", z >= 6.5 && z < 8.5); el.classList.toggle("dz-mid", z >= 8.5 && z < 10); }
    map.on("zoom", upd); upd();
  }

  // ---- What zero / nero / hero mean (tooltips) ----
  var TERMS = {
    zero: T("Zero: ein Tag ohne Trail-Kilometer, also 0 km gelaufen.", "Zero: a day with no trail miles at all, 0 mi hiked."),
    nero: T("Nero: jeden Tag auf dem Trail gelaufen, aber im Ort übernachtet, zum Resupply oder einfach für ein Bett.", "Nero: hiked on the trail that day, but spent the night in town, for a resupply or just a bed."),
    hero: T("Hero: rein in den Ort und am selben Tag wieder raus, alle Erledigungen (Resupply, Wäsche, Essen) an einem Tag, die Nacht wieder auf dem Trail.", "Hero: into town and out again the same day, all chores (resupply, laundry, food) done in one go, the night back on the trail.")
  };

  // ---- Positions reported by message (Garmin fallback): small dots with date and note ----
  function addManual(map, D, theme) {
    theme = theme || {};
    (D.manual || []).forEach(function (m, i) {
      if (i === D.manual.length - 1 && D.latest && D.latest.manual) return;   // the newest one is the position marker itself
      var el = document.createElement("div"); el.className = "man";
      el.style.cssText = "width:12px;height:12px;border-radius:50%;background:" + (theme.fill || "#fff") + ";border:2px dashed " + (theme.ink || "#e0452f") + ";cursor:pointer";
      el.title = dfmt(m.ts, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + (m.note ? " · " + m.note : "");
      new maplibregl.Marker({ element: el }).setLngLat([m.lon, m.lat])
        .setPopup(new maplibregl.Popup({ offset: 10, className: "tw-pop" }).setHTML("<h4>" + (m.note || T("Gemeldete Position", "Reported position")) + '</h4><div class="m">' + T("per Nachricht · ", "by message · ") + el.title.split(" · ")[0] + "</div>"))
        .addTo(map);
    });
  }

  // small popup for the zero / nero / hero badges: what happened + what the word means
  function termPop(kind, c, extra) {
    var d = function (iso) { return dfmt(iso + "T12:00", { weekday: "short", day: "numeric", month: "long" }); };
    var head = kind === "zero" ? (c.zero === 1 ? "Zero" : c.zero + " Zeros") + (c.town ? " in " + c.town.name : "") : (kind === "nero" ? "Nero in " : "Hero in ") + extra;
    var when = kind === "zero" ? T("nach Tag ", "after day ") + c.day + " · " + d(new Date(Date.parse(c.date + "T12:00:00Z") + 86400000).toISOString().slice(0, 10)) + (c.zero > 1 ? T(" bis ", " to ") + d(new Date(Date.parse(c.date + "T12:00:00Z") + c.zero * 86400000).toISOString().slice(0, 10)) : "")
      : T("Tag ", "Day ") + c.day + " · " + d(c.date) + " · " + dist(c.km, 1);
    return new maplibregl.Popup({ offset: 12, className: "tw-pop", maxWidth: "280px" }).setHTML("<h4>" + head + '</h4><div class="m">' + when + '</div><div class="n" style="margin-top:4px">' + TERMS[kind] + "</div>");
  }

  // ---- Tents where each day ended (except the current position) ----
  function addCamps(map, D, theme) {
    theme = theme || {};
    var fill = theme.fill || "#f5b301", ink = theme.ink || "#14202a", list = D.camps.slice(0, -1);
    return list.map(function (c) {
      var el = document.createElement("div"); el.className = "camp"; el.dataset.day = c.day;
      el.title = T("Nacht nach Tag ", "Night after day ") + c.day + " · " + dfmt(c.date + "T12:00", { weekday: "short", day: "numeric", month: "short" }) + " · " + dist(c.km, 1);
      el.style.cssText = "width:32px;height:26px;cursor:default;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))";
      el.innerHTML = '<svg viewBox="0 0 22 18" width="32" height="26"><path d="M1.5 16.5 L11 2 L20.5 16.5 Z" fill="' + fill + '" stroke="' + ink + '" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 2 L11 16.5" stroke="' + ink + '" stroke-width="1.1"/><path d="M8.2 16.5 L11 10.5 L13.8 16.5 Z" fill="' + ink + '"/></svg>';
      // before a zero you sleep in town: no tent, the track just ends where you left the trail
      var mk = (c.zero || c.nero) ? null : new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(c.lnglat).addTo(map);
      if (c.zero) {   // rest days: counter at the nearby town (or at the tent if there is none)
        var z = document.createElement("div"); z.className = "camp"; z.dataset.day = c.day;
        z.title = c.zero + (c.zero === 1 ? " Zero-" + T("Tag", "day") : " Zero-" + T("Tage", "days")) + (c.town ? " in " + c.town.name : "");
        z.style.cssText = "background:" + fill + ";color:" + ink + ";border:2px solid " + ink + ";border-radius:12px;padding:2px 7px;font:700 11px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)";
        z.innerHTML = BED + " ×" + c.zero;
        z.style.cursor = "pointer"; z.title = "";
        new maplibregl.Marker({ element: z, anchor: c.town ? "top" : "bottom", offset: c.town ? [0, 10] : [0, -4] }).setLngLat(c.town ? c.town.lnglat : c.lnglat).setPopup(termPop("zero", c)).addTo(map);
      } else if (c.hero) {   // in and out of town the same day: small badge at the town
        var hz = document.createElement("div"); hz.className = "camp"; hz.dataset.day = c.day; hz.title = TERMS.hero;
        hz.style.cssText = "background:" + ink + ";color:" + fill + ";border:1.5px solid " + fill + ";border-radius:10px;padding:1px 6px;font:700 10px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)";
        hz.textContent = "Hero"; var htw = TOWNS.find(function (x) { return x[0] === c.hero; });
        hz.style.cursor = "pointer"; hz.title = "";
        new maplibregl.Marker({ element: hz, anchor: "top", offset: [0, 10] }).setLngLat(htw ? [htw[2], htw[1]] : c.lnglat).setPopup(termPop("hero", c, c.hero)).addTo(map);
      }
      if (c.nero) {   // night in town: bed + "Nero" at the town
        var nz = document.createElement("div"); nz.className = "camp"; nz.dataset.day = c.day;
        nz.title = "Nero" + " in " + c.nero + " · " + T("Nacht nach Tag ", "night after day ") + c.day;
        nz.style.cssText = "background:" + fill + ";color:" + ink + ";border:2px solid " + ink + ";border-radius:12px;padding:2px 7px;font:700 11px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)";
        nz.innerHTML = BED + " Nero";
        nz.style.cursor = "pointer"; nz.title = "";
        new maplibregl.Marker({ element: nz, anchor: "top", offset: [0, 10] }).setLngLat(c.town.lnglat).setPopup(termPop("nero", c, c.nero)).addTo(map);
      }
      return mk;
    });
  }
  // alternating colours per day for a line layer
  function dayColor(a, b) { return ["case", ["==", ["%", ["coalesce", ["get", "dayIdx"], 0], 2], 0], a, b]; }

  // ---- Design switcher (Reportage / Tagebuch / Instrumente) + data source ----
  var DESIGNS = [["", "Reportage", "Story"], ["tagebuch/", "Tagebuch", "Journal"], ["statistik/", "Statistik", "Statistics"]];
  function switcher(active) {
    var css = document.createElement("style");
    css.textContent = ".lab{position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:9000;display:flex;align-items:center;gap:2px;background:rgba(14,18,22,.88);color:#fff;border-radius:22px;padding:4px;font:500 13px/1 system-ui,-apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);backdrop-filter:blur(6px)}" +
      ".lab a{color:#fff;text-decoration:none;padding:7px 13px;border-radius:16px;white-space:nowrap}.lab a:hover{background:rgba(255,255,255,.12)}.lab a.on{background:#e0452f}" +
      ".lab .lg{border:1px solid rgba(255,255,255,.35);font-weight:700;padding:6px 10px}.lab select{background:transparent;color:#ffd2c4;border:0;font:600 12px system-ui;margin:0 6px;cursor:pointer}.lab select option{color:#000}" +
      "@media(max-width:700px){.lab{top:auto;bottom:10px}.lab select{display:none}}";
    document.head.appendChild(css);
    var q = SRC !== "demo" ? "?data=" + SRC : "";
    var el = document.createElement("div"); el.className = "lab";
    el.innerHTML = DESIGNS.map(function (d, i) { return '<a href="' + BASE + "labs/" + d[0] + q + '" class="' + (i === active ? "on" : "") + '">' + (EN ? d[2] : d[1]) + "</a>"; }).join("") +
      '<select title="' + T("Datenquelle", "Data source") + '"><option value="demo">' + T("Demo-Daten", "Demo data") + '</option><option value="test">' + T("Meine Testrunden", "My test hikes") + '</option><option value="live">Live</option></select>' +
      '<a href="#" class="lg">' + (EN ? "DE" : "EN") + "</a>";
    var sel = el.querySelector("select"); sel.value = SRC;
    sel.onchange = function () { var u = new URL(location.href); u.searchParams.set("data", sel.value); location.href = u; };
    el.querySelector(".lg").onclick = function (e) { e.preventDefault(); try { localStorage.setItem("pctLang", EN ? "de" : "en"); } catch (x) {} location.reload(); };
    document.body.appendChild(el);
    document.documentElement.lang = LANG;
    // static texts: <x data-de="…" data-en="…">
    document.querySelectorAll("[data-en]").forEach(function (n) { n.innerHTML = EN ? n.getAttribute("data-en") : (n.getAttribute("data-de") || n.innerHTML); });
  }

  // ---- Photo pop-up (no jump to Flickr) ----
  function lightbox(list, i) {
    var css = document.getElementById("lb-css");
    if (!css) { css = document.createElement("style"); css.id = "lb-css";
      css.textContent = ".lb{position:fixed;inset:0;z-index:9500;background:rgba(5,8,10,.92);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}" +
        ".lb .row{display:flex;align-items:center;gap:6px;max-width:100vw}.lb img{max-width:calc(100vw - 150px);max-height:80vh;box-shadow:0 10px 40px rgba(0,0,0,.6)}.lb .cap{color:#dfe6ea;font:500 14px Inter,system-ui,sans-serif;text-align:center;max-width:80vw}" +
        ".lb button{all:unset;flex:none;width:60px;text-align:center;cursor:pointer;color:#fff;font:300 46px/1 system-ui;padding:20px 0;opacity:.75}.lb button:hover{opacity:1}" +
        ".lb .x{position:absolute;top:14px;right:18px;color:#fff;font:300 34px/1 system-ui;cursor:pointer}";
      document.head.appendChild(css); }
    var lb = document.createElement("div"); lb.className = "lb";
    function show() {
      var p = list[i], d = p.taken ? dfmt(p.taken.replace(" ", "T"), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + T(" Uhr", "") : "";
      var many = list.length > 1;
      lb.innerHTML = '<span class="x">×</span><div class="row">' + (many ? '<button class="p">‹</button>' : "") +
        '<img src="' + (p.l || p.m) + '" alt="">' + (many ? '<button class="n">›</button>' : "") + '</div><div class="cap">' + [p.title, d].filter(Boolean).join(" · ") + "</div>";
      var pb = lb.querySelector(".p"), nb = lb.querySelector(".n");
      if (pb) pb.onclick = function (e) { e.stopPropagation(); i = (i - 1 + list.length) % list.length; show(); };
      if (nb) nb.onclick = function (e) { e.stopPropagation(); i = (i + 1) % list.length; show(); };
      lb.querySelector("img").onclick = function (e) { e.stopPropagation(); };
    }
    function close() { lb.remove(); document.removeEventListener("keydown", key); }
    function key(e) { if (e.key === "Escape") close(); if (e.key === "ArrowLeft" && list.length > 1) { i = (i - 1 + list.length) % list.length; show(); } if (e.key === "ArrowRight" && list.length > 1) { i = (i + 1) % list.length; show(); } }
    lb.onclick = close; document.addEventListener("keydown", key); show(); document.body.appendChild(lb);
  }

  // ---- Replay: walks the recorded track from day 1 to now ----
  // Smooth: position is interpolated every frame, the camera follows a smoothed
  // (lagging) centre so small zigzags don't shake the map, and the line is only
  // redrawn a few times per second. Faster speed = camera zooms further out.
  // opts: { map, D, marker, ui: {play, speed, clock, slider?}, onUpdate(state) }
  function replay(o) {
    var D = o.D, seq = [], base = 0;
    D.track.features.forEach(function (f, fi) {
      var c = f.geometry.coordinates, t0 = Date.parse(f.properties.start_date), dur = (f.properties.moving_time_s || 0) * 1000, n = c.length;
      var geo = [0]; for (var k = 1; k < n; k++) geo.push(geo[k - 1] + hav(c[k - 1][1], c[k - 1][0], c[k][1], c[k][0]));
      var real = (f.properties.distance_m || 0) / 1000 || geo[n - 1], sc = geo[n - 1] ? real / geo[n - 1] : 0;
      for (k = 0; k < n; k++) seq.push({ c: c[k], f: fi, k: k, km: base + geo[k] * sc, t: t0 + (n > 1 ? dur * k / (n - 1) : 0) });
      base += real;
    });
    var N = seq.length, END = N ? seq[N - 1].km : 0, cur = END, raf = null, sp = 0, lastDraw = 0, cam = null, zoom = null;
    var SPEEDS = [1, 2, 4], ZOOM = [12, 10.6, 9.2], DAY_MS = 6000, NIGHT_MS = 1600;  // 1x: a day in ~6 s, then a short night at the tent
    // km where each day ends (last point before the date changes)
    var dayEnds = [], dayOf = function (s) { return D.track.features[s.f].properties.day; };
    for (var q = 0; q < N - 1; q++) if (dayOf(seq[q]) !== dayOf(seq[q + 1])) dayEnds.push(seq[q].km);
    var restUntil = 0, resting = false;
    // trail km of every replay point, for jumping there from the elevation profile
    (function () {
      var P = D.pts, j = -1;
      seq.forEach(function (s) {
        var lo = j < 0 ? 0 : Math.max(0, j - 40), hi = j < 0 ? P.length - 1 : Math.min(P.length - 1, j + 40), bd = 1e18, bj = lo;
        for (var i = lo; i <= hi; i++) { var d = hav(s.c[1], s.c[0], P[i].lat, P[i].lon); if (d < bd) { bd = d; bj = i; } }
        if (bd > 30 && j >= 0) { for (i = 0; i < P.length; i++) { d = hav(s.c[1], s.c[0], P[i].lat, P[i].lon); if (d < bd) { bd = d; bj = i; } } }
        j = bj; s.tk = bd <= 50 ? P[bj].km : null;
      });
    })();
    var maxTrail = seq.reduce(function (m, s) { return s.tk != null && s.tk > m ? s.tk : m; }, 0);
    function seekTrail(km) {   // replay position at the first moment you were at this trail km
      if (!N) return; stop(); var best = null, bd = 1e18;
      for (var i = 0; i < N; i++) { if (seq[i].tk == null) continue; var d = Math.abs(seq[i].tk - km); if (d < bd) { bd = d; best = i; } }
      if (best != null) show(seq[best].km, false, true);
    }
    function idxAt(km) { var lo = 0, hi = N - 1; while (hi - lo > 1) { var m = (lo + hi) >> 1; if (seq[m].km <= km) lo = m; else hi = m; } return lo; }
    function pointAt(km) {
      var i = idxAt(km), a = seq[i], b = seq[Math.min(N - 1, i + 1)];
      if (b.f !== a.f || b.km === a.km) return { i: i, c: a.c, t: a.t };
      var r = Math.max(0, Math.min(1, (km - a.km) / (b.km - a.km)));
      return { i: i, c: [a.c[0] + (b.c[0] - a.c[0]) * r, a.c[1] + (b.c[1] - a.c[1]) * r], t: a.t + (b.t - a.t) * r };
    }
    function trackUpTo(p) {
      var s = seq[p.i], out = D.track.features.slice(0, s.f);
      var part = D.track.features[s.f].geometry.coordinates.slice(0, s.k + 1).concat([p.c]);
      out.push({ type: "Feature", properties: D.track.features[s.f].properties, geometry: { type: "LineString", coordinates: part } });
      return { type: "FeatureCollection", features: out };
    }
    function show(km, follow, force) {
      if (!N) return; cur = Math.max(0, Math.min(END, km)); var p = pointAt(cur), s = seq[p.i], now = performance.now();
      if (force || now - lastDraw > 140 || cur >= END) { var src = o.map.getSource(o.source || "trk"); if (src) src.setData(cur >= END ? D.track : trackUpTo(p)); lastDraw = now; }
      if (o.marker) o.marker.setLngLat(cur >= END && D.latest && D.latest.manual ? [D.latest.lon, D.latest.lat] : p.c);
      if (o.ui.slider) o.ui.slider.value = Math.round(cur / (END || 1) * 1000);
      // clock in the local time where the walk happened (Pacific on the PCT, Berlin for test walks)
      if (o.ui.clock) o.ui.clock.textContent = dfmt(p.t, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: p.c[0] < -30 ? "America/Los_Angeles" : "Europe/Berlin" }) + T(" Uhr", "");
      var f = D.track.features[s.f], day = f.properties.day, dn = D.days.findIndex(function (d) { return d.date === day; });
      var atEnd = dayEnds.findIndex(function (k) { return Math.abs(k - cur) < 1e-6; });   // at a tent: still the day just walked
      if (atEnd >= 0 && atEnd < D.days.length && cur < END) { dn = atEnd; day = D.days[dn].date; }
      var dnow = dn + 1, done = cur >= END;   // tents only where the night is already behind (or reached)
      document.querySelectorAll(".camp").forEach(function (c) { var d = +c.dataset.day; c.style.visibility = (done || d < dnow || (d === dnow && dayEnds.some(function (k) { return Math.abs(k - cur) < 1e-6; }))) ? "visible" : "hidden"; });
      if (o.onUpdate) o.onUpdate({ km: cur, lnglat: p.c, feature: f, date: day, dayNo: dn + 1, day: D.days[dn], end: cur >= END, atCamp: atEnd >= 0 && cur < END });
      return p;
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = null; o.ui.play.innerHTML = "▶"; o.ui.play.classList.remove("on"); }
    function play() {
      if (!N) return;
      if (cur >= END) { show(0, false, true); var p0 = pointAt(0); o.map.jumpTo({ center: p0.c, zoom: ZOOM[sp] }); }
      cam = o.map.getCenter().toArray(); zoom = o.map.getZoom();
      o.ui.play.innerHTML = "❚❚"; o.ui.play.classList.add("on");
      var last = performance.now();
      function frame(now) {
        var dt = Math.min(64, now - last), p2; last = now;
        if (now >= restUntil && resting) { resting = false; if (o.onCamp) o.onCamp(null); }
        if (now < restUntil) { p2 = pointAt(cur); }                       // sleeping at the tent
        else {
          var p = pointAt(cur), f = D.track.features[seq[p.i].f], dayKm = Math.max(5, (f.properties.distance_m || 10000) / 1000);
          var nxt = cur + dayKm * dt * SPEEDS[sp] / DAY_MS;
          var stopAt = dayEnds.find(function (k) { return k > cur + 1e-9 && k <= nxt; });
          var camp = stopAt !== undefined ? (D.camps || [])[dayEnds.indexOf(stopAt)] : null, zero = camp ? camp.zero : 0;
          if (stopAt !== undefined) { nxt = stopAt; restUntil = now + NIGHT_MS * (1 + zero) / SPEEDS[sp]; if (zero && o.onCamp) { o.onCamp(camp); resting = true; } }
          p2 = show(nxt, true);
          if (stopAt !== undefined && o.ui.clock) o.ui.clock.textContent = (!zero && camp && camp.nero) ? "Nero · " + T("Nacht in ", "night in ") + camp.nero + " · Zzz" : zero ? zero + " Zero-" + (zero === 1 ? T("Tag", "day") : T("Tage", "days")) + (camp.town ? " in " + camp.town.name : "") + " · Zzz" : T("Nachtlager", "Camp") + " · Zzz";
        }
        var a = Math.min(1, dt / 650), za = Math.min(1, dt / 900);      // smoothing for camera and zoom
        cam = [cam[0] + (p2.c[0] - cam[0]) * a, cam[1] + (p2.c[1] - cam[1]) * a];
        zoom = zoom + (ZOOM[sp] - zoom) * za;
        o.map.jumpTo({ center: cam, zoom: zoom });
        if (cur >= END) { stop(); return; }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }
    o.ui.play.onclick = function () { raf ? stop() : play(); };
    // touching the map while it plays pauses the replay; play goes on from the same spot
    ["mousedown", "touchstart", "wheel"].forEach(function (ev) { o.map.getCanvasContainer().addEventListener(ev, function () { if (raf) { stop(); pausedAt = performance.now(); } }, { passive: true }); });
    if (o.ui.speed) o.ui.speed.onclick = function () { sp = (sp + 1) % SPEEDS.length; o.ui.speed.textContent = SPEEDS[sp] + "×"; };
    if (o.ui.slider) { o.ui.slider.max = 1000; o.ui.slider.oninput = function () { stop(); var p = show(+o.ui.slider.value / 1000 * END, false, true); if (p) o.map.jumpTo({ center: p.c }); }; }
    document.addEventListener("keydown", function (e) { if (e.code === "Space" && !(e.target.closest && e.target.closest("input,select,textarea,button"))) { e.preventDefault(); o.ui.play.click(); } });
    show(END, false, true);
    activeReplay = { stop: stop, seekTrail: seekTrail, maxTrail: maxTrail, toEnd: function () { stop(); if (N) show(END, false, true); } };
    return { stop: stop, toDate: function (date) {
      var k = -1; seq.forEach(function (s, j) { if (D.track.features[s.f].properties.day <= date) k = j; });
      if (k < 0) return null; stop(); show(seq[k].km, false, true); return seq[k].c; } };
  }

  // fit the map to all activities of one day
  function fitDay(map, D, date, pad) {
    var b = null;
    D.track.features.forEach(function (f) {
      if (f.properties.day !== date) return;
      f.geometry.coordinates.forEach(function (c) { if (!b) b = new maplibregl.LngLatBounds(c, c); else b.extend(c); });
    });
    if (b) map.fitBounds(b, { padding: pad || 50, maxZoom: 13, duration: 900 });
    return !!b;
  }
  // make an elevation profile element scrubbable: press/drag shows that trail point on the map
  var activeReplay = null, pausedAt = 0;
  function justPaused() { return performance.now() - pausedAt < 800; }   // that click only paused the replay
  var scrubResets = [];   // "where am I" clears the blue preview from the profile
  function scrubProfile(el, map, D, onKm, onReset) {
    var mk = null, down = false;
    scrubResets.push(function () { if (mk) { mk.remove(); mk = null; } if (onReset) onReset(); });
    function at(e) {
      var r = el.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left, km = Math.max(0, Math.min(1, x / r.width)) * D.total, p = atKm(D.pts, km);
      var R = activeReplay, walked = R && R.seekTrail && km <= R.maxTrail;
      if (R && R.seekTrail) R.seekTrail(walked ? km : R.maxTrail);   // own marker: back/forward along where you walked, else it waits at the farthest point
      if (walked) { if (mk) { mk.remove(); mk = null; } }
      else {
        if (!mk) { var d = document.createElement("div"); d.style.cssText = "width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #2235d6;box-shadow:0 0 0 2px rgba(255,255,255,.6)"; mk = new maplibregl.Marker({ element: d }).setLngLat([p.lon, p.lat]).addTo(map); }
        mk.setLngLat([p.lon, p.lat]);
      }
      map.easeTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 9.5), duration: down ? 0 : 600 });
      if (onKm) onKm(km, p, walked);
    }
    el.style.cursor = "ew-resize"; el.style.touchAction = "none"; el.style.userSelect = "none"; el.style.webkitUserSelect = "none";
    el.addEventListener("pointerdown", function (e) { if (activeReplay) activeReplay.stop(); down = true; el.setPointerCapture(e.pointerId); at(e); });
    el.addEventListener("pointermove", function (e) { if (down) at(e); });
    el.addEventListener("pointerup", function () { down = false; });
    el.addEventListener("pointercancel", function () { down = false; });
  }

  // trail point for a position, or null when it is more than 50 km off the trail
  function trailPoint(D, ll) { var s = snap(D.pts, ll[1], ll[0]); return s && s.off <= 50 ? s : null; }

  function reg(g) { return EN ? g.en : g.de; }
  function regS(g) { return EN ? g.en_s : g.short; }

  window.PCTLab = { load: load, photos: photos, hikerEl: hikerEl, hikerState: hikerState, TYPE: TYPE, nf: nf, hav: hav, atKm: atKm, src: SRC,
    switcher: switcher, lightbox: lightbox, replay: replay, addTowns: addTowns, addCamps: addCamps, dayColor: dayColor, trailPoint: trailPoint, fitDay: fitDay, addManual: addManual, addClosures: addClosures, justPaused: justPaused, closureBands: closureBands, declutter: declutter, TERMS: TERMS, placePhotos: placePhotos, addLocate: addLocate, BED: BED, scrubProfile: scrubProfile, BASE: BASE, START: START,
    EN: EN, LANG: LANG, LOC: LOC, T: T, dist: dist, distV: distV, DU: DU, elev: elev, elevV: elevV, EU: EU, dfmt: dfmt, reg: reg, regS: regS, addLandmarks: addLandmarks };
})();
