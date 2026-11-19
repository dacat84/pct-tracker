// PCT Labs: shared core for the test designs (data, landmarks, photos, hiker marker).
// Not linked from the live site. Data source: ?data=demo (default) | test | live.
(function () {
  "use strict";
  var BASE = "/pct-tracker/";
  var qs = new URLSearchParams(location.search);
  var SRC = qs.get("data") || "demo";
  var DIR = { demo: "data/demo/", test: "data/test/", live: "data/" }[SRC] || "data/demo/";
  var NOMINAL = 4265, MI2KM = 1.60934;

  // Sections of the trail (km on the nominal 4265 km scale) and landmarks [mile, name, type, tier].
  var REGIONS = [
    { de: "Südkalifornien", en: "Southern California", short: "Wüste", a: 0, b: 1130, c: "#e0a06a" },
    { de: "Zentralsierra", en: "Central Sierra", short: "Sierra", a: 1130, b: 1637, c: "#9dbf78" },
    { de: "Nördliche Sierra", en: "Northern Sierra", short: "Nördl. Sierra", a: 1637, b: 2270, c: "#7fb08a" },
    { de: "Nordkalifornien", en: "Northern California", short: "Nordkalifornien", a: 2270, b: 2720, c: "#6fae9e" },
    { de: "Oregon", en: "Oregon", short: "Oregon", a: 2720, b: 3455, c: "#8aa4c0" },
    { de: "Washington", en: "Washington", short: "Washington", a: 3455, b: 4265, c: "#b39ac8" }
  ];
  var LM = [[0,"Campo","term",1],[20,"Lake Morena","water",3],[42,"Mt. Laguna","town",2],[77,"Scissors Crossing","pass",3],[109,"Warner Springs","town",3],[127,"Agua Caliente","park",3],[152,"Paradise Valley Café","town",3],[179,"Idyllwild","town",2],[187,"San Jacinto Peak","peak",2],[210,"San Gorgonio Pass","pass",2],[266,"Big Bear","town",2],[308,"Deep Creek Hot Springs","water",2],[342,"Cajon Pass","pass",2],[369,"Wrightwood","town",2],[379,"Mt. Baden-Powell","peak",1],[444,"Acton","town",3],[452,"Vasquez Rocks","park",3],[454,"Agua Dulce","town",2],[517,"Mojave Desert","desert",2],[566,"Tehachapi","town",2],[652,"Walker Pass","pass",2],[702,"Kennedy Meadows S","town",1],[750,"Cottonwood Pass","pass",3],[767,"Mt. Whitney","peak",1],[779,"Forester Pass","pass",1],[792,"Glen Pass","pass",2],[807,"Pinchot Pass","pass",3],[815,"Mather Pass","pass",2],[843,"Muir Pass","pass",2],[857,"Muir Trail Ranch","town",3],[878,"Vermilion Valley Resort","town",3],[906,"Reds Meadow","town",3],[910,"Mammoth Lakes","town",2],[942,"Tuolumne Meadows","town",1],[1017,"Sonora Pass","pass",2],[1032,"Ebbetts Pass","pass",3],[1077,"Carson Pass","pass",3],[1090,"Lake Tahoe","water",1],[1094,"South Lake Tahoe","town",2],[1153,"Donner Pass","pass",2],[1195,"Sierra Buttes","peak",3],[1250,"Bucks Summit","pass",3],[1287,"Belden","town",3],[1325,"Halfway Point","term",1],[1352,"Lassen Peak","peak",2],[1378,"Subway Cave","water",3],[1410,"Burney","town",3],[1418,"Burney Falls","water",2],[1500,"Mt. Shasta","peak",1],[1501,"Castle Crags","park",2],[1599,"Etna","town",3],[1656,"Seiad Valley","town",2],[1690,"Oregon Border","term",1],[1726,"Ashland","town",2],[1775,"Mt. McLoughlin","peak",3],[1820,"Crater Lake","water",1],[1880,"Diamond Peak","peak",3],[1907,"Willamette Pass","pass",3],[1965,"Three Sisters","peak",2],[1990,"McKenzie Pass","pass",3],[2001,"Santiam Pass","pass",3],[2005,"Three Fingered Jack","peak",3],[2030,"Mt. Jefferson","peak",2],[2045,"Olallie Lake","water",3],[2097,"Mt. Hood","peak",1],[2098,"Timberline Lodge","town",2],[2120,"Tunnel Falls","water",3],[2144,"Cascade Locks","town",1],[2225,"Mt. Adams","peak",2],[2265,"Goat Rocks","peak",2],[2295,"White Pass","pass",3],[2320,"Mt. Rainier","peak",2],[2393,"Snoqualmie Pass","pass",2],[2400,"Kendall Katwalk","peak",3],[2461,"Stevens Pass","pass",2],[2530,"Glacier Peak","peak",2],[2572,"Stehekin","town",2],[2591,"Rainy Pass","pass",3],[2620,"Harts Pass","pass",3],[2650,"Northern Terminus","term",1]];
  var TYPE = {
    term: { de: "Terminus", c: "#ff4d2e", i: "★" }, town: { de: "Ort / Resupply", c: "#f5b301", i: "⌂" },
    pass: { de: "Pass", c: "#7ed6a5", i: "⋀" }, peak: { de: "Gipfel", c: "#ffffff", i: "▲" },
    water: { de: "Wasser", c: "#6ec6ff", i: "≈" }, park: { de: "Park / Wildnis", c: "#9dbf78", i: "♣" },
    desert: { de: "Wüste", c: "#e0a06a", i: "☀" }
  };

  function hav(a, b, c, d) {
    var R = 6371.0088, p1 = a * Math.PI / 180, p2 = c * Math.PI / 180, dp = p2 - p1, dl = (d - b) * Math.PI / 180;
    return 2 * R * Math.asin(Math.sqrt(Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2));
  }
  function J(p) { return fetch(BASE + p, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(p); return r.json(); }); }
  function nf(v, d) { return Number(v).toLocaleString("de-DE", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

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
      J(DIR + "latest.json").catch(function () { return null; }), J("data/Full_PCT_Simplified.geojson")])
      .then(function (r) {
        var prof = r[0], track = r[1], latest = r[2], line = r[3], pts = prof.points, F = prof.total_km / NOMINAL;
        var feats = (track.features || []).filter(function (f) { return f.geometry && f.geometry.coordinates && f.geometry.coordinates.length; })
          .sort(function (a, b) { return String(a.properties.start_date).localeCompare(String(b.properties.start_date)); });
        var here = latest && typeof latest.lat === "number" ? snap(pts, latest.lat, latest.lon) : null;
        if (!here || here.off > 50) here = { km: 0, m: pts[0].m, lat: pts[0].lat, lon: pts[0].lon, off: 0 };
        var lms = LM.map(function (m) {
          var km = m[0] * MI2KM * F, p = atKm(pts, km);
          return { name: m[1], type: m[2], tier: m[3], km: km, lat: p.lat, lon: p.lon, m: p.m };
        });
        var regs = REGIONS.map(function (g) { return Object.assign({}, g, { ka: g.a * F, kb: g.b * F }); });
        var reg = regs.find(function (g) { return here.km >= g.ka && here.km < g.kb; }) || regs[regs.length - 1];
        // days: group activities by local date of their start
        var days = {};
        feats.forEach(function (f) {
          var d = String(f.properties.start_date).slice(0, 10);
          days[d] = days[d] || { date: d, km: 0, up: 0 }; days[d].km += (f.properties.distance_m || 0) / 1000; days[d].up += f.properties.elevation_gain_m || 0;
        });
        var dayList = Object.keys(days).sort().map(function (k) { return days[k]; });
        var totalKm = dayList.reduce(function (s, d) { return s + d.km; }, 0);
        var next = lms.filter(function (l) { return (l.type === "town" || l.type === "term") && l.km > here.km + 0.5; })[0] || null;
        return {
          src: SRC, pts: pts, total: prof.total_km, line: line, track: { type: "FeatureCollection", features: feats }, latest: latest,
          here: here, landmarks: lms, regions: regs, region: reg, days: dayList, today: dayList[dayList.length - 1] || null,
          dayNo: dayList.length, walkedKm: totalKm, next: next, diary: (window.PCT_DIARY || [])
        };
      });
  }

  window.PCTLab = { load: load, photos: photos, hikerEl: hikerEl, hikerState: hikerState, TYPE: TYPE, nf: nf, hav: hav, atKm: atKm, src: SRC };
})();
