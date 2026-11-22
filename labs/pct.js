// PCT Tracker: shared core of all pages (data, landmarks, photos, maps, replay).
// The same pages run twice:
//   /pct-tracker/...       main site: real data only (data/), no demo or test walks
//   /pct-tracker/labs/...  test copy: ?data=demo (default) | test | live
(function () {
  "use strict";
  var BASE = "/pct-tracker/";
  var MAIN = !/\/labs(\/|$)/.test(location.pathname);
  var qs = new URLSearchParams(location.search);
  var SRC = MAIN ? "live" : (qs.get("data") || "demo");
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
  var LM = [[0,"Campo","term",1],[20,"Lake Morena","town",3],[42,"Mt. Laguna","town",2],[77,"Scissors Crossing","pass",3],[106,"Eagle Rock","spot",2],[109,"Warner Springs","town",3],[127,"Agua Caliente","park",3],[152,"Paradise Valley Café","town",3],[179,"Idyllwild","town",2],[187,"San Jacinto Peak","peak",2],[210,"San Gorgonio Pass","pass",2],[266,"Big Bear","town",2],[308,"Deep Creek Hot Springs","water",2],[342,"Cajon Pass","pass",2],[342.5,"Cajon Pass McDonald's","spot",3],[369,"Wrightwood","town",2],[379,"Mt. Baden-Powell","peak",1],[444,"Acton","town",3],[452,"Vasquez Rocks","park",3],[454,"Agua Dulce","town",2],[517,"Hikertown","town",2],[518,"Mojave Desert","desert",2],[566,"Tehachapi","town",2],[652,"Walker Pass","pass",2],[702,"Kennedy Meadows S","town",1],[750,"Cottonwood Pass","pass",3],[767,"Mt. Whitney","peak",1],[779,"Forester Pass","pass",1],[786,"Rae Lakes","water",3],[792,"Glen Pass","pass",2],[807,"Pinchot Pass","pass",3],[815,"Mather Pass","pass",2],[838,"Evolution Lake","water",3],[843,"Muir Pass","pass",2],[857,"Muir Trail Ranch","town",3],[878,"Vermilion Valley Resort","town",3],[906,"Reds Meadow","town",3],[910,"Mammoth Lakes","town",2],[915,"Thousand Island Lake","water",3],[942,"Tuolumne Meadows","town",1],[1017,"Sonora Pass","pass",2],[1032,"Ebbetts Pass","pass",3],[1077,"Carson Pass","pass",3],[1090,"Lake Tahoe","water",1],[1094,"South Lake Tahoe","town",2],[1153,"Donner Pass","pass",2],[1195,"Sierra Buttes","peak",3],[1250,"Bucks Summit","pass",3],[1287,"Belden","town",3],[1325,"Halfway Point","term",1],[1352,"Lassen Peak","peak",2],[1378,"Subway Cave","water",3],[1410,"Burney","town",3],[1418,"Burney Falls","water",2],[1500,"Mt. Shasta","peak",1],[1501,"Castle Crags","park",2],[1599,"Etna","town",3],[1656,"Seiad Valley","town",2],[1690,"Oregon Border","term",1],[1726,"Ashland","town",2],[1775,"Mt. McLoughlin","peak",3],[1820,"Crater Lake","water",1],[1880,"Diamond Peak","peak",3],[1905,"Shelter Cove","town",3],[1907,"Willamette Pass","pass",3],[1965,"Three Sisters","peak",2],[1990,"McKenzie Pass","pass",3],[1998,"Big Lake Youth Camp","town",3],[2001,"Santiam Pass","pass",3],[2005,"Three Fingered Jack","peak",3],[2030,"Mt. Jefferson","peak",2],[2045,"Olallie Lake","water",3],[2097,"Mt. Hood","peak",1],[2098,"Timberline Lodge","town",2],[2120,"Tunnel Falls","water",3],[2144,"Cascade Locks","town",1],[2147,"Washington Border","term",1],[2225,"Mt. Adams","peak",2],[2265,"Goat Rocks","peak",2],[2268,"Knife's Edge","spot",2],[2295,"White Pass","pass",3],[2320,"Mt. Rainier","peak",2],[2393,"Snoqualmie Pass","pass",2],[2400,"Kendall Katwalk","peak",3],[2461,"Stevens Pass","pass",2],[2462,"Leavenworth","town",3],[2530,"Glacier Peak","peak",2],[2572,"Stehekin","town",2],[2591,"Rainy Pass","pass",3],[2620,"Harts Pass","pass",3],[2650,"Northern Terminus","term",1]];
  // Real side trips: the trail from the landmark to the PCT (BRouter/OpenStreetMap) and its length in km.
  // Other summits nearby (Hood, Adams, Jefferson, ...) are only seen from the trail, no link line.
  var SIDE = {
    "Mt. Whitney": [12.2, [[36.5785,-118.2923],[36.5774,-118.2936],[36.5782,-118.296],[36.5771,-118.2971],[36.5766,-118.2968],[36.5764,-118.2953],[36.5756,-118.2937],[36.5738,-118.2918],[36.5728,-118.2915],[36.5709,-118.2924],[36.5676,-118.293],[36.566,-118.2924],[36.5655,-118.2928],[36.5648,-118.2924],[36.5634,-118.2926],[36.5625,-118.292],[36.5631,-118.2932],[36.562,-118.2925],[36.5606,-118.2931],[36.5615,-118.2933],[36.5622,-118.2941],[36.5602,-118.2941],[36.5618,-118.2952],[36.5599,-118.2949],[36.562,-118.2964],[36.5604,-118.2962],[36.5626,-118.2976],[36.5609,-118.2975],[36.5646,-118.299],[36.5641,-118.2993],[36.5643,-118.3],[36.5647,-118.3],[36.5647,-118.3007],[36.5657,-118.3013],[36.5661,-118.3026],[36.567,-118.3035],[36.5676,-118.3035],[36.5686,-118.3042],[36.569,-118.3054],[36.5689,-118.3067],[36.57,-118.3082],[36.5716,-118.3093],[36.5717,-118.3121],[36.5724,-118.3143],[36.5732,-118.3147],[36.5732,-118.3164],[36.5727,-118.3209],[36.5704,-118.3246],[36.5695,-118.3254],[36.569,-118.3269],[36.5683,-118.3273],[36.5685,-118.328],[36.5674,-118.331],[36.5676,-118.335],[36.5678,-118.3353],[36.5684,-118.335],[36.5694,-118.3366],[36.5691,-118.3382],[36.5689,-118.338],[36.5679,-118.3384],[36.5674,-118.3418],[36.5676,-118.3454],[36.5669,-118.3483],[36.5665,-118.3488],[36.5655,-118.3489],[36.5652,-118.3501],[36.5641,-118.3515],[36.5636,-118.3516],[36.5619,-118.3533],[36.5599,-118.3572],[36.5592,-118.3604],[36.5586,-118.361]]],
    "Sierra Buttes": [2.0, [[39.5936,-120.6471],[39.5938,-120.6479],[39.5947,-120.6488],[39.594,-120.6491],[39.5954,-120.6503],[39.5948,-120.6504],[39.5951,-120.6507],[39.5947,-120.6509],[39.595,-120.6535],[39.5954,-120.654],[39.5946,-120.6552],[39.5947,-120.656],[39.5938,-120.6578],[39.5908,-120.6595],[39.5894,-120.6595],[39.5896,-120.6604],[39.5891,-120.6618]]],
    "Tunnel Falls": [5.0, [[45.5849,-121.852],[45.5845,-121.8532],[45.5847,-121.8549],[45.5863,-121.8558],[45.588,-121.8578],[45.5889,-121.8591],[45.5893,-121.861],[45.5906,-121.8619],[45.5914,-121.8632],[45.5916,-121.8628],[45.5919,-121.8643],[45.5932,-121.8637],[45.5931,-121.8648],[45.5937,-121.8657],[45.5983,-121.8609],[45.5986,-121.8611],[45.6013,-121.8598],[45.601,-121.8595],[45.6012,-121.8592],[45.6028,-121.8586],[45.6042,-121.8554],[45.6052,-121.8548],[45.6062,-121.8549],[45.6064,-121.854],[45.6075,-121.8531],[45.6108,-121.8519],[45.6119,-121.85],[45.6133,-121.8485],[45.6138,-121.8431],[45.6137,-121.8417]]],
    "Mt. McLoughlin": [4.5, [[42.4445,-122.3157],[42.4437,-122.3124],[42.4419,-122.3085],[42.4416,-122.3067],[42.442,-122.3047],[42.4419,-122.3033],[42.4416,-122.3026],[42.4408,-122.3025],[42.4411,-122.3015],[42.4404,-122.3017],[42.4404,-122.2987],[42.4396,-122.2977],[42.4396,-122.2968],[42.4392,-122.2964],[42.4394,-122.2959],[42.4391,-122.2956],[42.4391,-122.2946],[42.4397,-122.2931],[42.4389,-122.2922],[42.438,-122.2896],[42.4384,-122.2874],[42.4382,-122.2848],[42.4375,-122.2833],[42.4378,-122.2822],[42.4377,-122.2803],[42.4369,-122.2785],[42.4359,-122.2779],[42.4341,-122.2753],[42.4342,-122.2724],[42.4333,-122.2708],[42.4338,-122.2699]]],
    "San Jacinto Peak": [3.7, [[33.8147,-116.6793],[33.8146,-116.6786],[33.8139,-116.6788],[33.8138,-116.6782],[33.8122,-116.679],[33.8131,-116.6815],[33.8123,-116.6813],[33.8128,-116.6819],[33.812,-116.6821],[33.8126,-116.6825],[33.8129,-116.6838],[33.8148,-116.6853],[33.8139,-116.6854],[33.8141,-116.6857],[33.8136,-116.6857],[33.8141,-116.686],[33.8134,-116.6872],[33.8116,-116.6879],[33.8106,-116.6894],[33.8079,-116.6901],[33.8067,-116.6911],[33.805,-116.6961],[33.8036,-116.6966],[33.8033,-116.6975],[33.8018,-116.6976],[33.8026,-116.6978],[33.8022,-116.698],[33.8025,-116.6987]]]
  };
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
    "Subway Cave": [40.6839, -121.4186], "Goat Rocks": [46.5150, -121.4547],
    "Thousand Island Lake": [37.7199, -119.1867],   // lake centre (OSM); the PCT passes about 1 km away
    "Cajon Pass McDonald's": [34.3090, -117.4704]   // the building on Wagon Train Rd
  };
  // Positions of passes and road crossings (summit coordinates), snapped to the nearest point of the
  // PCT line. Only the low crossings ("low") look for the lowest trail point nearby.
  var PASS = {
    "Scissors Crossing": [33.0998, -116.4700, "low"], "San Gorgonio Pass": [33.9245, -116.6947], "Cajon Pass": [34.3070, -117.4660, "low"],
    "Walker Pass": [35.6633, -118.0270], "Cottonwood Pass": [36.4530, -118.2140], "Forester Pass": [36.69436, -118.37336], "Glen Pass": [36.7888, -118.4126],
    "Pinchot Pass": [36.9358, -118.4056], "Mather Pass": [37.0263, -118.4628], "Muir Pass": [37.1120, -118.6703], "Sonora Pass": [38.3286, -119.6368],
    "Ebbetts Pass": [38.5446, -119.8131], "Carson Pass": [38.6947, -119.9890], "Donner Pass": [39.3170, -120.3290], "Bucks Summit": [39.8999, -121.1186],
    "Willamette Pass": [43.5966, -122.0373], "McKenzie Pass": [44.2603, -121.8100], "Santiam Pass": [44.4253, -121.8546], "White Pass": [46.6440, -121.3810],
    "Snoqualmie Pass": [47.4243, -121.4135], "Stevens Pass": [47.7463, -121.0857], "Rainy Pass": [48.5157, -120.7357], "Harts Pass": [48.7210, -120.6690],
    // other points right on the trail (checked against komoot / Wikipedia / the state lines)
    "Campo": [32.5897, -116.4670], "Lake Morena": [32.6858, -116.5193], "Agua Caliente": [33.2975, -116.6265], "Vasquez Rocks": [34.4878, -118.3197],
    "Halfway Point": [40.2099, -121.3559], "Castle Crags": [41.1478, -122.3197], "Oregon Border": [42.0001, -122.9112], "Olallie Lake": [44.8079, -121.7883],
    "Washington Border": [45.6623, -121.8986], "Kendall Katwalk": [47.4518, -121.3787], "Northern Terminus": [49.0003, -120.8021],
    "Eagle Rock": [33.2547, -116.6117], "Rae Lakes": [36.8135, -118.4057],
    "Evolution Lake": [37.1672, -118.6943],   // lake centre (OSM), the marker snaps to the shore trail
    "Knife's Edge": [46.5220, -121.4580]   // ridge between Old Snowy and Elk Pass, snapped onto the trail
  };
  // What a landmark actually is (instead of the broad group like "water / sight")
  var KIND = {
    "Deep Creek Hot Springs": ["Heiße Quellen", "Hot springs"], "Lake Tahoe": ["See", "Lake"],
    "Crater Lake": ["Kratersee", "Crater lake"], "Olallie Lake": ["See", "Lake"], "Rae Lakes": ["Seen", "Lakes"],
    "Evolution Lake": ["See", "Lake"], "Thousand Island Lake": ["See", "Lake"], "Burney Falls": ["Wasserfall", "Waterfall"],
    "Tunnel Falls": ["Wasserfall", "Waterfall"], "Subway Cave": ["Lavahöhle", "Lava tube cave"], "Agua Caliente": ["Bach", "Creek"],
    "Vasquez Rocks": ["Felsen", "Rock formation"], "Castle Crags": ["Felsnadeln", "Granite spires"], "Eagle Rock": ["Felsen", "Rock formation"],
    "Kendall Katwalk": ["Felspfad", "Cliff path"], "Campo": ["Southern Terminus", "Southern Terminus"], "Northern Terminus": ["Northern Terminus", "Northern Terminus"],
    "Oregon Border": ["Staatsgrenze Kalifornien / Oregon", "California / Oregon state line"], "Washington Border": ["Staatsgrenze Oregon / Washington", "Oregon / Washington state line"],
    "Halfway Point": ["Hälfte des Trails", "Halfway point of the trail"], "Knife's Edge": ["Grat", "Ridge"], "Goat Rocks": ["Gebirge", "Mountain range"], "Mojave Desert": ["Wüste", "Desert"]
  };

  // One line about the well-known spots (English place terms, as in the town notes)
  var NOTE = {
    "Eagle Rock": "Granite outcrop shaped like an eagle, classic photo stop",
    "Cajon Pass McDonald's": "The famous hiker stop right off the trail at I-15",
    "Rae Lakes": "One of the most beautiful lake basins of the Sierra",
    "Evolution Lake": "Evolution Basin, highlight of the John Muir Trail section",
    "Thousand Island Lake": "Below Banner Peak, a Sierra classic",
    "Knife's Edge": "Narrow ridge through the Goat Rocks, glaciers and Mt. Rainier views",
    "Kendall Katwalk": "Path blasted into a granite cliff face"
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
    desert: { de: "Wüste", en: "Desert", c: "#e0a06a", i: "☀" },
    spot: { de: "Trail-Klassiker", en: "Trail classic", c: "#ff8fc8", i: "✦" }
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
      }).filter(function (p) { return !MAIN || String(p.taken) >= START; })   // main site: only photos from the hike itself
        .sort(function (a, b) { return String(b.taken).localeCompare(String(a.taken)); })); };
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
      J(DIR + "latest.json").catch(function () { return null; }), J("data/pct_line.json"),
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
        // grid index (~1 km cells) so lookups only check nearby points instead of all ~126,000
        var grid = {}, G = 0.01;
        lc.forEach(function (c) { var k = Math.floor(c[0] / G) + "," + Math.floor(c[1] / G); (grid[k] = grid[k] || []).push(c); });
        function nearLine(lat, lon) {
          var gx = Math.floor(lon / G), gy = Math.floor(lat / G), b = null, bd = 1e18;
          for (var r = 0; r <= 45; r++) {   // grow the search ring until a point is found and the ring is farther than it
            for (var dx = -r; dx <= r; dx++) for (var dy = -r; dy <= r; dy++) {
              if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
              var cell = grid[(gx + dx) + "," + (gy + dy)]; if (!cell) continue;
              for (var q = 0; q < cell.length; q++) { var d = hav(lat, lon, cell[q][1], cell[q][0]); if (d < bd) { bd = d; b = cell[q]; } }
            }
            if (b && bd < (r - 1) * 0.8) break;   // a ring is at least ~0.8 km (r-1 cells) away
          }
          if (!b) for (var i = 0; i < lc.length; i++) { var d2 = hav(lat, lon, lc[i][1], lc[i][0]); if (d2 < bd) { bd = d2; b = lc[i]; } }
          return { ll: b, d: bd };
        }
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
        function onPct(c) {
          var gx = Math.floor(c[0] / G), gy = Math.floor(c[1] / G);
          for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
            var cell = grid[(gx + dx) + "," + (gy + dy)]; if (!cell) continue;
            for (var q = 0; q < cell.length; q++) if (hav(c[1], c[0], cell[q][1], cell[q][0]) < 0.25) return true;
          }
          return false;
        }
        // off-PCT pieces of the track (towns, side trails like Whitney, alternates), drawn in their own colour
        var offFeats = [];
        feats.forEach(function (f, fi) {
          var run = null;
          f.geometry.coordinates.forEach(function (c, ci) {
            if (!onPct(c)) { if (!run) { run = []; offFeats.push({ type: "Feature", properties: { dayIdx: f.properties.dayIdx, f: fi, k0: ci }, geometry: { type: "LineString", coordinates: run } }); } run.push(c); }
            else if (run) { run.push(c); run = null; }   // close the piece at the point back on the trail
          });
        });
        offFeats = offFeats.filter(function (f) { return f.geometry.coordinates.length > 1; });
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
          manual: manual, closures: (Array.isArray(r[6]) ? r[6] : []).filter(function (c) { return isFinite(c.from_km) && isFinite(c.to_km); }), dayNo: dayList.length, walkedKm: totalKm, offTrack: { type: "FeatureCollection", features: offFeats }, covered: covered, coveredKm: coveredKm, next: next, towns: towns, diary: diary, camps: camps
        };
      });
  }

  // ---- Resupply towns at their real position (not on the trail), with a short note ----
  // Notes are from planning, not checked on site: services change, always look at FarOut.
  var TOWNS = [
    ["Lake Morena", 32.6858, -116.5193, "Store · Restaurant · Camping · Showers · Cabins"],
    ["Mount Laguna", 32.8686, -116.4211, "Store · Lodge · Post Office · Restaurant"],
    ["Julian", 33.0786, -116.6020, "Grocery · Post Office · Motel · Restaurants · Mom's Pie (free pie for hikers)"],
    ["Warner Springs", 33.2828, -116.6339, "Community Center · Post Office · Camping"],
    ["Paradise Valley Café", 33.5691, -116.5914, "Café · Resupply box"],
    ["Idyllwild", 33.7400, -116.7189, "Grocery · Outfitter · Post Office · Motel · Restaurants · Camping · Dog mayor (Mayor Max III)"],
    ["Beaumont", 33.9295, -116.9773, "Grocery (Walmart) · Motel · Restaurants · In-N-Out"],
    ["Big Bear Lake", 34.2439, -116.9114, "Grocery · Outfitter · Post Office · Hostel · Hotel · Motel · Restaurants"],
    ["Wrightwood", 34.3608, -117.6334, "Grocery · Hardware · Post Office · Motel · Restaurants · Hiker register at Mountain Hardware"],
    ["Agua Dulce", 34.4964, -118.3256, "Grocery · Restaurants"],
    ["Hikertown", 34.7759, -118.6064, "Hostel · Small store"],
    ["Tehachapi", 35.1322, -118.4490, "Grocery · Post Office · Hotel · Motel · Restaurants · Laundry"],
    ["Lake Isabella", 35.6180, -118.4731, "Grocery · Post Office · Motel · Restaurants"],
    ["Ridgecrest", 35.6225, -117.6709, "Grocery (Walmart) · Post Office · Hotel · Motel · Restaurants · Laundry"],
    ["Kennedy Meadows", 36.0190, -118.1233, "Store · Resupply · Bear canister · Camping · Porch applause on arrival"],
    ["Lone Pine", 36.6060, -118.0629, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Restaurants"],
    ["Independence", 36.8027, -118.1999, "Motel · Restaurants · Deli · Hiker Shuttle · Resupply boxes"],
    ["Bishop", 37.3635, -118.3951, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Bakery"],
    ["Muir Trail Ranch", 37.2374, -118.8823, "Resupply buckets · Hot springs"],
    ["Vermilion Valley Resort", 37.3769, -119.0123, "Store · Restaurant · Cabins · Camping · Ferry"],
    ["Reds Meadow", 37.6174, -119.0726, "Store · Café · Cabins · Shuttle"],
    ["Mammoth Lakes", 37.6485, -118.9721, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Restaurants"],
    ["Tuolumne Meadows", 37.8735, -119.3590, "Store · Post Office · Camping"],
    ["Kennedy Meadows North", 38.3113, -119.7460, "Store · Restaurant · Cabins · Showers · Laundry · Resupply boxes"],
    ["South Lake Tahoe", 38.9399, -119.9772, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Restaurants"],
    ["Truckee", 39.3280, -120.1833, "Grocery · Outfitter · Post Office · Hotel · Motel · Restaurants"],
    ["Sierra City", 39.5657, -120.6324, "Store · Post Office · Motel · Restaurant"],
    ["Quincy", 39.9368, -120.9472, "Grocery · Post Office · Motel · Restaurants · Laundry"],
    ["Belden", 40.0058, -121.2483, "Restaurant · Lodge"],
    ["Chester", 40.3063, -121.2316, "Grocery · Post Office · Hotel · Motel · Restaurants"],
    ["Burney", 40.8824, -121.6608, "Grocery · Post Office · Motel · Restaurants"],
    ["Mount Shasta", 41.3099, -122.3106, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Restaurants"],
    ["Etna", 41.4568, -122.8948, "Grocery · Post Office · Motel · Hostel · Brewery"],
    ["Seiad Valley", 41.8418, -123.1964, "Store · Café · Post Office · Camping"],
    ["Ashland", 42.1946, -122.7095, "Grocery · Outfitter · Post Office · Hotel · Motel · Hostel · Restaurants"],
    ["Mazama Village", 42.8668, -122.1675, "Store · Resupply · Motel · Camping"],
    ["Shelter Cove", 43.5817, -122.0390, "Store · Resupply · Cabins · Showers"],
    ["Sisters", 44.2910, -121.5492, "Grocery · Outfitter · Post Office · Hotel · Motel · Restaurants"],
    ["Big Lake Youth Camp", 44.3717, -121.8652, "Resupply · Meals · Showers"],
    ["Cascade Locks", 45.6696, -121.8909, "Store · Post Office · Hotel · Motel · Restaurants · Camping · Bridge of the Gods"],
    ["Timberline Lodge", 45.3311, -121.7113, "Lodge · Breakfast buffet · Resupply"],
    ["Trout Lake", 45.9968, -121.5287, "Store · Post Office · Café · Huckleberry milkshake"],
    ["White Pass", 46.6378, -121.3913, "Store · Resupply · Motel"],
    ["Snoqualmie Pass", 47.4243, -121.4135, "Store · Lodge · Restaurant"],
    ["Skykomish", 47.7090, -121.3590, "Store · Lodge · Post Office"],
    ["Leavenworth", 47.5962, -120.6615, "Grocery · Outfitter · Post Office · Hotel · Motel · Restaurants"],
    ["Stehekin", 48.3093, -120.6545, "Post Office · Bakery · Lodge · Camping · Cinnamon rolls"],
    ["Mazama", 48.5926, -120.4039, "Store · Lodge · Resupply"]
  ];
  // Where you leave the trail for a town: [name of the access point, lat, lon], snapped to the trail.
  // Towns not listed use the nearest trail point.
  // where you leave the trail for each town, and the road/trail to it (exit → town), from OpenStreetMap routing
  var ACCESS = {
    "Kennedy Meadows North": ["Sonora Pass (Hwy 108)", 38.3295, -119.6362, [[38.3359,-119.6435],[38.3366,-119.6477],[38.3354,-119.6506],[38.3362,-119.6522],[38.3185,-119.6640],[38.3169,-119.6668],[38.3182,-119.6677],[38.3178,-119.6692],[38.3215,-119.6729],[38.3261,-119.6863],[38.3246,-119.6962],[38.3255,-119.6988],[38.3257,-119.7056],[38.3222,-119.7177],[38.3202,-119.7183],[38.3195,-119.7281],[38.3170,-119.7335],[38.3165,-119.7304],[38.3137,-119.7368],[38.3151,-119.7429],[38.3173,-119.7434],[38.3217,-119.7471],[38.3211,-119.7485],[38.3216,-119.7508],[38.3218,-119.7516],[38.3207,-119.7500],[38.3189,-119.7486],[38.3162,-119.7483],[38.3134,-119.7469]]],
    "Quincy": ["Bucks Lake Road", 39.9013, -121.1196, [[39.9030,-121.1176],[39.9035,-121.1153],[39.9072,-121.1168],[39.9108,-121.1115],[39.9124,-121.1114],[39.9147,-121.1089],[39.9151,-121.1106],[39.9172,-121.1115],[39.9178,-121.1016],[39.9192,-121.1000],[39.9193,-121.0962],[39.9243,-121.0848],[39.9222,-121.0804],[39.9224,-121.0760],[39.9273,-121.0637],[39.9309,-121.0611],[39.9349,-121.0609],[39.9441,-121.0552],[39.9445,-121.0506],[39.9472,-121.0464],[39.9468,-121.0433],[39.9494,-121.0400],[39.9489,-121.0339],[39.9494,-121.0293],[39.9481,-121.0269],[39.9464,-121.0192],[39.9420,-121.0164],[39.9424,-121.0131],[39.9445,-121.0110],[39.9439,-121.0076],[39.9456,-121.0047],[39.9468,-120.9961],[39.9450,-120.9892],[39.9443,-120.9806],[39.9415,-120.9733],[39.9384,-120.9586],[39.9368,-120.9551],[39.9367,-120.9492],[39.9376,-120.9495],[39.9376,-120.9464]]],
    "Lake Isabella": ["Walker Pass (Hwy 178)", 35.6645, -118.0311, [[35.6669,-118.0348],[35.6693,-118.0356],[35.6657,-118.0385],[35.6696,-118.0425],[35.6813,-118.0460],[35.6890,-118.0538],[35.6963,-118.0572],[35.7011,-118.0633],[35.7076,-118.0689],[35.7142,-118.0690],[35.7254,-118.0771],[35.7323,-118.0783],[35.7364,-118.0772],[35.7389,-118.0783],[35.7414,-118.0818],[35.7430,-118.0818],[35.7489,-118.0940],[35.7506,-118.1003],[35.7507,-118.1057],[35.7488,-118.1123],[35.7330,-118.1283],[35.7293,-118.1358],[35.7256,-118.1471],[35.7289,-118.1629],[35.7283,-118.1681],[35.7129,-118.1738],[35.7015,-118.1835],[35.6958,-118.1908],[35.6963,-118.1949],[35.6949,-118.2080],[35.6974,-118.2136],[35.6839,-118.2459],[35.6676,-118.2662],[35.6670,-118.2804],[35.6639,-118.3056],[35.6576,-118.3173],[35.6568,-118.3337],[35.6525,-118.3523],[35.6368,-118.3767],[35.6358,-118.3826],[35.6327,-118.3859],[35.6357,-118.3970],[35.6460,-118.4182],[35.6513,-118.4197],[35.6490,-118.4256],[35.6493,-118.4279],[35.6581,-118.4312],[35.6568,-118.4481],[35.6521,-118.4570],[35.6475,-118.4580],[35.6429,-118.4619],[35.6355,-118.4716],[35.6289,-118.4772],[35.6276,-118.4775],[35.6267,-118.4741],[35.6165,-118.4784],[35.6165,-118.4739]]],
    "Ridgecrest": ["Walker Pass (Hwy 178)", 35.663, -118.0254, [[35.6623,-118.0254],[35.6591,-118.0160],[35.6528,-118.0086],[35.6487,-117.9955],[35.6234,-117.9540],[35.6177,-117.9478],[35.6067,-117.9297],[35.6029,-117.9202],[35.6016,-117.9030],[35.6409,-117.8828],[35.6404,-117.8800],[35.6444,-117.8670],[35.6447,-117.8214],[35.6468,-117.8169],[35.6472,-117.8105],[35.6510,-117.8021],[35.6520,-117.7975],[35.6519,-117.7231],[35.6226,-117.7230],[35.6226,-117.6698]]],
    "Beaumont": ["I-10 (San Gorgonio Pass)", 33.9248, -116.6948, [[33.9209,-116.7101],[33.9247,-116.7369],[33.9214,-116.7472],[33.9187,-116.7712],[33.9186,-116.7969],[33.9192,-116.8014],[33.9219,-116.8081],[33.9299,-116.8192],[33.9312,-116.8239],[33.9311,-116.8319],[33.9248,-116.8576],[33.9242,-116.8637],[33.9239,-116.9025],[33.9258,-116.9210],[33.9268,-116.9467],[33.9273,-116.9684],[33.9265,-116.9772]]],
    "Sierra City": ["Hwy 49", 39.5769, -120.6118, [[39.5767,-120.6118],[39.5766,-120.6122],[39.5759,-120.6147],[39.5749,-120.6179],[39.5744,-120.6197],[39.5736,-120.6206],[39.5717,-120.6219],[39.5710,-120.6228],[39.5697,-120.6259],[39.5694,-120.6264],[39.5687,-120.6270],[39.5680,-120.6278],[39.5674,-120.6292],[39.5659,-120.6303],[39.5655,-120.6318],[39.5659,-120.6321]]],
    "Shelter Cove": ["Shelter Cove Trail", 43.592, -122.0528, [[43.5920,-122.0528],[43.5914,-122.0528],[43.5909,-122.0524],[43.5901,-122.0532],[43.5896,-122.0538],[43.5890,-122.0532],[43.5889,-122.0542],[43.5886,-122.0539],[43.5880,-122.0531],[43.5872,-122.0530],[43.5865,-122.0536],[43.5858,-122.0544],[43.5851,-122.0542],[43.5845,-122.0547],[43.5838,-122.0540],[43.5830,-122.0535],[43.5823,-122.0534],[43.5818,-122.0524],[43.5811,-122.0512],[43.5804,-122.0504],[43.5798,-122.0489],[43.5791,-122.0479],[43.5783,-122.0472],[43.5777,-122.0465],[43.5781,-122.0457],[43.5785,-122.0446],[43.5793,-122.0438],[43.5794,-122.0428],[43.5797,-122.0423],[43.5801,-122.0411],[43.5808,-122.0404],[43.5814,-122.0401]]],
    "Paradise Valley Café": ["Hwy 74", 33.5630, -116.5771, [[33.5643,-116.5808]]],
    "Julian": ["Scissors Crossing (Hwy 78)", 33.0975, -116.4728, [[33.0783,-116.5321],[33.0731,-116.5389],[33.0708,-116.5443],[33.0673,-116.5479],[33.0682,-116.5514],[33.0663,-116.5532],[33.0682,-116.5536],[33.0703,-116.5522],[33.0730,-116.5558],[33.0732,-116.5576],[33.0746,-116.5586],[33.0751,-116.5613],[33.0765,-116.5622],[33.0767,-116.5645],[33.0805,-116.5681],[33.0804,-116.5724],[33.0834,-116.5721],[33.0844,-116.5750],[33.0858,-116.5747],[33.0875,-116.5777],[33.0908,-116.5803],[33.0937,-116.5842],[33.0976,-116.5926],[33.0975,-116.5938],[33.0913,-116.5968],[33.0883,-116.5944],[33.0878,-116.5919],[33.0856,-116.5907],[33.0822,-116.5892],[33.0773,-116.5900],[33.0765,-116.5914],[33.0765,-116.5991]]],
    "Idyllwild": ["Saddle Junction / Devils Slide", 33.7741, -116.6731, [[33.7737,-116.6754],[33.7750,-116.6762],[33.7757,-116.6761],[33.7751,-116.6769],[33.7742,-116.6765],[33.7736,-116.6779],[33.7743,-116.6775],[33.7753,-116.6781],[33.7762,-116.6780],[33.7779,-116.6802],[33.7762,-116.6792],[33.7752,-116.6798],[33.7746,-116.6795],[33.7742,-116.6808],[33.7732,-116.6816],[33.7713,-116.6813],[33.7698,-116.6840],[33.7706,-116.6834],[33.7703,-116.6842],[33.7696,-116.6850],[33.7670,-116.6855],[33.7662,-116.6844],[33.7654,-116.6841],[33.7659,-116.6854],[33.7656,-116.6850],[33.7646,-116.6856],[33.7647,-116.6863],[33.7653,-116.6866],[33.7646,-116.6871],[33.7654,-116.6890],[33.7670,-116.6895],[33.7637,-116.6930],[33.7633,-116.6949],[33.7610,-116.6986],[33.7594,-116.6977],[33.7596,-116.6963],[33.7591,-116.6962],[33.7587,-116.6971],[33.7569,-116.6984],[33.7536,-116.6994],[33.7539,-116.7035],[33.7522,-116.7043],[33.7523,-116.7050],[33.7474,-116.7055],[33.7467,-116.7063],[33.7446,-116.7066],[33.7446,-116.7072],[33.7413,-116.7080],[33.7416,-116.7103],[33.7405,-116.7140],[33.7416,-116.7143],[33.7420,-116.7162]]],
    "Big Bear Lake": ["Hwy 18", 34.2908, -116.8049, [[34.2897,-116.8046],[34.2891,-116.8082],[34.2938,-116.8145],[34.2918,-116.8197],[34.2890,-116.8211],[34.2843,-116.8185],[34.2809,-116.8150],[34.2775,-116.8141],[34.2755,-116.8149],[34.2751,-116.8184],[34.2728,-116.8204],[34.2724,-116.8247],[34.2743,-116.8357],[34.2710,-116.8454],[34.2657,-116.8551],[34.2661,-116.8585],[34.2652,-116.8662],[34.2605,-116.8662],[34.2595,-116.8690],[34.2594,-116.8789],[34.2579,-116.8818],[34.2544,-116.8849],[34.2473,-116.8827],[34.2453,-116.8833],[34.2439,-116.8850]]],
    "Wrightwood": ["Acorn Trail", 34.3367, -117.6416, [[34.3374,-117.6423],[34.3387,-117.6419],[34.3383,-117.6423],[34.3391,-117.6427],[34.3399,-117.6415],[34.3405,-117.6423],[34.3414,-117.6414],[34.3411,-117.6407],[34.3418,-117.6410],[34.3415,-117.6405],[34.3442,-117.6410],[34.3461,-117.6404],[34.3484,-117.6388],[34.3501,-117.6383],[34.3512,-117.6386],[34.3519,-117.6376],[34.3518,-117.6356],[34.3532,-117.6334],[34.3537,-117.6344],[34.3541,-117.6332],[34.3538,-117.6353],[34.3542,-117.6361],[34.3593,-117.6333],[34.3596,-117.6340]]],
    "Tehachapi": ["Hwy 58", 35.0964, -118.3038, [[35.0986,-118.3075],[35.1025,-118.3108],[35.1100,-118.3230],[35.1106,-118.3519],[35.1148,-118.3669],[35.1154,-118.3785],[35.1228,-118.4064],[35.1248,-118.4119],[35.1275,-118.4126]]],
    "Lone Pine": ["Trail Pass / Horseshoe Meadows", 36.4297, -118.1656, [[36.4345,-118.1654],[36.4364,-118.1669],[36.4441,-118.1614],[36.4457,-118.1621],[36.4498,-118.1606],[36.4559,-118.1618],[36.4585,-118.1638],[36.4599,-118.1631],[36.4672,-118.1358],[36.4670,-118.1324],[36.4708,-118.1271],[36.4715,-118.1219],[36.4733,-118.1201],[36.4728,-118.1152],[36.4773,-118.1113],[36.4796,-118.1108],[36.4815,-118.1015],[36.4798,-118.1033],[36.4812,-118.0989],[36.4830,-118.0995],[36.4856,-118.1041],[36.4811,-118.0922],[36.4782,-118.0932],[36.4788,-118.0907],[36.4810,-118.0902],[36.4892,-118.1001],[36.4943,-118.1001],[36.4901,-118.0983],[36.4831,-118.0864],[36.4769,-118.0814],[36.4807,-118.0817],[36.4960,-118.0914],[36.5026,-118.0970],[36.5051,-118.1025],[36.5081,-118.0989],[36.5202,-118.1012],[36.5269,-118.1053],[36.5317,-118.1065],[36.5560,-118.1043],[36.5558,-118.0987],[36.5773,-118.0978],[36.5789,-118.0947],[36.5792,-118.0867],[36.5829,-118.0860],[36.5843,-118.0834],[36.5839,-118.0756],[36.5849,-118.0748],[36.5867,-118.0759],[36.5867,-118.0741],[36.5889,-118.0758],[36.5939,-118.0758],[36.5968,-118.0725],[36.6020,-118.0713],[36.6049,-118.0631]]],
    "Independence": ["Kearsarge Pass / Onion Valley", 36.7684, -118.4117, [[36.7694,-118.4101],[36.7706,-118.4094],[36.7710,-118.4079],[36.7725,-118.4074],[36.7731,-118.4064],[36.7733,-118.4030],[36.7721,-118.4011],[36.7712,-118.3971],[36.7718,-118.3945],[36.7708,-118.3909],[36.7709,-118.3889],[36.7716,-118.3873],[36.7719,-118.3836],[36.7725,-118.3848],[36.7730,-118.3815],[36.7735,-118.3821],[36.7739,-118.3816],[36.7733,-118.3777],[36.7738,-118.3780],[36.7730,-118.3766],[36.7741,-118.3750],[36.7748,-118.3711],[36.7735,-118.3730],[36.7737,-118.3701],[36.7731,-118.3684],[36.7729,-118.3691],[36.7719,-118.3672],[36.7710,-118.3673],[36.7715,-118.3668],[36.7705,-118.3667],[36.7709,-118.3663],[36.7706,-118.3662],[36.7720,-118.3659],[36.7726,-118.3641],[36.7718,-118.3642],[36.7718,-118.3628],[36.7712,-118.3621],[36.7709,-118.3599],[36.7707,-118.3605],[36.7704,-118.3602],[36.7702,-118.3613],[36.7691,-118.3591],[36.7706,-118.3569],[36.7700,-118.3548],[36.7711,-118.3530],[36.7704,-118.3531],[36.7711,-118.3519],[36.7706,-118.3518],[36.7715,-118.3510],[36.7708,-118.3500],[36.7701,-118.3503],[36.7703,-118.3497],[36.7698,-118.3497],[36.7703,-118.3493],[36.7699,-118.3492],[36.7705,-118.3490],[36.7701,-118.3487],[36.7715,-118.3482],[36.7711,-118.3484],[36.7717,-118.3458],[36.7724,-118.3450],[36.7717,-118.3450],[36.7719,-118.3447],[36.7724,-118.3444],[36.7735,-118.3451],[36.7740,-118.3434],[36.7756,-118.3434],[36.7735,-118.3410],[36.7731,-118.3397],[36.7726,-118.3409],[36.7730,-118.3380],[36.7752,-118.3351],[36.7767,-118.3280],[36.7766,-118.3221],[36.7761,-118.3224],[36.7754,-118.3268],[36.7749,-118.3268],[36.7752,-118.3221],[36.7747,-118.3236],[36.7743,-118.3234],[36.7749,-118.3208],[36.7754,-118.3198],[36.7766,-118.3191],[36.7798,-118.3194],[36.7809,-118.3187],[36.7808,-118.3183],[36.7800,-118.3184],[36.7766,-118.3172],[36.7765,-118.3167],[36.7796,-118.3167],[36.7845,-118.3156],[36.7848,-118.3149],[36.7839,-118.3152],[36.7819,-118.3144],[36.7837,-118.3143],[36.7861,-118.3126],[36.7876,-118.3109],[36.7899,-118.3112],[36.7914,-118.3079],[36.7931,-118.3076],[36.7971,-118.3086],[36.7928,-118.3055],[36.7925,-118.3020],[36.7911,-118.3007],[36.7906,-118.2968],[36.7891,-118.2951],[36.7893,-118.2934],[36.7886,-118.2937],[36.7885,-118.2974],[36.7879,-118.2978],[36.7871,-118.2976],[36.7840,-118.2960],[36.7806,-118.2897],[36.7805,-118.2888],[36.7818,-118.2877],[36.7820,-118.2865],[36.7765,-118.2786],[36.7763,-118.2709],[36.7746,-118.2614],[36.7762,-118.2579],[36.7765,-118.2544],[36.7785,-118.2444],[36.7806,-118.2378],[36.7818,-118.2300],[36.7834,-118.2270],[36.7873,-118.2221],[36.7893,-118.2140],[36.7901,-118.2124],[36.7919,-118.2105],[36.8001,-118.2052]]],
    "Vermilion Valley Resort": ["Lake Edison (Trail / Ferry)", 37.4126, -118.9247, [[37.4120,-118.9268],[37.4121,-118.9290],[37.4117,-118.9303],[37.4120,-118.9329],[37.4117,-118.9335],[37.4123,-118.9341],[37.4123,-118.9356],[37.4116,-118.9378],[37.4100,-118.9395],[37.4068,-118.9413],[37.4062,-118.9430],[37.4054,-118.9433],[37.4032,-118.9466],[37.4024,-118.9471],[37.4018,-118.9485],[37.4000,-118.9498],[37.3977,-118.9530],[37.3973,-118.9552],[37.3949,-118.9586],[37.3946,-118.9606],[37.3934,-118.9620],[37.3894,-118.9704],[37.3899,-118.9703],[37.3893,-118.9709],[37.3896,-118.9714],[37.3889,-118.9741],[37.3890,-118.9759],[37.3881,-118.9779],[37.3883,-118.9787],[37.3873,-118.9858],[37.3876,-118.9868],[37.3874,-118.9881],[37.3851,-118.9905],[37.3833,-118.9956],[37.3839,-118.9967],[37.3835,-118.9983],[37.3838,-119.0000],[37.3855,-119.0034],[37.3818,-119.0078],[37.3803,-119.0125],[37.3773,-119.0140],[37.3763,-119.0137],[37.3768,-119.0132]]],
    "Mammoth Lakes": ["Reds Meadow (Shuttle)", 37.6119, -119.0768, [[37.6133,-119.0757],[37.6198,-119.0773],[37.6208,-119.0766],[37.6277,-119.0769],[37.6286,-119.0772],[37.6295,-119.0790],[37.6316,-119.0801],[37.6319,-119.0814],[37.6351,-119.0818],[37.6357,-119.0815],[37.6374,-119.0772],[37.6387,-119.0771],[37.6385,-119.0756],[37.6396,-119.0744],[37.6416,-119.0738],[37.6442,-119.0748],[37.6457,-119.0743],[37.6473,-119.0729],[37.6513,-119.0742],[37.6539,-119.0737],[37.6556,-119.0725],[37.6589,-119.0714],[37.6619,-119.0720],[37.6634,-119.0731],[37.6657,-119.0739],[37.6700,-119.0733],[37.6721,-119.0748],[37.6739,-119.0774],[37.6759,-119.0778],[37.6774,-119.0772],[37.6802,-119.0806],[37.6811,-119.0806],[37.6809,-119.0794],[37.6783,-119.0775],[37.6733,-119.0698],[37.6718,-119.0694],[37.6695,-119.0698],[37.6658,-119.0670],[37.6645,-119.0652],[37.6614,-119.0639],[37.6594,-119.0649],[37.6578,-119.0650],[37.6533,-119.0621],[37.6532,-119.0599],[37.6540,-119.0579],[37.6534,-119.0568],[37.6532,-119.0546],[37.6519,-119.0533],[37.6504,-119.0486],[37.6513,-119.0465],[37.6503,-119.0392],[37.6510,-119.0372],[37.6539,-119.0339],[37.6547,-119.0305],[37.6542,-119.0288],[37.6522,-119.0270],[37.6500,-119.0222],[37.6496,-119.0161],[37.6486,-119.0130],[37.6490,-119.0118],[37.6507,-119.0100],[37.6513,-119.0055],[37.6503,-119.0034],[37.6515,-119.0007],[37.6501,-118.9994],[37.6499,-118.9980],[37.6507,-118.9971],[37.6526,-118.9965],[37.6537,-118.9947],[37.6543,-118.9949],[37.6547,-118.9963],[37.6556,-118.9961],[37.6562,-118.9930],[37.6540,-118.9909],[37.6539,-118.9866],[37.6534,-118.9854],[37.6505,-118.9846],[37.6493,-118.9833],[37.6484,-118.9832]]],
    "South Lake Tahoe": ["Echo Summit (Hwy 50)", 38.8145, -120.0352, [[38.8149,-120.0336],[38.8130,-120.0313],[38.8139,-120.0286],[38.8193,-120.0273],[38.8250,-120.0283],[38.8279,-120.0312],[38.8308,-120.0322],[38.8317,-120.0353],[38.8356,-120.0348],[38.8382,-120.0383],[38.8388,-120.0410],[38.8417,-120.0427],[38.8443,-120.0323],[38.8492,-120.0261],[38.8559,-120.0132],[38.8582,-120.0120],[38.8634,-120.0122],[38.8696,-120.0066],[38.8788,-120.0049],[38.8902,-119.9999],[38.8964,-119.9998],[38.9012,-119.9981],[38.9135,-120.0046],[38.9289,-119.9812],[38.9338,-119.9779]]],
    "Truckee": ["Donner Pass (I-80)", 39.3436, -120.3361, [[39.3431,-120.3257],[39.3416,-120.3205],[39.3424,-120.3152],[39.3420,-120.3126],[39.3379,-120.3070],[39.3295,-120.3018],[39.3280,-120.2984],[39.3285,-120.2955],[39.3318,-120.2898],[39.3276,-120.2740],[39.3320,-120.2570],[39.3303,-120.2440],[39.3265,-120.2376],[39.3251,-120.2319],[39.3232,-120.2150],[39.3231,-120.2028],[39.3256,-120.1937],[39.3252,-120.1914]]],
    "Chester": ["Hwy 36", 40.2614, -121.3389, [[40.2604,-121.3306],[40.2629,-121.3026],[40.2601,-121.2875],[40.2622,-121.2808],[40.2604,-121.2724],[40.2620,-121.2650],[40.2642,-121.2624],[40.2709,-121.2597]]],
    "Burney": ["Hwy 299", 40.9228, -121.4996, [[40.9217,-121.4987],[40.9196,-121.5009],[40.9187,-121.5087],[40.9238,-121.5229],[40.9242,-121.5286],[40.9226,-121.5329],[40.9203,-121.5348],[40.9183,-121.5419],[40.9205,-121.5647],[40.9317,-121.5664],[40.9350,-121.5690],[40.9431,-121.5690],[40.9620,-121.5790],[40.9309,-121.6150],[40.8845,-121.6580]]],
    "Mount Shasta": ["I-5 at Castle Crags", 41.1624, -122.2984, [[41.1738,-122.2970],[41.1870,-122.2870],[41.1952,-122.2838],[41.2014,-122.2779],[41.2133,-122.2741],[41.2234,-122.2756],[41.2305,-122.2751],[41.2345,-122.2712],[41.2405,-122.2622],[41.2458,-122.2585],[41.2481,-122.2581],[41.2510,-122.2600],[41.2589,-122.2726],[41.2704,-122.2796],[41.2770,-122.2882],[41.2868,-122.3066],[41.2917,-122.3073],[41.3016,-122.3063],[41.3063,-122.3109]]],
    "Etna": ["Etna Summit", 41.3958, -122.9958, [[41.4003,-122.9969],[41.4016,-122.9961],[41.3987,-122.9952],[41.4004,-122.9956],[41.4025,-122.9939],[41.4039,-122.9951],[41.4024,-122.9925],[41.3999,-122.9915],[41.4009,-122.9886],[41.4002,-122.9866],[41.4017,-122.9873],[41.4026,-122.9839],[41.4069,-122.9786],[41.4068,-122.9767],[41.4119,-122.9712],[41.4120,-122.9737],[41.4225,-122.9616],[41.4260,-122.9616],[41.4273,-122.9604],[41.4277,-122.9639],[41.4289,-122.9647],[41.4296,-122.9517],[41.4283,-122.9496],[41.4301,-122.9460],[41.4282,-122.9402],[41.4299,-122.9372],[41.4290,-122.9332],[41.4272,-122.9323],[41.4257,-122.9290],[41.4267,-122.9260],[41.4265,-122.9233],[41.4315,-122.9170],[41.4377,-122.9115],[41.4384,-122.9067],[41.4400,-122.9062],[41.4427,-122.9026],[41.4536,-122.8977],[41.4561,-122.8943]]],
    "Ashland": ["I-5 at Callahan's", 42.0693, -122.6040, [[42.0738,-122.6074],[42.0775,-122.6013],[42.0822,-122.5993],[42.0881,-122.6033],[42.0932,-122.6034],[42.0960,-122.6070],[42.1020,-122.6082],[42.1082,-122.6131],[42.1102,-122.6173],[42.1131,-122.6191],[42.1154,-122.6223],[42.1214,-122.6249],[42.1240,-122.6278],[42.1348,-122.6352],[42.1485,-122.6404],[42.1692,-122.6598],[42.1942,-122.7095],[42.1952,-122.7097]]],
    "Sisters": ["Santiam Pass (Hwy 20)", 44.4240, -121.8498, [[44.4254,-121.8416],[44.4228,-121.8326],[44.4254,-121.8203],[44.4230,-121.8044],[44.4239,-121.8009],[44.4234,-121.7966],[44.4186,-121.7812],[44.4184,-121.7658],[44.4280,-121.7308],[44.4284,-121.7216],[44.4298,-121.7153],[44.4294,-121.7132],[44.3954,-121.6779],[44.3817,-121.6578],[44.3798,-121.6537],[44.3731,-121.6287],[44.3705,-121.6237],[44.2924,-121.5567],[44.2914,-121.5544]]],
    "Trout Lake": ["Forest Road 23", 46.1619, -121.6314, [[46.1578,-121.6315],[46.1529,-121.6282],[46.1482,-121.6268],[46.1446,-121.6270],[46.1363,-121.6310],[46.1329,-121.6312],[46.1284,-121.6280],[46.1240,-121.6266],[46.1160,-121.6166],[46.1072,-121.6142],[46.1044,-121.6112],[46.0988,-121.6088],[46.0972,-121.6086],[46.0959,-121.6100],[46.0905,-121.6035],[46.0885,-121.6033],[46.0842,-121.5999],[46.0819,-121.5961],[46.0812,-121.5916],[46.0700,-121.5763],[46.0654,-121.5721],[46.0562,-121.5672],[46.0531,-121.5633],[46.0497,-121.5553],[46.0454,-121.5569],[46.0380,-121.5466],[46.0303,-121.5428],[46.0274,-121.5391],[46.0238,-121.5374],[46.0197,-121.5321],[46.0187,-121.5292],[46.0006,-121.5288],[45.9961,-121.5257]]],
    "Skykomish": ["Stevens Pass (US-2)", 47.7461, -121.0884, [[47.7450,-121.0920],[47.7474,-121.0974],[47.7480,-121.1015],[47.7471,-121.1181],[47.7463,-121.1211],[47.7387,-121.1271],[47.7309,-121.1355],[47.7240,-121.1379],[47.7207,-121.1361],[47.7198,-121.1241],[47.7187,-121.1225],[47.7173,-121.1229],[47.7166,-121.1247],[47.7167,-121.1322],[47.7144,-121.1400],[47.7109,-121.1584],[47.7110,-121.1622],[47.7152,-121.1776],[47.7158,-121.1856],[47.7149,-121.1993],[47.7171,-121.2150],[47.7181,-121.2359],[47.7167,-121.2430],[47.7147,-121.2682],[47.7170,-121.2755],[47.7172,-121.2794],[47.7128,-121.2902],[47.7112,-121.3045],[47.7123,-121.3162],[47.7120,-121.3264],[47.7145,-121.3456],[47.7119,-121.3539],[47.7115,-121.3612],[47.7088,-121.3608]]],
    "Leavenworth": ["Stevens Pass (US-2)", 47.7462, -121.0885, [[47.7511,-121.0802],[47.7562,-121.0759],[47.7601,-121.0753],[47.7685,-121.0777],[47.7727,-121.0739],[47.7803,-121.0610],[47.7817,-121.0547],[47.7809,-121.0487],[47.7815,-121.0443],[47.7846,-121.0354],[47.7833,-121.0280],[47.7769,-121.0212],[47.7745,-121.0145],[47.7726,-121.0034],[47.7693,-120.9984],[47.7670,-120.9884],[47.7678,-120.9856],[47.7708,-120.9821],[47.7716,-120.9738],[47.7746,-120.9650],[47.7745,-120.9598],[47.7759,-120.9553],[47.7763,-120.9497],[47.7818,-120.9403],[47.7814,-120.9357],[47.7836,-120.9270],[47.7797,-120.9121],[47.7828,-120.9031],[47.7830,-120.8952],[47.7875,-120.8908],[47.7876,-120.8835],[47.7896,-120.8797],[47.7913,-120.8725],[47.7904,-120.8647],[47.7879,-120.8582],[47.7869,-120.8504],[47.7712,-120.8093],[47.7644,-120.7890],[47.7643,-120.7846],[47.7673,-120.7731],[47.7632,-120.7455],[47.7616,-120.7432],[47.7527,-120.7376],[47.7303,-120.7392],[47.7253,-120.7366],[47.7215,-120.7370],[47.7120,-120.7415],[47.6977,-120.7458],[47.6958,-120.7447],[47.6907,-120.7381],[47.6850,-120.7354],[47.6762,-120.7341],[47.6650,-120.7362],[47.6597,-120.7294],[47.6554,-120.7297],[47.6511,-120.7243],[47.6455,-120.7235],[47.6404,-120.7200],[47.6388,-120.7207],[47.6365,-120.7246],[47.6307,-120.7278],[47.6183,-120.7237],[47.6141,-120.7194],[47.5954,-120.7130],[47.5887,-120.7087],[47.5856,-120.7053],[47.5842,-120.7017],[47.5841,-120.6968],[47.5878,-120.6845],[47.5873,-120.6786],[47.5899,-120.6722]]],
    "Stehekin": ["High Bridge (Bus)", 48.3801, -120.8346, [[48.3788,-120.8245],[48.3803,-120.8078],[48.3773,-120.7917],[48.3762,-120.7894],[48.3755,-120.7821],[48.3765,-120.7780],[48.3717,-120.7633],[48.3719,-120.7552],[48.3617,-120.7363],[48.3606,-120.7317],[48.3570,-120.7251],[48.3568,-120.7224],[48.3549,-120.7214],[48.3499,-120.7139],[48.3470,-120.7117],[48.3443,-120.7067],[48.3410,-120.7038],[48.3404,-120.7016],[48.3409,-120.6986],[48.3398,-120.6959],[48.3355,-120.6928],[48.3316,-120.6922],[48.3272,-120.6871],[48.3233,-120.6847],[48.3233,-120.6736],[48.3225,-120.6718],[48.3136,-120.6581],[48.3090,-120.6574]]],
    "Mazama": ["Rainy Pass (Hwy 20)", 48.5147, -120.7344, [[48.5109,-120.7336],[48.5050,-120.7293],[48.5043,-120.7151],[48.5013,-120.7055],[48.5057,-120.6972],[48.5115,-120.6906],[48.5168,-120.6826],[48.5245,-120.6629],[48.5237,-120.6545],[48.5209,-120.6498],[48.5147,-120.6449],[48.5145,-120.6427],[48.5158,-120.6425],[48.5178,-120.6458],[48.5215,-120.6465],[48.5295,-120.6429],[48.5451,-120.6322],[48.5489,-120.6309],[48.5596,-120.6326],[48.5638,-120.6364],[48.5721,-120.6314],[48.5763,-120.6305],[48.5785,-120.6291],[48.5846,-120.6196],[48.5896,-120.6154],[48.5914,-120.6093],[48.5971,-120.5997],[48.5987,-120.5896],[48.5984,-120.5809],[48.6012,-120.5584],[48.5987,-120.5388],[48.5994,-120.5333],[48.5970,-120.5239],[48.5910,-120.5116],[48.5883,-120.5008],[48.5889,-120.4945],[48.5868,-120.4845],[48.5872,-120.4767],[48.5893,-120.4724],[48.5910,-120.4641],[48.5959,-120.4560],[48.5978,-120.4445],[48.5979,-120.4360],[48.5968,-120.4314],[48.5881,-120.4144],[48.5872,-120.4094]]],
    "Bishop": ["Kearsarge Pass / Onion Valley", 36.7684, -118.4117, [[36.7694,-118.4101],[36.7706,-118.4094],[36.7710,-118.4079],[36.7725,-118.4074],[36.7731,-118.4064],[36.7733,-118.4030],[36.7721,-118.4011],[36.7712,-118.3971],[36.7718,-118.3945],[36.7708,-118.3909],[36.7709,-118.3889],[36.7716,-118.3873],[36.7719,-118.3836],[36.7725,-118.3848],[36.7730,-118.3815],[36.7735,-118.3821],[36.7739,-118.3816],[36.7733,-118.3777],[36.7738,-118.3780],[36.7730,-118.3766],[36.7741,-118.3750],[36.7748,-118.3711],[36.7735,-118.3730],[36.7737,-118.3701],[36.7731,-118.3684],[36.7729,-118.3691],[36.7719,-118.3672],[36.7710,-118.3673],[36.7715,-118.3668],[36.7705,-118.3667],[36.7709,-118.3663],[36.7706,-118.3662],[36.7720,-118.3659],[36.7726,-118.3641],[36.7718,-118.3642],[36.7718,-118.3628],[36.7712,-118.3621],[36.7709,-118.3599],[36.7707,-118.3605],[36.7704,-118.3602],[36.7702,-118.3613],[36.7691,-118.3591],[36.7706,-118.3569],[36.7700,-118.3548],[36.7711,-118.3530],[36.7704,-118.3531],[36.7711,-118.3519],[36.7706,-118.3518],[36.7715,-118.3510],[36.7708,-118.3500],[36.7701,-118.3503],[36.7703,-118.3497],[36.7698,-118.3497],[36.7703,-118.3493],[36.7699,-118.3492],[36.7705,-118.3490],[36.7701,-118.3487],[36.7715,-118.3482],[36.7711,-118.3484],[36.7717,-118.3458],[36.7724,-118.3450],[36.7717,-118.3450],[36.7719,-118.3447],[36.7724,-118.3444],[36.7735,-118.3451],[36.7740,-118.3434],[36.7756,-118.3434],[36.7735,-118.3410],[36.7731,-118.3397],[36.7726,-118.3409],[36.7730,-118.3380],[36.7752,-118.3351],[36.7767,-118.3280],[36.7766,-118.3221],[36.7761,-118.3224],[36.7754,-118.3268],[36.7749,-118.3268],[36.7752,-118.3221],[36.7747,-118.3236],[36.7743,-118.3234],[36.7749,-118.3208],[36.7754,-118.3198],[36.7766,-118.3191],[36.7798,-118.3194],[36.7809,-118.3187],[36.7808,-118.3183],[36.7800,-118.3184],[36.7766,-118.3172],[36.7765,-118.3167],[36.7796,-118.3167],[36.7845,-118.3156],[36.7848,-118.3149],[36.7839,-118.3152],[36.7819,-118.3144],[36.7837,-118.3143],[36.7861,-118.3126],[36.7876,-118.3109],[36.7899,-118.3112],[36.7914,-118.3079],[36.7931,-118.3076],[36.7971,-118.3086],[36.7928,-118.3055],[36.7925,-118.3020],[36.7911,-118.3007],[36.7906,-118.2968],[36.7891,-118.2951],[36.7893,-118.2934],[36.7886,-118.2937],[36.7885,-118.2974],[36.7879,-118.2978],[36.7871,-118.2976],[36.7840,-118.2960],[36.7806,-118.2897],[36.7805,-118.2888],[36.7818,-118.2877],[36.7820,-118.2865],[36.7765,-118.2786],[36.7763,-118.2709],[36.7746,-118.2614],[36.7762,-118.2579],[36.7765,-118.2544],[36.7785,-118.2444],[36.7806,-118.2378],[36.7818,-118.2300],[36.7834,-118.2270],[36.7873,-118.2221],[36.7893,-118.2140],[36.7901,-118.2124],[36.7919,-118.2105],[36.8001,-118.2052],[36.8027,-118.1998],[36.8141,-118.2073],[36.8265,-118.2207],[36.8355,-118.2283],[36.8903,-118.2421],[36.9594,-118.2403],[36.9887,-118.2343],[37.0243,-118.2312],[37.0544,-118.2342],[37.0595,-118.2379],[37.1092,-118.2546],[37.1560,-118.2891],[37.1734,-118.2903],[37.2298,-118.3460],[37.2681,-118.3662],[37.2811,-118.3728],[37.2948,-118.3755],[37.3328,-118.3949]]]
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
      var path = [[t[2], t[1]]].concat(acc && acc[3] ? acc[3].slice().reverse().map(function (v) { return [v[1], v[0]]; }) : []).concat(acc && acc[3] ? [[acc[2], acc[1]]] : s ? [[s.lon, s.lat]] : []);   // routed lines end on their exit (a PCT line point); the coarse profile snap would add a stray diagonal
      var off = 0; for (var q = 1; q < path.length; q++) off += hav(path[q - 1][1], path[q - 1][0], path[q][1], path[q][0]);
      var direct = off < 1.5, via = !!(acc && acc[3]);
      if (s && !direct) lines.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: path } });
      var el = document.createElement("div"); el.className = "tw";
      el.innerHTML = (ICON[t[0]] ? iconHtml(t[0]) : '<i style="background:' + (theme.dot || "#f5b301") + '"></i>') + '<span style="color:' + (theme.text || "#fff") + ";text-shadow:" + (theme.halo || "0 1px 3px #000,0 0 8px rgba(0,0,0,.7)") + '">' + t[0] + "</span>";
      var tkm = nw("Trail-" + DU() + "\u00a0" + nf(distV(s ? s.km : 0)));
      var pop = new maplibregl.Popup({ offset: 12, className: "tw-pop", maxWidth: "300px" }).setHTML(
        "<h4>" + t[0] + '</h4><div class="m">' + (direct ? nw(T("Direkt am Trail", "Right on the trail")) : acc ? nw(T("Zugang: ", "Access: ")) + " " + acc[0] : nw(T("Abseits vom Trail", "Off the trail"))) + "</div>" +
        nwList(t[3]) );
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-6, 0] }).setLngLat([t[2], t[1]]).setPopup(pop).addTo(map);
    });
    // link line only for real side trips with a trail (SIDE, e.g. Whitney); summits like Hood or Shasta
    // are just seen from the trail, a line to them would suggest a hike that isn't one
    D.landmarks.forEach(function (l) { var sp = SIDE[l.name]; if (l.side && sp) lines.features.push({ type: "Feature", geometry: { type: "LineString", coordinates: sp[1].map(function (q) { return [q[1], q[0]]; }) } }); });
    map.addSource("tw-links", { type: "geojson", data: lines });
    map.addLayer({ id: "tw-links", type: "line", source: "tw-links", minzoom: 7, paint: { "line-color": theme.link || "#f5b301", "line-width": 1.3, "line-opacity": .8, "line-dasharray": [2, 2] } });
  }

  // Small picture symbols for places with something special (instead of the plain dot / square)
  var ICON = {};   // picture symbols removed: normal markers everywhere (tents and beds stay)
  function iconHtml(name) { return '<b style="font-size:24px;line-height:1;font-style:normal;filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">' + ICON[name] + "</b>"; }

  // ---- Trail landmarks (peaks, passes, water, parks, termini), clickable ----
  function addLandmarks(map, D, theme) {
    theme = theme || {};
    D.landmarks.filter(function (l) { return l.type !== "town"; }).forEach(function (l) {
      var Ty = TYPE[l.type] || TYPE.town, el = document.createElement("div");
      el.className = "lm " + l.type + " t" + l.tier; el.style.cursor = "pointer"; el.style.pointerEvents = "auto";
      el.innerHTML = "<i style='background:" + (theme.dot ? theme.dot(l) : Ty.c) + "'></i><span>" + l.name + "</span>";
      if (l.type === "peak" && !theme.dot) el.firstChild.style.background = "transparent";
      if (ICON[l.name]) { el.firstChild.outerHTML = iconHtml(l.name); if (/McDonald/.test(l.name)) el.querySelector("span").textContent = "McDonald's"; }
      var pop = new maplibregl.Popup({ offset: 10, className: "tw-pop", maxWidth: "300px" }).setHTML(
        "<h4>" + l.name + '</h4><div class="m">' + (KIND[l.name] ? KIND[l.name][LANG === "en" ? 1 : 0] : Ty[LANG]) + (ELEV[l.name] ? " · " + elev(l.m) : "") + "</div>" +   // only measured heights, never a guess from the profile
        (l.side ? '<div class="n" style="margin-top:4px">' + (!SIDE[l.name] ? T("Vom Trail aus zu sehen, ca. ", "Seen from the trail, approx. ") + dist(l.off, l.off < 10 ? 1 : 0) + T(" entfernt", " away") : T("Abstecher, ca. ", "Side trip, approx. ") + dist(SIDE[l.name][0], 1) + T(" Weg vom Trail", " of trail from the PCT")) + "</div>" : "") +
        (NOTE[l.name] ? '<div class="n" style="margin-top:4px">' + NOTE[l.name] + "</div>" : ""));
      new maplibregl.Marker({ element: el, anchor: "left", offset: [-5, 0] }).setLngLat([l.lon, l.lat]).setPopup(pop).addTo(map);
    });
  }

  var BED = '<svg viewBox="0 0 24 16" width="18" height="12" style="vertical-align:-1px"><path d="M2 2v12M2 10h20v4M22 10V7a2 2 0 0 0-2-2H11v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="7" r="2" fill="currentColor"/></svg>';

  // ---- "Where am I" button next to + / - ----
  function addLocate(map, getLngLat, pos, pill) {   // pill: big white button with text (Reportage)
    // keep the attribution folded to its (i) button, MapLibre opens it on wide-enough maps
    function fold() { document.querySelectorAll(".maplibregl-compact-show").forEach(function (e) { e.classList.remove("maplibregl-compact-show"); }); }
    fold(); map.once("idle", fold);
    function C() {}
    C.prototype.onAdd = function () {
      var w = document.createElement("div"); w.className = "maplibregl-ctrl maplibregl-ctrl-group" + (pill ? " loc-pill" : "");
      var b = document.createElement("button"); b.type = "button"; b.title = T("Zu meiner Position", "Where am I");
      // looks like the position marker on the map (red dot, white rim, pulsing ring)
      if (!document.getElementById("loc-css")) { var cs = document.createElement("style"); cs.id = "loc-css";
        cs.textContent = ".loc-dot{position:relative;display:block;width:12px;height:12px;margin:auto;border-radius:50%;background:#e0452f;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.35)}" +
          ".loc-dot::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:2px solid #e0452f;animation:locPulse 2s ease-out infinite}" +
          "@keyframes locPulse{from{transform:scale(1);opacity:.9}to{transform:scale(2.4);opacity:0}}";
        document.head.appendChild(cs); }
      b.innerHTML = '<span class="loc-dot"></span>' + (pill ? "<span>" + T("Wo bin ich?", "Where am I?") + "</span>" : "");
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

  // ---- Track pieces off the PCT (town, side trail, alternate): dashed in their own colour ----
  function addOffTrail(map, D, color) {
    map.addSource("trk-off", { type: "geojson", data: D.offTrack || { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "trk-off", type: "line", source: "trk-off", paint: { "line-color": color || "#8fd3ff", "line-width": 4.2 }, layout: { "line-cap": "round", "line-join": "round" } });   // wide enough to cover the day colour below
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
    zero: T("Zero: ein Tag ohne Trail-Kilometer.", "Zero: a day with no trail miles."),
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
  var DESIGNS = [["", "Reportage", "Story"], ["tagebuch/", "Tagebuch", "Journal"], ["fotos/", "Fotos", "Photos"], ["statistik/", "Statistik", "Stats"], ["ausruestung/", "Ausrüstung", "Gear"]];
  function switcher(active) {
    var css = document.createElement("style");
    css.textContent = ".lab{position:fixed;left:50%;transform:translateX(-50%);top:12px;z-index:9000;display:flex;align-items:center;gap:2px;background:rgba(14,18,22,.88);color:#fff;border-radius:22px;padding:4px;font:500 13px/1 system-ui,-apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);backdrop-filter:blur(6px)}" +
      ".lab a{color:#fff;text-decoration:none;padding:7px 13px;border-radius:16px;white-space:nowrap}.lab a:hover{background:rgba(255,255,255,.12)}.lab a.on{background:#e0452f}" +
      ".lab .lg{border:1px solid rgba(255,255,255,.35);font-weight:700;padding:6px 10px}.lab select{background:transparent;color:#ffd2c4;border:0;font:600 12px system-ui;margin:0 6px;cursor:pointer}.lab select option{color:#000}" +
      ".lab .tag{font:700 10px system-ui;letter-spacing:.08em;color:#ffd166;padding:0 8px}" +
      "@media(max-width:700px){.lab{top:auto;bottom:10px;max-width:calc(100vw - 16px);overflow-x:auto;font-size:12px;scrollbar-width:none}.lab::-webkit-scrollbar{display:none}.lab a{padding:7px 7px;font-size:11.5px}.lab .lg{padding:5px 7px}.lab select,.lab .tag{display:none}}";
    document.head.appendChild(css);
    var q = !MAIN && SRC !== "demo" ? "?data=" + SRC : "", root = BASE + (MAIN ? "" : "labs/");
    var el = document.createElement("div"); el.className = "lab";
    el.innerHTML = DESIGNS.map(function (d, i) { return '<a href="' + root + d[0] + q + '" class="' + (i === active ? "on" : "") + '">' + (EN ? d[2] : d[1]) + "</a>"; }).join("") +
      (MAIN ? "" : '<span class="tag">LABS</span><select title="' + T("Datenquelle", "Data source") + '"><option value="demo">' + T("Demo-Daten", "Demo data") + '</option><option value="test">' + T("Meine Testrunden", "My test hikes") + '</option><option value="live">Live</option></select>') +
      '<a href="#" class="lg">' + (EN ? "DE" : "EN") + "</a>";
    var sel = el.querySelector("select");
    if (sel) { sel.value = SRC; sel.onchange = function () { var u = new URL(location.href); u.searchParams.set("data", sel.value); location.href = u; }; }
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
    var SPEEDS = [1, 2, 4, 10], ZOOM = [12, 10.6, 9.2, 7.8], DAY_MS = 6000, NIGHT_MS = 1600;  // 1x: a day in ~6 s, then a short night at the tent
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
    // the off-PCT pieces only as far as the replay has got (a side trail appears while you walk it)
    function offUpTo(p) {
      var s = seq[p.i], out = [];
      (D.offTrack ? D.offTrack.features : []).forEach(function (g) {
        var pr = g.properties;
        if (pr.f < s.f) out.push(g);
        else if (pr.f === s.f && pr.k0 <= s.k) {
          var n = s.k - pr.k0 + 1, cs = g.geometry.coordinates;
          if (n >= cs.length) out.push(g);
          else out.push({ type: "Feature", properties: pr, geometry: { type: "LineString", coordinates: cs.slice(0, n).concat([p.c]) } });
        }
      });
      return { type: "FeatureCollection", features: out };
    }
    function show(km, follow, force) {
      if (!N) return; cur = Math.max(0, Math.min(END, km)); var p = pointAt(cur), s = seq[p.i], now = performance.now();
      if (force || now - lastDraw > 140 || cur >= END) { var src = o.map.getSource(o.source || "trk"); if (src) src.setData(cur >= END ? D.track : trackUpTo(p));
        var os = o.map.getSource("trk-off"); if (os) os.setData(cur >= END ? D.offTrack : offUpTo(p)); lastDraw = now; }
      if (o.marker) o.marker.setLngLat(cur >= END && D.latest && D.latest.manual ? [D.latest.lon, D.latest.lat] : p.c);
      if (o.ui.slider) o.ui.slider.value = Math.round(cur / (END || 1) * 1000);
      // clock in the local time where the walk happened (Pacific on the PCT, Berlin for test walks)
      if (o.ui.clock) o.ui.clock.textContent = dfmt(p.t, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: p.c[0] < -30 ? "America/Los_Angeles" : "Europe/Berlin" }) + T(" Uhr", "");
      var f = D.track.features[s.f], day = f.properties.day, dn = D.days.findIndex(function (d) { return d.date === day; });
      var atEnd = dayEnds.findIndex(function (k) { return Math.abs(k - cur) < 1e-6; });
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

  window.PCTLab = { load: load, photos: photos, TYPE: TYPE, nf: nf, hav: hav, atKm: atKm, src: SRC,
    switcher: switcher, lightbox: lightbox, MAIN: MAIN, J: J, replay: replay, addTowns: addTowns, addCamps: addCamps, dayColor: dayColor, trailPoint: trailPoint, fitDay: fitDay, addManual: addManual, addClosures: addClosures, addOffTrail: addOffTrail, justPaused: justPaused, closureBands: closureBands, declutter: declutter, TERMS: TERMS, placePhotos: placePhotos, addLocate: addLocate, BED: BED, scrubProfile: scrubProfile, BASE: BASE, START: START,
    EN: EN, LANG: LANG, LOC: LOC, T: T, dist: dist, distV: distV, DU: DU, elev: elev, elevV: elevV, EU: EU, dfmt: dfmt, reg: reg, regS: regS, addLandmarks: addLandmarks };
})();
