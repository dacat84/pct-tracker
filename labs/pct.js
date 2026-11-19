// PCT Labs: shared core for the test designs (data, landmarks, photos, hiker marker).
// Not linked from the live site. Data source: ?data=demo (default) | test | live.
(function () {
  "use strict";
  var BASE = "/pct-tracker/";
  var qs = new URLSearchParams(location.search);
  var SRC = qs.get("data") || "demo";
  var DIR = { demo: "data/demo/", test: "data/test/", live: "data/" }[SRC] || "data/demo/";
  var NOMINAL = 4265, MI2KM = 1.60934;
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
  var LM = [[0,"Campo","term",1],[20,"Lake Morena","water",3],[42,"Mt. Laguna","town",2],[77,"Scissors Crossing","pass",3],[109,"Warner Springs","town",3],[127,"Agua Caliente","park",3],[152,"Paradise Valley Café","town",3],[179,"Idyllwild","town",2],[187,"San Jacinto Peak","peak",2],[210,"San Gorgonio Pass","pass",2],[266,"Big Bear","town",2],[308,"Deep Creek Hot Springs","water",2],[342,"Cajon Pass","pass",2],[369,"Wrightwood","town",2],[379,"Mt. Baden-Powell","peak",1],[444,"Acton","town",3],[452,"Vasquez Rocks","park",3],[454,"Agua Dulce","town",2],[517,"Mojave Desert","desert",2],[566,"Tehachapi","town",2],[652,"Walker Pass","pass",2],[702,"Kennedy Meadows S","town",1],[750,"Cottonwood Pass","pass",3],[767,"Mt. Whitney","peak",1],[779,"Forester Pass","pass",1],[792,"Glen Pass","pass",2],[807,"Pinchot Pass","pass",3],[815,"Mather Pass","pass",2],[843,"Muir Pass","pass",2],[857,"Muir Trail Ranch","town",3],[878,"Vermilion Valley Resort","town",3],[906,"Reds Meadow","town",3],[910,"Mammoth Lakes","town",2],[942,"Tuolumne Meadows","town",1],[1017,"Sonora Pass","pass",2],[1032,"Ebbetts Pass","pass",3],[1077,"Carson Pass","pass",3],[1090,"Lake Tahoe","water",1],[1094,"South Lake Tahoe","town",2],[1153,"Donner Pass","pass",2],[1195,"Sierra Buttes","peak",3],[1250,"Bucks Summit","pass",3],[1287,"Belden","town",3],[1325,"Halfway Point","term",1],[1352,"Lassen Peak","peak",2],[1378,"Subway Cave","water",3],[1410,"Burney","town",3],[1418,"Burney Falls","water",2],[1500,"Mt. Shasta","peak",1],[1501,"Castle Crags","park",2],[1599,"Etna","town",3],[1656,"Seiad Valley","town",2],[1690,"Oregon Border","term",1],[1726,"Ashland","town",2],[1775,"Mt. McLoughlin","peak",3],[1820,"Crater Lake","water",1],[1880,"Diamond Peak","peak",3],[1907,"Willamette Pass","pass",3],[1965,"Three Sisters","peak",2],[1990,"McKenzie Pass","pass",3],[2001,"Santiam Pass","pass",3],[2005,"Three Fingered Jack","peak",3],[2030,"Mt. Jefferson","peak",2],[2045,"Olallie Lake","water",3],[2097,"Mt. Hood","peak",1],[2098,"Timberline Lodge","town",2],[2120,"Tunnel Falls","water",3],[2144,"Cascade Locks","town",1],[2225,"Mt. Adams","peak",2],[2265,"Goat Rocks","peak",2],[2295,"White Pass","pass",3],[2320,"Mt. Rainier","peak",2],[2393,"Snoqualmie Pass","pass",2],[2400,"Kendall Katwalk","peak",3],[2461,"Stevens Pass","pass",2],[2530,"Glacier Peak","peak",2],[2572,"Stehekin","town",2],[2591,"Rainy Pass","pass",3],[2620,"Harts Pass","pass",3],[2650,"Northern Terminus","term",1]];
  // Features that are not on the trail itself: real position. side = a side trip from the trail (dashed link).
  var OFF = {
    "Mt. Whitney": [36.5785, -118.2923, true], "San Jacinto Peak": [33.8147, -116.6794, true], "Mt. Baden-Powell": [34.3586, -117.7647, true],
    "Mt. Shasta": [41.4092, -122.1949], "Lassen Peak": [40.4882, -121.5050], "Mt. Hood": [45.3736, -121.6959], "Mt. Rainier": [46.8529, -121.7604],
    "Mt. Adams": [46.2024, -121.4909], "Mt. Jefferson": [44.6743, -121.7995], "Three Sisters": [44.1488, -121.7838], "Glacier Peak": [48.1125, -121.1139],
    "Mt. McLoughlin": [42.4451, -122.3155], "Diamond Peak": [43.5207, -122.1496], "Three Fingered Jack": [44.4767, -121.8441],
    "Crater Lake": [42.9446, -122.1090], "Lake Tahoe": [39.0968, -120.0324], "Sierra Buttes": [39.5943, -120.6406]
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
  function dist(km, d) { return nf(distV(km), d || 0) + " " + DU(); }
  function elevV(m) { return EN ? m * 3.28084 : m; } function EU() { return EN ? "ft" : "m"; }
  function elev(m) { return nf(elevV(m), 0) + " " + EU(); }
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
      J("labs/diary.json").catch(function () { return window.PCT_DIARY || []; })])
      .then(function (r) {
        var prof = r[0], track = r[1], latest = r[2], line = r[3], diary = r[4] || [], pts = prof.points, F = prof.total_km / NOMINAL;
        var feats = (track.features || []).filter(function (f) { return f.geometry && f.geometry.coordinates && f.geometry.coordinates.length; })
          .sort(function (a, b) { return String(a.properties.start_date).localeCompare(String(b.properties.start_date)); });
        var here = latest && typeof latest.lat === "number" ? snap(pts, latest.lat, latest.lon) : null;
        if (!here || here.off > 50) here = { km: 0, m: pts[0].m, lat: pts[0].lat, lon: pts[0].lon, off: 0 };
        var lms = LM.map(function (m) {
          var km = m[0] * MI2KM * F, o = OFF[m[1]], p = o ? snap(pts, o[0], o[1]) : atKm(pts, km);
          if (o) km = p.km;
          return { name: m[1], type: m[2], tier: m[3], km: km, lat: o ? o[0] : p.lat, lon: o ? o[1] : p.lon, m: p.m, side: o && o[2], trail: [p.lon, p.lat] };
        });
        var regs = REGIONS.map(function (g) { return Object.assign({}, g, { ka: g.a * F, kb: g.b * F }); });
        var reg = regs.find(function (g) { return here.km >= g.ka && here.km < g.kb; }) || regs[regs.length - 1];
        // days: group activities by local date of their start
        var days = {};
        feats.forEach(function (f) {
          var d = String(f.properties.start_date).slice(0, 10);
          days[d] = days[d] || { date: d, km: 0, up: 0, sec: 0 }; days[d].km += (f.properties.distance_m || 0) / 1000; days[d].up += f.properties.elevation_gain_m || 0; days[d].sec += f.properties.moving_time_s || 0;
        });
        var dayList = Object.keys(days).sort().map(function (k) { return days[k]; });
        var dayIx = {}; dayList.forEach(function (d, i) { dayIx[d.date] = i; });
        feats.forEach(function (f) { f.properties.dayIdx = dayIx[String(f.properties.start_date).slice(0, 10)]; });
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
          dayNo: dayList.length, walkedKm: totalKm, next: next, towns: towns, diary: diary, camps: camps
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
    ["Kennedy Meadows", 35.9823, -118.1242, "General Store · Resupply · Bear Canister"],
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
    "Mount Shasta": ["I-5 bei Castle Crags", 41.1500, -122.3100], "Ashland": ["I-5 bei Callahan's", 42.0900, -122.6010],
    "Sisters": ["Santiam Pass", 44.4253, -121.8546], "Skykomish": ["Stevens Pass", 47.7463, -121.0857],
    "Stehekin": ["High Bridge", 48.3880, -120.8410], "Mazama": ["Rainy Pass", 48.5157, -120.7357]
  };
  function addTowns(map, D, theme) {
    theme = theme || {};
    var css = document.getElementById("tw-css");
    if (!css) { css = document.createElement("style"); css.id = "tw-css";
      css.textContent = ".tw{display:flex;align-items:center;gap:5px;cursor:pointer}.tw i{width:12px;height:12px;border-radius:3px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5)}" +
        ".tw span{font:600 12px Inter,system-ui,sans-serif;white-space:nowrap}" +
        ".tw-pop .maplibregl-popup-content{padding:12px 14px;max-width:260px;font:14px/1.45 Inter,system-ui,sans-serif;color:#14202a;border-radius:6px}" +
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
      var pop = new maplibregl.Popup({ offset: 12, className: "tw-pop", maxWidth: "280px" }).setHTML(
        "<h4>" + t[0] + '</h4><div class="m">' + (direct ? T("Direkt am Trail", "Right on the trail") + " · Trail-" + DU() + " " + nf(distV(s ? s.km : 0))
          : (acc ? T("Zugang: ", "Access: ") + acc[0] : T("Nächster Trailpunkt", "Nearest trail point")) + " · Trail-" + DU() + " " + nf(distV(s ? s.km : 0)) + "<br>" + T("ca. ", "approx. ") + nf(distV(off), off < 10 ? 1 : 0) + " " + DU() + (via ? T(" bis in den Ort (über die Straße)", " to town (by road)") : T(" Luftlinie bis in den Ort", " to town (straight line)"))) + "</div>" +
        t[3] + '<div class="n">' + T("Stand Planung, vor Ort gilt FarOut.", "From planning, check FarOut on trail.") + "</div>");
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat([t[2], t[1]]).setPopup(pop).addTo(map);
    });
    D.landmarks.forEach(function (l) { if (l.side) lines.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: [[l.lon, l.lat], l.trail] } }); });
    map.addSource("tw-links", { type: "geojson", data: lines });
    map.addLayer({ id: "tw-links", type: "line", source: "tw-links", paint: { "line-color": theme.link || "#f5b301", "line-width": 1.3, "line-opacity": .8, "line-dasharray": [2, 2] } });
  }

  // ---- Trail landmarks (peaks, passes, water, parks, termini), clickable ----
  function addLandmarks(map, D, theme) {
    theme = theme || {};
    D.landmarks.filter(function (l) { return l.type !== "town"; }).forEach(function (l) {
      var Ty = TYPE[l.type] || TYPE.town, el = document.createElement("div");
      el.className = "lm " + l.type + " t" + l.tier; el.style.cursor = "pointer"; el.style.pointerEvents = "auto";
      el.innerHTML = "<i style='background:" + (theme.dot ? theme.dot(l) : Ty.c) + "'></i><span>" + l.name + "</span>";
      if (l.type === "peak" && !theme.dot) el.firstChild.style.background = "transparent";
      var pop = new maplibregl.Popup({ offset: 10, className: "tw-pop", maxWidth: "260px" }).setHTML(
        "<h4>" + l.name + '</h4><div class="m">' + Ty[LANG] + " · " + elev(l.m) + "</div>" +
        (l.side ? T("Abstecher vom Trail bei ", "Side trip from the trail at ") : T("Am Trail bei ", "On the trail at ")) + "Trail-" + DU() + " " + nf(distV(l.km)) +
        (l.type === "term" ? "" : "<br>" + T("Ab Campo ", "From Campo ") + dist(l.km) + T(", bis Kanada ", ", to Canada ") + dist(D.total - l.km)));
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-5, 0] }).setLngLat([l.lon, l.lat]).setPopup(pop).addTo(map);
    });
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
      var mk = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(c.lnglat).addTo(map);
      if (c.zero) {   // rest days: counter at the nearby town (or at the tent if there is none)
        var z = document.createElement("div"); z.className = "camp"; z.dataset.day = c.day;
        z.title = c.zero + (c.zero === 1 ? " Zero-" + T("Tag", "day") : " Zero-" + T("Tage", "days")) + (c.town ? " in " + c.town.name : "");
        z.style.cssText = "background:" + fill + ";color:" + ink + ";border:2px solid " + ink + ";border-radius:12px;padding:2px 7px;font:700 11px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.4)";
        z.textContent = c.zero + " × Zero";
        new maplibregl.Marker({ element: z, anchor: c.town ? "top" : "bottom", offset: c.town ? [0, 10] : [0, -28] }).setLngLat(c.town ? c.town.lnglat : c.lnglat).addTo(map);
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
        ".lb img{max-width:92vw;max-height:80vh;box-shadow:0 10px 40px rgba(0,0,0,.6)}.lb .cap{color:#dfe6ea;font:500 14px Inter,system-ui,sans-serif;text-align:center;max-width:80vw}" +
        ".lb button{position:absolute;top:50%;transform:translateY(-50%);all:unset;cursor:pointer;color:#fff;font:300 46px/1 system-ui;padding:20px;opacity:.8}.lb .p{left:8px}.lb .n{right:8px}" +
        ".lb .x{position:absolute;top:14px;right:18px;color:#fff;font:300 34px/1 system-ui;cursor:pointer}";
      document.head.appendChild(css); }
    var lb = document.createElement("div"); lb.className = "lb";
    function show() {
      var p = list[i], d = p.taken ? dfmt(p.taken.replace(" ", "T"), { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) + T(" Uhr", "") : "";
      lb.innerHTML = '<span class="x">×</span>' + (list.length > 1 ? '<button class="p">‹</button><button class="n">›</button>' : "") +
        '<img src="' + (p.l || p.m) + '" alt=""><div class="cap">' + [p.title, d].filter(Boolean).join(" · ") + "</div>";
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
    var dayEnds = [], dayOf = function (s) { return String(D.track.features[s.f].properties.start_date).slice(0, 10); };
    for (var q = 0; q < N - 1; q++) if (dayOf(seq[q]) !== dayOf(seq[q + 1])) dayEnds.push(seq[q].km);
    var restUntil = 0;
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
      if (o.marker) o.marker.setLngLat(p.c);
      if (o.ui.slider) o.ui.slider.value = Math.round(cur / (END || 1) * 1000);
      if (o.ui.clock) o.ui.clock.textContent = dfmt(p.t, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" }) + T(" Uhr", "");
      var f = D.track.features[s.f], day = String(f.properties.start_date).slice(0, 10), dn = D.days.findIndex(function (d) { return d.date === day; });
      var dnow = dn + 1, done = cur >= END;   // tents only where the night is already behind (or reached)
      document.querySelectorAll(".camp").forEach(function (c) { var d = +c.dataset.day; c.style.visibility = (done || d < dnow || (d === dnow && dayEnds.some(function (k) { return Math.abs(k - cur) < 1e-6; }))) ? "visible" : "hidden"; });
      if (o.onUpdate) o.onUpdate({ km: cur, lnglat: p.c, feature: f, date: day, dayNo: dn + 1, day: D.days[dn], end: cur >= END });
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
        if (now < restUntil) { p2 = pointAt(cur); }                       // sleeping at the tent
        else {
          var p = pointAt(cur), f = D.track.features[seq[p.i].f], dayKm = Math.max(5, (f.properties.distance_m || 10000) / 1000);
          var nxt = cur + dayKm * dt * SPEEDS[sp] / DAY_MS;
          var stopAt = dayEnds.find(function (k) { return k > cur + 1e-9 && k <= nxt; });
          var camp = stopAt !== undefined ? (D.camps || [])[dayEnds.indexOf(stopAt)] : null, zero = camp ? camp.zero : 0;
          if (stopAt !== undefined) { nxt = stopAt; restUntil = now + NIGHT_MS * (1 + zero) / SPEEDS[sp]; }
          p2 = show(nxt, true);
          if (stopAt !== undefined && o.ui.clock) o.ui.clock.textContent = zero ? zero + " Zero-" + (zero === 1 ? T("Tag", "day") : T("Tage", "days")) + (camp.town ? " in " + camp.town.name : "") + " · Zzz" : T("Nachtlager", "Camp") + " · Zzz";
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
    if (o.ui.speed) o.ui.speed.onclick = function () { sp = (sp + 1) % SPEEDS.length; o.ui.speed.textContent = SPEEDS[sp] + "×"; };
    if (o.ui.slider) { o.ui.slider.max = 1000; o.ui.slider.oninput = function () { stop(); var p = show(+o.ui.slider.value / 1000 * END, false, true); if (p) o.map.jumpTo({ center: p.c }); }; }
    document.addEventListener("keydown", function (e) { if (e.code === "Space" && !(e.target.closest && e.target.closest("input,select,textarea,button"))) { e.preventDefault(); o.ui.play.click(); } });
    show(END, false, true);
    return { stop: stop, toDate: function (date) {
      var k = -1; seq.forEach(function (s, j) { if (String(D.track.features[s.f].properties.start_date).slice(0, 10) <= date) k = j; });
      if (k < 0) return null; stop(); show(seq[k].km, false, true); return seq[k].c; } };
  }

  // trail point for a position, or null when it is more than 50 km off the trail
  function trailPoint(D, ll) { var s = snap(D.pts, ll[1], ll[0]); return s && s.off <= 50 ? s : null; }

  function reg(g) { return EN ? g.en : g.de; }
  function regS(g) { return EN ? g.en_s : g.short; }

  window.PCTLab = { load: load, photos: photos, hikerEl: hikerEl, hikerState: hikerState, TYPE: TYPE, nf: nf, hav: hav, atKm: atKm, src: SRC,
    switcher: switcher, lightbox: lightbox, replay: replay, addTowns: addTowns, addCamps: addCamps, dayColor: dayColor, trailPoint: trailPoint, BASE: BASE,
    EN: EN, LANG: LANG, LOC: LOC, T: T, dist: dist, distV: distV, DU: DU, elev: elev, elevV: elevV, EU: EU, dfmt: dfmt, reg: reg, regS: regS, addLandmarks: addLandmarks };
})();
