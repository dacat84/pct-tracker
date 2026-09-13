/* PCT elevation profile + self-configuring home hero (DE/EN, metric/imperial).
   Data: data/pct_profile.json (km + m + lat/lon), data/latest.json (live GPS),
   data/track.geojson (tracked activities). Language from localStorage 'pctLang'.
   Only the actually-tracked segments are drawn solid (projected from the GPS
   activities); everything else stays faded, so skipped/closed sections show as
   gaps. avg/day = tracked distance / active days (not position / days). */
(function () {
  "use strict";
  var BASE = "/pct-tracker/";
  var NOMINAL = 4265;

  var LANG = localStorage.getItem("pctLang");
  if (LANG !== "de" && LANG !== "en") LANG = ((navigator.language || "en").slice(0, 2) === "de") ? "de" : "en";
  var DE = LANG === "de";
  var LOC = DE ? "de-DE" : "en-US";
  var DARR = "\u2192";
  var EARR = "\u25B2";

  var STR = DE ? {
    liveDay: "Tag", inThe: "Ich bin gerade in ", rightNow: ".",
    fromCampo: " ab Campo", nearestWp: " \u00B7 n\u00e4chster Wegpunkt ", stillPre: "noch ", toEnd: " bis zum Northern Terminus.",
    climb: "Pacific Crest Trail", nowAt: "Aktuell auf ",
    here: "Standort", legPass: "Pass / Gipfel", legSide: "Abstecher", legTown: "Versorgungsort",
    legState: "Voll = getrackt \u00B7 blass = noch nicht", near: "Nahe ",
    distWord: "Distanz", altWord: "H\u00f6he", resupply: "Versorgungsort", zoomHint: "Sektion antippen zum Zoomen"
  } : {
    liveDay: "Day", inThe: "I'm in the ", rightNow: " right now.",
    fromCampo: " from Campo", nearestWp: " \u00B7 next waypoint ", stillPre: "", toEnd: " still to the Northern Terminus.",
    climb: "Pacific Crest Trail", nowAt: "Now at ",
    here: "You are here", legPass: "Pass / peak", legSide: "Side trip", legTown: "Resupply town",
    legState: "Solid = tracked \u00B7 faded = not yet", near: "Near ",
    distWord: "distance", altWord: "elevation", resupply: "Resupply", zoomHint: "Tap a section to zoom"
  };
  var REG_DE = {
    "Southern California": "S\u00fcdkalifornien", "Central Sierra": "Zentralsierra",
    "Northern Sierra": "N\u00f6rdliche Sierra", "Northern California": "Nordkalifornien",
    "Oregon": "Oregon", "Washington": "Washington"
  };

  var REGIONS = [
    { name: "Southern California", a: 0, b: 1130, c: "#e0a06a", st: "CA" },
    { name: "Central Sierra", a: 1130, b: 1637, c: "#9dbf78", st: "CA" },
    { name: "Northern Sierra", a: 1637, b: 2270, c: "#7fb08a", st: "CA" },
    { name: "Northern California", a: 2270, b: 2720, c: "#6fae9e", st: "CA" },
    { name: "Oregon", a: 2720, b: 3455, c: "#8aa4c0", st: "OR" },
    { name: "Washington", a: 3455, b: 4265, c: "#b39ac8", st: "WA" }
  ];
  var MI2KM = 1.60934;
  var TYPECOL = { peak: "#b5651d", pass: "#2c7a3d", town: "#6b7280", water: "#2f7fae", park: "#3e9a51", term: "#cf7440", side: "#cf7440", desert: "#d19a3a" };
  var TYPEDE = { peak: "Gipfel", pass: "Pass", town: "Ort", water: "Wasser / Feature", park: "Park / Wildnis", term: "Terminus", side: "Abstecher", desert: "W\u00fcste" };
  var TYPEEN = { peak: "Peak", pass: "Pass", town: "Resupply", water: "Water / feature", park: "Park / wilderness", term: "Terminus", side: "Side trip", desert: "Desert" };
  // [mile, name, type, tier]  tier 1 = headline (always), 2 = star (on zoom), 3 = rest (tap)
  var LM = [[0,"Campo","term",1],[20,"Lake Morena","water",3],[42,"Mt. Laguna","town",2],[77,"Scissors Crossing","pass",3],[91,"San Felipe Hills","peak",3],[109,"Warner Springs","town",3],[127,"Agua Caliente","park",3],[152,"Paradise Valley Café","town",3],[170,"San Jacinto Mtns","peak",3],[179,"Idyllwild","town",3],[187,"San Jacinto Peak","peak",2],[191,"Fuller Ridge","peak",3],[210,"San Gorgonio Pass","pass",2],[266,"Big Bear","town",2],[308,"Deep Creek Hot Springs","water",2],[342,"Cajon Pass","pass",2],[369,"Wrightwood","town",3],[379,"Mt. Baden-Powell","peak",1],[390,"Angeles Crest","pass",3],[444,"Acton","town",3],[452,"Vasquez Rocks","park",3],[454,"Agua Dulce","town",2],[462,"Sierra Pelona","peak",3],[517,"Mojave Desert","desert",2],[566,"Tehachapi","town",2],[652,"Walker Pass","pass",2],[702,"Kennedy Meadows S","town",2],[745,"Horseshoe Meadows","water",3],[750,"Cottonwood Pass","pass",3],[767,"Mt. Whitney","peak",1],[779,"Forester Pass","pass",1],[770,"Sequoia NP","park",2],[785,"Kern Canyon","water",3],[792,"Glen Pass","pass",2],[800,"Kings Canyon NP","park",2],[807,"Pinchot Pass","pass",3],[815,"Mather Pass","pass",2],[838,"Evolution Basin","water",3],[843,"Muir Pass","pass",2],[857,"Muir Trail Ranch","town",3],[878,"Vermilion Valley Resort","town",3],[906,"Reds Meadow","town",3],[907,"Devils Postpile","park",3],[910,"Mammoth Lakes","town",3],[942,"Tuolumne Meadows","town",2],[950,"Yosemite NP","park",2],[1017,"Sonora Pass","pass",2],[1032,"Ebbetts Pass","pass",3],[1077,"Carson Pass","pass",3],[1090,"Lake Tahoe","water",1],[1088,"Tahoe Rim","side",1],[1092,"Echo Summit","pass",3],[1094,"South Lake Tahoe","town",3],[1153,"Donner Pass","pass",2],[1155,"Donner Lake","water",3],[1195,"Sierra Buttes","peak",3],[1245,"Bucks Lake","water",3],[1250,"Bucks Summit","pass",3],[1270,"Feather River","water",3],[1287,"Belden","town",3],[1325,"Halfway Point","term",2],[1350,"Lassen Volcanic NP","park",2],[1352,"Lassen Peak","peak",2],[1373,"Hat Creek Rim","park",2],[1375,"Hat Creek","town",3],[1378,"Subway Cave","water",2],[1418,"Burney Falls","water",2],[1410,"Burney","town",3],[1450,"McCloud River","water",3],[1500,"Mt. Shasta","peak",1],[1501,"Castle Crags","park",2],[1505,"Sacramento River","water",3],[1560,"Trinity Alps","peak",3],[1597,"Etna Summit","pass",3],[1599,"Etna","town",3],[1620,"Siskiyou Wild.","park",3],[1630,"Marble Mountains","peak",3],[1656,"Seiad Valley","town",3],[1658,"Klamath River","water",2],[1690,"Oregon Border","term",2],[1710,"Siskiyou Summit","pass",3],[1726,"Ashland","town",3],[1745,"Hyatt Lake","water",3],[1775,"Mt. McLoughlin","peak",3],[1790,"Sky Lakes Wild.","park",3],[1820,"Crater Lake","water",1],[1825,"Mt. Mazama","peak",3],[1880,"Diamond Peak","peak",2],[1907,"Willamette Pass","pass",3],[1965,"Three Sisters","peak",2],[1990,"McKenzie Pass","pass",3],[1998,"Mt. Washington","peak",3],[2001,"Santiam Pass","pass",3],[2005,"Three Fingered Jack","peak",2],[2030,"Mt. Jefferson","peak",2],[2035,"Jefferson Park","park",3],[2045,"Olallie Lake","water",3],[2085,"Timothy Lake","water",3],[2097,"Mt. Hood","peak",1],[2098,"Timberline Lodge","town",2],[2115,"Eagle Creek","water",3],[2120,"Tunnel Falls","water",2],[2144,"Cascade Locks","town",3],[2147,"Bridge of the Gods","term",2],[2180,"Indian Heaven Wild.","park",3],[2225,"Mt. Adams","peak",2],[2260,"Goat Rocks Wild.","park",3],[2265,"Goat Rocks","peak",2],[2270,"Knife Edge","peak",3],[2295,"White Pass","pass",3],[2320,"Mt. Rainier","peak",2],[2322,"Chinook Pass","pass",3],[2393,"Snoqualmie Pass","pass",2],[2400,"Kendall Katwalk","peak",2],[2410,"Alpine Lakes Wild.","park",3],[2461,"Stevens Pass","pass",2],[2465,"Skykomish River","water",3],[2510,"Glacier Peak Wild.","park",3],[2530,"Glacier Peak","peak",1],[2570,"High Bridge","water",3],[2572,"Stehekin","town",2],[2591,"Rainy Pass","pass",2],[2600,"North Cascades NP","park",2],[2620,"Harts Pass","pass",2],[2630,"Pasayten Wild.","park",3],[2650,"Northern Terminus","term",1]];
  var LIFT = [[767, 4421], [779, 4009], [843, 3637], [1017, 2933]];
  var WAY = LM.filter(function (m) { return m[2] === "town" || m[2] === "term"; }).map(function (m) { return [m[0] * MI2KM, m[1]]; });

  function haversine(la1, lo1, la2, lo2) {
    var R = 6371.0088, p1 = la1 * Math.PI / 180, p2 = la2 * Math.PI / 180;
    var dp = (la2 - la1) * Math.PI / 180, dl = (lo2 - lo1) * Math.PI / 180;
    var h = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function nfmt(n, dec) {
    return n.toLocaleString(LOC, dec != null ? { minimumFractionDigits: dec, maximumFractionDigits: dec } : { maximumFractionDigits: 0 });
  }
  function toDist(km) { return DE ? km : km * 0.621371; }
  function toElev(m) { return DE ? m : m * 3.28084; }
  function distStr(km, dec) { return nfmt(toDist(km), dec) + (DE ? " km" : " mi"); }
  function elevStr(m) { return nfmt(toElev(m), 0) + (DE ? " m" : " ft"); }
  function regName(r) { return DE ? (REG_DE[r.name] || r.name) : r.name; }
  function setHTML(id, html) { var e = document.getElementById(id); if (e) e.innerHTML = html; }
  function setText(id, t) { var e = document.getElementById(id); if (e) e.textContent = t; }

  function injectCSS() {
    if (document.getElementById("elCSS")) return;
    var s = document.createElement("style");
    s.id = "elCSS";
    s.textContent =
      ".el-card{background:#fff;border:1px solid #e8e6da;border-radius:22px;padding:20px 20px 12px;box-shadow:0 1px 2px rgba(20,32,28,.04),0 14px 40px rgba(20,32,28,.06);color:#1e241c}" +
      ".el-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:4px}" +
      ".el-head h2{margin:0;font:500 21px/1.1 'Fraunces',Georgia,serif;letter-spacing:-.01em}.el-head h2 b{font-weight:700}" +
      ".el-now{font-size:13px;color:#6c7365}.el-now b{color:#1e241c}" +
      ".el-prof{position:relative}.el-prof svg{display:block;width:100%;height:auto;overflow:visible}" +
      ".el-town{pointer-events:none}.el-townhit,.el-lmhit{fill:transparent;cursor:pointer}" +
      ".el-chip{position:absolute;transform:translate(-50%,-100%);background:rgba(30,36,28,.52);color:#fff;border-radius:10px;padding:6px 10px;font:12px/1.3 Inter,system-ui,sans-serif;white-space:nowrap;backdrop-filter:blur(3px);box-shadow:0 6px 18px rgba(0,0,0,.18);pointer-events:none}" +
      ".el-chip b{font-weight:700}.el-chip .k{color:#f0b48a}" +
      ".el-chip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:6px solid transparent;border-top-color:rgba(30,36,28,.52)}" +
      ".el-townpop{position:absolute;transform:translate(-50%,-100%);background:#1e241c;color:#fff;border-radius:9px;padding:6px 11px;font:600 12.5px/1.2 Inter,system-ui,sans-serif;white-space:nowrap;box-shadow:0 10px 26px rgba(0,0,0,.28);pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:4}" +
      ".el-townpop small{display:block;font-weight:500;font-size:10.5px;color:#9fe0ae;margin-top:1px}" +
      ".el-townpop.show{opacity:1}" +
      ".el-townpop::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#1e241c}" +
      ".el-legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;font:11.5px Inter,system-ui,sans-serif;color:#6c7365}" +
      ".el-legend span{display:inline-flex;align-items:center;gap:6px}" +
      ".el-band{cursor:pointer;transition:filter .1s ease}.el-band:hover{filter:brightness(1.07)}" +
      ".el-back{position:absolute;top:8px;left:8px;z-index:5;background:#fff;border:1px solid #e2e0d4;border-radius:8px;padding:4px 10px;font:600 11.5px Inter,system-ui,sans-serif;color:#3e6b46;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.08)}.el-back:hover{background:#f4f2ea}" +
      ".el-headright{display:flex;align-items:center;gap:10px}.el-expand{width:28px;height:28px;border:1px solid #e2e0d4;border-radius:8px;background:#fff;color:#3e6b46;font-size:14px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:none;box-shadow:0 1px 2px rgba(0,0,0,.06)}.el-expand:hover{background:#f4f2ea}" +
      ".el-card.el-full{position:fixed;inset:12px;z-index:60;margin:0;overflow:auto;box-shadow:0 24px 70px rgba(0,0,0,.32)}.el-card.el-full .el-prof{min-height:70vh;display:flex;flex-direction:column;justify-content:center}body.el-full-open{overflow:hidden}";
    document.head.appendChild(s);
  }

  function localMax(S, center, win) {
    var bk = center, bm = -1e9;
    for (var i = 0; i < S.length; i++) {
      if (Math.abs(S[i][0] - center) <= win && S[i][1] > bm) { bm = S[i][1]; bk = S[i][0]; }
    }
    return { km: bk, m: bm };
  }

  var CUR = null, TOTAL_KM = NOMINAL;

  function nearestWaypoint(km, F) {
    var best = "the trail", bd = 1e18;
    for (var i = 0; i < WAY.length; i++) {
      var d = Math.abs(WAY[i][0] * F - km);
      if (d < bd) { bd = d; best = WAY[i][1]; }
    }
    return best;
  }
  function nextWaypoint(km, F) {
    var best = "Northern Terminus", bd = 1e18;
    for (var i = 0; i < WAY.length; i++) {
      var d = WAY[i][0] * F - km;
      if (d > 0 && d < bd) { bd = d; best = WAY[i][1]; }
    }
    return best;
  }

  function walkedRangesFrom(track, pts) {
    if (!track || !track.features) return [];
    function nearKm(lat, lon) {
      var best = 0, bd = 1e18;
      for (var i = 0; i < pts.length; i++) {
        var d = haversine(lat, lon, pts[i].lat, pts[i].lon);
        if (d < bd) { bd = d; best = pts[i].km; }
      }
      return best;
    }
    var ranges = [];
    track.features.forEach(function (f) {
      if (!f.geometry || f.geometry.type !== "LineString") return;
      var c = f.geometry.coordinates, N = c.length;
      if (!N) return;
      var lo = 1e18, hi = -1e18;
      for (var k = 0; k < 12; k++) {
        var j = Math.round(k * (N - 1) / 11);
        var km = nearKm(c[j][1], c[j][0]);
        if (km < lo) lo = km; if (km > hi) hi = km;
      }
      ranges.push([lo, hi]);
    });
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1] + 20) last[1] = Math.max(last[1], r[1]);
      else merged.push([r[0], r[1]]);
    });
    return merged;
  }

  function activityStats(track) {
    var dist = 0, dates = {};
    if (track && track.features) {
      track.features.forEach(function (f) {
        var p = f.properties || {};
        if (typeof p.distance_m === "number") dist += p.distance_m;
        if (p.start_date) dates[String(p.start_date).slice(0, 10)] = 1;
      });
    }
    return { km: dist / 1000, days: Object.keys(dates).length };
  }

  function fillHero(reg, F) {
    if (!CUR) return;
    var scale = NOMINAL / TOTAL_KM;
    var pos = CUR.km * scale;
    var toGo = Math.max(0, NOMINAL - pos);
    var pct = Math.round((pos / NOMINAL) * 100);
    var near = nearestWaypoint(CUR.km, F);
    var nextWp = nextWaypoint(CUR.km, F);
    setHTML("heroTitle", STR.inThe + "<em>" + regName(reg) + "</em>" + STR.rightNow);
    setHTML("heroSub", "<b>" + distStr(pos) + "</b>" + STR.fromCampo + STR.nearestWp + "<b>" + nextWp +
      "</b> \u00B7 " + STR.stillPre + "<b>" + distStr(toGo) + "</b>" + STR.toEnd);
    setText("heroPct", pct);
    setText("pPct", pct + "%");
    setText("pRem", distStr(toGo));
    setText("pDone", distStr(pos));
    setText("pTotal", distStr(NOMINAL));
    var pf = document.getElementById("pFill"); if (pf) pf.style.width = pct + "%";
    setHTML("mPlace", regName(reg) + ", " + reg.st);
    setHTML("mMeta", STR.near + near + " \u00B7 " + DARR + " <b>" + distStr(pos) + "</b> \u00B7 " + EARR + " <b>" + elevStr(CUR.m) + "</b>");
  }

  function fillActivity(st) {
    if (st.days > 0) {
      setText("heroDays", st.days);
      setText("heroDay", STR.liveDay + " " + st.days);
      setText("heroAvg", nfmt(toDist(st.km / st.days), 1));
      setText("heroAvgU", DE ? "km" : "mi");
    }
  }

  function wireExpand() {
    var he = document.querySelector(".hero-map");
    var btn = document.getElementById("mapExpand");
    var back = document.getElementById("mapBackdrop");
    if (!he || !btn) return;
    function set(exp) {
      he.classList.toggle("expanded", exp);
      document.body.classList.toggle("map-expanded", exp);
      btn.innerHTML = exp ? "\u2715" : "\u2921";
      btn.setAttribute("aria-label", exp ? (DE ? "Karte schlie\u00dfen" : "Close map") : (DE ? "Karte vergr\u00f6\u00dfern" : "Enlarge map"));
      setTimeout(function () { window.dispatchEvent(new Event("resize")); }, 70);
    }
    btn.addEventListener("click", function () { set(!he.classList.contains("expanded")); });
    if (back) back.addEventListener("click", function () { set(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && he.classList.contains("expanded")) set(false); });
    btn.setAttribute("aria-label", DE ? "Karte vergr\u00f6\u00dfern" : "Enlarge map");
  }

  function render(container, data, latest, track) {
    var TOTAL = data.total_km;
    TOTAL_KM = TOTAL;
    var pts = data.points;
    var S = pts.map(function (p) { return [p.km, p.m]; });
    var F = TOTAL / NOMINAL;

    var cur = { km: 0, m: S[0][1] };
    if (latest && typeof latest.lat === "number") {
      var best = null, bd = 1e18;
      for (var i = 0; i < pts.length; i++) {
        var d = haversine(latest.lat, latest.lon, pts[i].lat, pts[i].lon);
        if (d < bd) { bd = d; best = pts[i]; }
      }
      if (best) cur = { km: best.km, m: best.m };
    }
    CUR = cur;
    var reg = REGIONS.find(function (r) { return cur.km >= r.a * F && cur.km < r.b * F; }) || REGIONS[REGIONS.length - 1];

    var walked = walkedRangesFrom(track, pts);
    if (!walked.length) walked = [[0, cur.km]];
    function inWalked(km) {
      for (var i = 0; i < walked.length; i++) { if (km >= walked[i][0] && km <= walked[i][1]) return true; }
      return false;
    }

    fillHero(reg, F);
    fillActivity(activityStats(track));

    if (!container) return;

    var W = 1000, H = 320, PADL = 46, PADR = 10, PADT = 56, baseY = 200, maxM = 4200;
    LIFT.forEach(function (p) {
      var target = p[0] * MI2KM * F, bi = 0, bd = 1e18;
      for (var i = 0; i < S.length; i++) { var d = Math.abs(S[i][0] - target); if (d < bd) { bd = d; bi = i; } }
      S[bi][1] = Math.max(S[bi][1], Math.min(p[1], maxM));
    });
    function y(m) { return PADT + (1 - m / maxM) * (baseY - PADT); }
    function lineM(km) { var bi = 0, bd = 1e18; for (var i = 0; i < S.length; i++) { var dd = Math.abs(S[i][0] - km); if (dd < bd) { bd = dd; bi = i; } } return S[bi][1]; }
    var GRID = DE ? [[1000, "1k"], [2000, "2k"], [3000, "3k"], [4000, "4k"]]
                  : [[914, "3k"], [1829, "6k"], [2743, "9k"], [3658, "12k"]];
    var bY = baseY + 8, bH = 22, lY = bY + bH + 18;

    var viewA = 0, viewB = TOTAL, isFull = false;

    function draw() {
      var full = viewA <= 0.5 && viewB >= TOTAL - 0.5;
      var fs = full ? 1 : 1.45;
      function x(km) { return PADL + ((km - viewA) / (viewB - viewA)) * (W - PADL - PADR); }
      var markX = x(cur.km), markY = y(Math.min(lineM(cur.km), maxM)), markerInView = cur.km >= viewA && cur.km <= viewB;

      var line = "M " + x(S[0][0]).toFixed(1) + " " + y(S[0][1]).toFixed(1);
      S.forEach(function (pt) { line += " L " + x(pt[0]).toFixed(1) + " " + y(pt[1]).toFixed(1); });
      var area = line + " L " + x(TOTAL) + " " + baseY + " L " + x(0) + " " + baseY + " Z";

      var walkedClip = "";
      walked.forEach(function (r) { walkedClip += '<rect x="' + x(r[0]) + '" y="0" width="' + (x(r[1]) - x(r[0])) + '" height="' + baseY + '"/>'; });

      var grid = '<line x1="' + PADL + '" y1="' + baseY + '" x2="' + (W - PADR) + '" y2="' + baseY + '" stroke="#00000010"/>';
      GRID.forEach(function (g) {
        var gy = y(g[0]);
        grid += '<line x1="' + PADL + '" y1="' + gy + '" x2="' + (W - PADR) + '" y2="' + gy + '" stroke="#00000010"/>' +
                '<text x="' + (PADL - 6) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="10" fill="#9aa08f" font-family="Inter">' + g[1] + '</text>';
      });

      var bands = "";
      REGIONS.forEach(function (r, ri) {
        var rx = x(r.a * F), rw = x(r.b * F) - x(r.a * F), ahead = r.a * F >= cur.km;
        bands += '<rect class="el-band" data-r="' + ri + '" x="' + (rx + 1) + '" y="' + bY + '" width="' + (rw - 2) + '" height="' + bH + '" rx="5" fill="' + r.c + '" opacity="' + (ahead ? 0.34 : 0.9) + '"/>';
        if (rw > 74) bands += '<text x="' + (rx + rw / 2) + '" y="' + (bY + bH / 2 + 3.5) + '" text-anchor="middle" font-size="' + (10 * fs).toFixed(1) + '" font-family="Inter" font-weight="600" fill="#2c3327" opacity="' + (ahead ? 0.5 : 0.92) + '" pointer-events="none">' + regName(r) + '</text>';
      });

      var z = TOTAL / Math.max(1, (viewB - viewA));
      function icoTop(t, ix, iy, col) {
        if (t === "pass") return '<circle cx="' + ix + '" cy="' + iy + '" r="2.8" fill="#fff" stroke="' + col + '" stroke-width="1.6"/>';
        return '<path d="M' + (ix - 3.6) + ' ' + (iy + 2.4) + ' L' + ix + ' ' + (iy - 4.8) + ' L' + (ix + 3.6) + ' ' + (iy + 2.4) + ' Z" fill="' + col + '"/>';
      }
      var lmData = [], top = [], bot = "", land = "";
      LM.forEach(function (m) {
        var mi = m[0], t = m[2], tier = m[3], kmRaw = mi * MI2KM * F, done = inWalked(kmRaw), col = TYPECOL[t] || "#6b7280";
        var isTop = (t === "peak" || t === "pass" || t === "side"), isLand = (t === "park" || t === "desert");
        var vis, showLabel;
        if (t === "term") { vis = true; showLabel = true; }
        else if (isLand) { vis = (tier <= 2) || (z >= 2.2); showLabel = vis; }
        else { vis = (tier <= 2) || (z >= 2.2); showLabel = (tier === 1) || (tier === 2 && z >= 2.2); }
        if (!vis) return;
        if (isTop) {
          var pk = localMax(S, kmRaw, 32), lx = x(pk.km), py = y(Math.min(pk.m, maxM));
          var di = lmData.push({ x: lx, name: m[1], type: t, mi: mi }) - 1;
          top.push({ lx: lx, py: py, t: t, name: m[1], col: col, label: showLabel, di: di });
        } else if (t === "term") {
          var lx = x(kmRaw), di = lmData.push({ x: lx, name: m[1], type: t, mi: mi }) - 1, pf = done ? 1 : 0.78, post = baseY - 15;
          bot += '<line x1="' + lx + '" y1="' + baseY + '" x2="' + lx + '" y2="' + post + '" stroke="' + col + '" stroke-width="1.4" opacity="' + pf + '"/>';
          bot += '<path d="M' + lx + ' ' + post + ' L' + (lx + 8) + ' ' + (post + 2.5) + ' L' + lx + ' ' + (post + 5) + ' Z" fill="' + col + '" opacity="' + pf + '"/>';
          var lft = lx < W / 2;
          bot += '<text x="' + (lft ? lx + 3 : lx - 3) + '" y="' + (baseY - 4) + '" text-anchor="' + (lft ? "start" : "end") + '" font-size="' + (9 * fs).toFixed(1) + '" font-weight="700" font-family="Inter" paint-order="stroke" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" fill="' + (done ? "#20301c" : "#6b6f60") + '">' + m[1] + '</text>';
          bot += '<rect class="el-lmhit" data-i="' + di + '" x="' + (lx - 6) + '" y="' + (post - 4) + '" width="12" height="' + (baseY - post + 8) + '"/>';
        } else if (isLand) {
          var lx = x(kmRaw), di = lmData.push({ x: lx, name: m[1], type: t, mi: mi }) - 1, op = done ? 1 : 0.5;
          land += '<line x1="' + lx + '" y1="' + (bY + bH + 2) + '" x2="' + lx + '" y2="' + (lY - 3) + '" stroke="' + col + '" stroke-width="1.2" ' + (t === "desert" ? 'stroke-dasharray="2 2"' : "") + ' opacity="' + (done ? 0.8 : 0.4) + '"/>';
          land += (t === "desert")
            ? '<rect x="' + (lx - 2) + '" y="' + (lY - 2) + '" width="4" height="4" fill="' + col + '" opacity="' + op + '" transform="rotate(45 ' + lx + ' ' + lY + ')"/>'
            : '<circle cx="' + lx + '" cy="' + lY + '" r="2.6" fill="' + col + '" opacity="' + op + '"/>';
          if (showLabel) {
            var edge = lx > W - 95;
            land += '<text x="' + (edge ? lx : (lx + 4)) + '" y="' + (edge ? (lY + 13) : (lY + 5)) + '" text-anchor="' + (edge ? "middle" : "start") + '"' + (edge ? "" : ' transform="rotate(26 ' + lx + ' ' + lY + ')"') + ' font-size="' + (9.5 * fs).toFixed(1) + '" font-weight="600" font-family="Inter" fill="' + (t === "desert" ? "#b5842e" : "#2f7a3e") + '" opacity="' + (done ? 1 : 0.72) + '">' + m[1] + '</text>';
          }
          land += '<rect class="el-lmhit" data-i="' + di + '" x="' + (lx - 6) + '" y="' + (bY + bH) + '" width="12" height="' + (lY + 6 - (bY + bH)) + '"/>';
        } else {
          var lx = x(kmRaw), di = lmData.push({ x: lx, name: m[1], type: t, mi: mi }) - 1, op = done ? 1 : (tier === 1 ? 0.9 : 0.55);
          bot += '<circle cx="' + lx + '" cy="' + baseY + '" r="' + (t === "water" ? 2.4 : 2.2) + '" fill="' + col + '" opacity="' + op + '"/>';
          if (showLabel) {
            var ty = baseY - 6;
            bot += '<text class="el-town" x="' + (lx + 3) + '" y="' + ty + '" transform="rotate(-90 ' + (lx + 3) + ' ' + ty + ')" text-anchor="start" font-size="' + ((tier === 1 ? 8.5 : 7.6) * fs).toFixed(1) + '" font-family="Inter" font-weight="' + (tier === 1 ? "700" : "500") + '" paint-order="stroke" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" fill="' + (done ? "#20301c" : "#7f8472") + '">' + m[1] + '</text>';
          }
          bot += '<rect class="el-lmhit" data-i="' + di + '" x="' + (lx - 6) + '" y="' + (baseY - 8) + '" width="12" height="46"/>';
        }
      });
      var labeled = top.filter(function (o) { return o.label; }).sort(function (a, b) { return a.lx - b.lx; });
      var levelEnds = [];
      labeled.forEach(function (o) {
        var w = o.name.length * (5.2 * fs) + 8, L = o.lx - w / 2, lev = 0;
        while (levelEnds[lev] != null && levelEnds[lev] > L - 4) lev++;
        levelEnds[lev] = o.lx + w / 2;
        o.ly = 47 - lev * 12;
      });
      var topSvg = "";
      top.forEach(function (o) {
        topSvg += icoTop(o.t, o.lx, o.py, o.col);
        var hitTop = o.py - 8;
        if (o.label) {
          topSvg += '<line x1="' + o.lx + '" y1="' + (o.py - 4) + '" x2="' + o.lx + '" y2="' + (o.ly + 2) + '" stroke="' + o.col + '" stroke-width="1" ' + (o.t === "side" ? 'stroke-dasharray="3 2"' : "") + ' opacity=".5"/>';
          topSvg += '<text x="' + o.lx + '" y="' + o.ly + '" text-anchor="middle" font-size="' + (9.5 * fs).toFixed(1) + '" font-weight="700" font-family="Inter" paint-order="stroke" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" fill="' + o.col + '">' + (o.t === "side" ? "\u25B2 " : "") + o.name + '</text>';
          hitTop = o.ly - 8;
        }
        topSvg += '<rect class="el-lmhit" data-i="' + o.di + '" x="' + (o.lx - 6) + '" y="' + hitTop + '" width="12" height="' + (baseY - hitTop) + '"/>';
      });
      var lm = land + bot + topSvg;

      var marker = markerInView
        ? ('<line x1="' + markX + '" y1="' + markY + '" x2="' + markX + '" y2="' + (bY + bH) + '" stroke="#cf7440" stroke-width="1.6" stroke-dasharray="4 3"/>' +
           '<circle cx="' + markX + '" cy="' + markY + '" r="10" fill="none" stroke="#cf7440" stroke-width="1.6" opacity=".4"/>' +
           '<circle cx="' + markX + '" cy="' + markY + '" r="6.5" fill="#cf7440"/><circle cx="' + markX + '" cy="' + markY + '" r="2.4" fill="#fff"/>')
        : "";

      var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="PCT elevation profile">' +
        '<defs><clipPath id="elWalked">' + walkedClip + '</clipPath>' +
        '<clipPath id="plotClip"><rect x="' + PADL + '" y="0" width="' + (W - PADL - PADR) + '" height="' + H + '"/></clipPath>' +
        '<linearGradient id="elG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fae62" stop-opacity=".9"/><stop offset="1" stop-color="#4fae62" stop-opacity=".35"/></linearGradient></defs>' +
        grid +
        '<g clip-path="url(#plotClip)">' +
        '<path d="' + area + '" fill="#9db8a4" opacity=".26"/>' +
        '<path d="' + area + '" clip-path="url(#elWalked)" fill="url(#elG)"/>' +
        '<path d="' + line + '" fill="none" stroke="#2f7a3e" stroke-width="1.4" opacity=".7"/>' +
        bands + lm + marker +
        '</g>' +
        '</svg>';

      container.innerHTML =
        '<div class="el-card"><div class="el-head"><h2>' + STR.climb + '</h2>' +
        '<div class="el-headright"><span class="el-now">' + STR.nowAt + EARR + ' <b>' + elevStr(cur.m) + '</b> \u00B7 ' + regName(reg) + '</span>' +
        '<button class="el-expand" type="button" aria-label="' + (DE ? "Vollbild" : "Fullscreen") + '">\u2921</button></div></div>' +
        '<div class="el-prof" id="elProf">' +
        (full ? '' : '<button class="el-back" type="button">\u2039 ' + (DE ? "\u00dcbersicht" : "Overview") + '</button>') +
        svg + '</div>' +
        '<div class="el-legend">' +
        '<span><svg width="12" height="12"><path d="M6 1 L11 11 L1 11 Z" fill="#b5651d"/></svg> ' + (DE ? "Gipfel" : "Peak") + '</span>' +
        '<span><svg width="12" height="12"><circle cx="6" cy="6" r="4" fill="none" stroke="#2c7a3d" stroke-width="1.6"/></svg> Pass</span>' +
        '<span><svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="#6b7280"/></svg> ' + (DE ? "Ort" : "Town") + '</span>' +
        '<span><svg width="12" height="12"><circle cx="6" cy="6" r="3" fill="#2f7fae"/></svg> ' + (DE ? "Wasser" : "Water") + '</span>' +
        '<span><svg width="12" height="12"><rect x="3" y="3" width="6" height="6" fill="#3e9a51" transform="rotate(45 6 6)"/></svg> Park</span>' +
        '<span>' + STR.legState + '</span>' +
        '<span>\u2921 ' + STR.zoomHint + '</span>' +
        '</div></div>';

      var prof = container.querySelector("#elProf");
      var elCard = container.querySelector(".el-card");
      var expBtn = elCard.querySelector(".el-expand");
      if (expBtn) {
        if (isFull) { elCard.classList.add("el-full"); document.body.classList.add("el-full-open"); expBtn.innerHTML = "\u2715"; }
        expBtn.addEventListener("click", function () {
          isFull = !isFull;
          elCard.classList.toggle("el-full", isFull);
          document.body.classList.toggle("el-full-open", isFull);
          expBtn.innerHTML = isFull ? "\u2715" : "\u2921";
          setTimeout(function () { if (prof._placeChip) prof._placeChip(); }, 80);
        });
      }
      if (markerInView) {
        var chip = document.createElement("div");
        chip.className = "el-chip";
        chip.innerHTML = DARR + ' <span class="k">' + distStr(cur.km * (NOMINAL / TOTAL)) + '</span> \u00B7 ' + EARR + ' <span class="k">' + elevStr(cur.m) + '</span>';
        prof.appendChild(chip);
        var placeChip = function () { var s2 = prof.querySelector("svg"); if (!s2) return; var r = s2.getBoundingClientRect(); chip.style.left = (markX * r.width / W) + "px"; chip.style.top = (markY * r.height / H - 26) + "px"; };
        placeChip();
        prof._placeChip = placeChip;
      } else { prof._placeChip = null; }

      var pop = document.createElement("div");
      pop.className = "el-townpop";
      prof.appendChild(pop);
      function svgRect() { var s2 = prof.querySelector("svg"); return s2 ? s2.getBoundingClientRect() : null; }
      function lmShow(d) {
        var r = svgRect(); if (!r) return;
        var tn = DE ? TYPEDE[d.type] : TYPEEN[d.type];
        pop.innerHTML = d.name + "<small>" + tn + " \u00B7 " + (DE ? "Meile " : "Mile ") + d.mi + " \u00B7 " + nfmt(d.mi * MI2KM, 0) + " km</small>";
        pop.style.left = (d.x * r.width / W) + "px";
        pop.style.top = ((baseY - 12) * r.height / H) + "px";
        pop.classList.add("show");
      }
      prof.addEventListener("mouseover", function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains("el-lmhit")) { var d = lmData[+t.getAttribute("data-i")]; if (d) lmShow(d); }
      });
      prof.addEventListener("mouseout", function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains("el-lmhit")) pop.classList.remove("show");
      });
      prof.addEventListener("click", function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains("el-lmhit")) {
          var d = lmData[+t.getAttribute("data-i")]; if (!d) return;
          lmShow(d); clearTimeout(prof._popT); prof._popT = setTimeout(function () { pop.classList.remove("show"); }, 2800);
        } else { pop.classList.remove("show"); }
      });
      [].slice.call(prof.querySelectorAll(".el-band")).forEach(function (b) {
        b.addEventListener("click", function () {
          var r = REGIONS[+b.getAttribute("data-r")];
          var ov = (r.b - r.a) * F * 0.05;
          viewA = Math.max(0, r.a * F - ov); viewB = Math.min(TOTAL, r.b * F + ov);
          draw();
        });
      });
      var back = prof.querySelector(".el-back");
      if (back) back.addEventListener("click", function () { viewA = 0; viewB = TOTAL; draw(); });
    }

    draw();
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isFull) {
        isFull = false;
        var c = container.querySelector(".el-card"); if (c) c.classList.remove("el-full");
        document.body.classList.remove("el-full-open");
        var b = container.querySelector(".el-expand"); if (b) b.innerHTML = "\u2921";
      }
    });
    window.addEventListener("resize", function () {
      var prof = container.querySelector("#elProf");
      if (prof && prof._placeChip) prof._placeChip();
    });
  }

  function init() {
    wireExpand();
    var container = document.getElementById("elevation");
    var hero = document.getElementById("heroTitle");
    if (!container && !hero) return;
    injectCSS();
    function J(u) { return fetch(BASE + u, { cache: "no-store" }).then(function (r) { return r.json(); }).catch(function () { return null; }); }
    Promise.all([J("data/pct_profile.json"), J("data/latest.json"), J("data/track.geojson")]).then(function (res) {
      if (!res[0]) throw new Error("no profile");
      render(container, res[0], res[1], res[2]);
    }).catch(function (e) {
      if (container) container.innerHTML = '<div class="el-card">Could not load elevation profile.</div>';
      console.error(e);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
