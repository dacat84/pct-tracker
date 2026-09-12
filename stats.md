---
layout: default
title: "Stats"
nav: stats
permalink: /stats.html
---

<style>
.dash{max-width:840px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
.dash-hero{background:#fff;border:1px solid #e8e6da;border-radius:22px;padding:24px 24px 20px;box-shadow:0 1px 2px rgba(20,32,28,.04),0 14px 40px rgba(20,32,28,.06)}
.dash-hero .lbl{font:700 12px Inter,system-ui,sans-serif;color:#8a9082;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.dash-hero .big{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
.dash-hero .big .p{font:800 42px/1 'Fraunces',Georgia,serif;color:#1e241c;letter-spacing:-.02em}
.dash-hero .big .s{font:700 19px Inter,system-ui,sans-serif;color:#6c7365}
.dash-hero .ptrack{height:9px;border-radius:999px;background:#eceadd;overflow:hidden;margin-top:18px}
.dash-hero .pfill{height:100%;background:linear-gradient(90deg,#4fae62,#2c7a3d)}
.dash-hero .pmeta{display:flex;justify-content:space-between;margin-top:9px;font:600 12.5px Inter,system-ui,sans-serif;color:#6c7365}
.dash-hero .pmeta .accent{color:#2c7a3d;font-weight:700}
.dash-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
@media(max-width:640px){.dash-grid{grid-template-columns:repeat(2,1fr)}}
.tile{background:#fff;border:1px solid #e8e6da;border-radius:18px;padding:16px 16px 15px;box-shadow:0 1px 2px rgba(20,32,28,.04),0 10px 30px rgba(20,32,28,.05)}
.tile .lbl{font:600 11.5px Inter,system-ui,sans-serif;color:#8a9082;letter-spacing:.02em;margin-bottom:9px;text-transform:uppercase}
.tile .v{font:800 23px/1.05 'Fraunces',Georgia,serif;color:#1e241c;letter-spacing:-.01em}
.tile .sub{margin-top:5px;font:600 12.5px Inter,system-ui,sans-serif;color:#7f8472}
.tile.accent .v{color:#2c7a3d}
.two{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:520px){.two{grid-template-columns:1fr}}
.dash-sec{background:#fff;border:1px solid #e8e6da;border-radius:20px;padding:18px 22px;box-shadow:0 1px 2px rgba(20,32,28,.04),0 12px 34px rgba(20,32,28,.05)}
.dash-sec h3{margin:0 0 12px;font:600 16px 'Fraunces',Georgia,serif;color:#1e241c}
.drow{display:flex;justify-content:space-between;gap:12px;font:500 13.5px Inter,system-ui,sans-serif;color:#6c7365;padding:6px 0;border-top:1px solid #f0eee3}
.drow:first-of-type{border-top:0}
.drow b{color:#1e241c;font-weight:700}
.bars{display:flex;gap:8px;align-items:flex-end;height:104px;margin-top:4px}
.bars .bar{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}
.bars .bk{font:700 10.5px Inter,system-ui,sans-serif;color:#7f8472;white-space:nowrap}
.bars .bcol{width:100%;flex:1;display:flex;align-items:flex-end}
.bars .bi{width:100%;border-radius:5px 5px 2px 2px;background:#c3d3c4;min-height:5px}
.bars .bi.last{background:linear-gradient(180deg,#4fae62,#2c7a3d)}
.bars .bd{font:700 10.5px Inter,system-ui,sans-serif;color:#9aa08f}
.dash-cap{text-align:center;font:600 12px Inter,system-ui,sans-serif;color:#9aa08f;margin-top:2px}
</style>

<div class="dash" id="dash">
  <div class="tile" style="text-align:center;padding:28px" data-en="Loading…" data-de="Lädt…">Loading…</div>
</div>

<script>
(function () {
  var BASE = "/pct-tracker/";
  var LANG = localStorage.getItem("pctLang");
  if (LANG !== "de" && LANG !== "en") LANG = ((navigator.language || "en").slice(0, 2) === "de") ? "de" : "en";
  var DE = LANG === "de", LOC = DE ? "de-DE" : "en-US";
  var NOMINAL_KM = 4265, NOMINAL_MI = 2650;
  function T(de, en) { return DE ? de : en; }
  function n(x, d) { d = d || 0; return (x == null || isNaN(x)) ? "—" : Number(x).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function dur(s) { s = Math.round(s || 0); var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? (h + " h " + m + " min") : (m + " min"); }
  function fmtDate(ts) { return ts == null ? "—" : new Date(ts).toLocaleDateString(LOC, { day: "numeric", month: "short", year: "numeric" }); }
  function J(u) { return fetch(BASE + u, { cache: "no-store" }).then(function (r) { return r.json(); }).catch(function () { return null; }); }

  Promise.all([J("data/track.geojson"), J("data/latest.json")]).then(function (res) { render(res[0]); })
    .catch(function (e) { console.error(e); });

  function tile(lbl, v, sub, accent) {
    return '<div class="tile' + (accent ? ' accent' : '') + '"><div class="lbl">' + lbl + '</div><div class="v">' + v + '</div>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
  }
  function dayTile(lbl, it) {
    if (!it) return '<div class="tile"><div class="lbl">' + lbl + '</div><div class="v">—</div></div>';
    var dl = it.date ? new Date(it.date).toLocaleDateString(LOC, { day: "numeric", month: "short" }) : "";
    return '<div class="tile"><div class="lbl">' + lbl + '</div><div class="v">' + n(it.distM / 1000, 1) + ' km</div><div class="sub">' + n(it.distM / 1609.344, 1) + ' mi' + (it.timeS != null ? ' · ' + dur(it.timeS) : '') + (dl ? ' · ' + dl : '') + '</div></div>';
  }

  function render(track) {
    var feats = (track && track.features) ? track.features : [];
    var distM = 0, timeS = 0, elevM = 0, firstTs = null, lastTs = null, longest = null, shortest = null;
    var days = {}, byDay = {};
    feats.forEach(function (f) {
      var p = f.properties || {}, d = +p.distance_m, t = +p.moving_time_s, e = +p.elevation_gain_m, sd = p.start_date ? String(p.start_date) : "";
      if (isFinite(d)) distM += d; if (isFinite(t)) timeS += t; if (isFinite(e)) elevM += e;
      if (sd) {
        var k = sd.slice(0, 10); days[k] = 1;
        var ts = Date.parse(sd); if (isFinite(ts)) { if (firstTs == null || ts < firstTs) firstTs = ts; if (lastTs == null || ts > lastTs) lastTs = ts; }
        if (!byDay[k]) byDay[k] = { distM: 0, timeS: 0, elevM: 0 };
        byDay[k].distM += isFinite(d) ? d : 0; byDay[k].timeS += isFinite(t) ? t : 0; byDay[k].elevM += isFinite(e) ? e : 0;
      }
      if (isFinite(d) && d > 0) { var it = { distM: d, timeS: isFinite(t) ? t : null, date: sd }; if (!longest || d > longest.distM) longest = it; if (!shortest || d < shortest.distM) shortest = it; }
    });
    var activeDays = Object.keys(days).length;
    var restDays = (firstTs != null && lastTs != null) ? Math.max(0, Math.floor((lastTs - firstTs) / 86400000) + 1 - activeDays) : 0;
    var totalKm = distM / 1000, totalMi = distM / 1609.344, hours = timeS / 3600;
    var pct = totalKm / NOMINAL_KM * 100, remKm = Math.max(0, NOMINAL_KM - totalKm), remMi = Math.max(0, NOMINAL_MI - totalMi);
    var elevFt = elevM * 3.28084;
    var sorted = Object.keys(byDay).sort();
    var lastKey = sorted[sorted.length - 1];
    var last7 = sorted.slice(-7).map(function (k) { return { date: k, distM: byDay[k].distM }; });

    var hero = '<div class="dash-hero">'
      + '<div class="lbl">' + T("Getrackt", "Tracked") + '</div>'
      + '<div class="big"><span class="p">' + n(totalKm, 1) + ' km</span><span class="s">' + n(totalMi, 1) + ' mi</span></div>'
      + '<div class="ptrack"><div class="pfill" style="width:' + Math.max(0.6, Math.min(100, pct)).toFixed(2) + '%"></div></div>'
      + '<div class="pmeta"><span class="accent">' + n(pct, 1) + '% ' + T("des PCT", "of the PCT") + '</span><span>' + T("noch ", "") + n(remKm, 0) + ' km' + T("", " to go") + '</span></div>'
      + '</div>';

    var grid = '<div class="dash-grid">'
      + tile(T("Höhenmeter", "Elevation gain"), (elevM > 0 ? n(elevM, 0) + " m" : "—"), (elevM > 0 ? n(elevFt, 0) + " ft" : ""), false)
      + tile(T("Gesamtzeit", "Total time"), dur(timeS), (feats.length ? feats.length + " " + T("Aktivitäten", "activities") : ""), false)
      + tile(T("Ø pro Aktivität", "Avg / activity"), (feats.length ? n(totalKm / feats.length, 1) + " km" : "—"), (feats.length ? n(totalMi / feats.length, 1) + " mi" : ""), false)
      + tile(T("Ø Tempo", "Avg pace"), (hours > 0 ? n(totalKm / hours, 1) + " km/h" : "—"), (hours > 0 ? n(totalMi / hours, 1) + " mph" : ""), false)
      + tile(T("Tage unterwegs", "Days out"), activeDays, T("aktive Tage", "active days"), true)
      + tile(T("Zero-Tage", "Zero days"), restDays, T("Ruhetage", "rest days"), true)
      + '</div>';

    var two = '<div class="two">' + dayTile(T("Längster Tag", "Longest day"), longest) + dayTile(T("Kürzester Tag", "Shortest day"), shortest) + '</div>';

    var recent = "";
    if (last7.length > 1) {
      var maxD = Math.max.apply(null, last7.map(function (x) { return x.distM; })) || 1;
      var bars = last7.map(function (d) {
        var h = Math.max(8, d.distM / maxD * 100), isLast = d.date === lastKey;
        var dl = new Date(d.date + "T12:00:00").toLocaleDateString(LOC, { weekday: "short" });
        return '<div class="bar"><div class="bk">' + n(d.distM / 1000, 0) + '</div><div class="bcol"><div class="bi' + (isLast ? ' last' : '') + '" style="height:' + h.toFixed(0) + '%"></div></div><div class="bd">' + dl + '</div></div>';
      }).join("");
      recent = '<div class="dash-sec"><h3>' + T("Letzte Tage", "Recent days") + '</h3><div class="bars">' + bars + '</div></div>';
    }

    var timeline = '<div class="dash-sec"><h3>' + T("Zeitachse", "Timeline") + '</h3>'
      + '<div class="drow"><span>' + T("Erste Aktivität", "First activity") + '</span><b>' + fmtDate(firstTs) + '</b></div>'
      + '<div class="drow"><span>' + T("Letzte Aktivität", "Last activity") + '</span><b>' + fmtDate(lastTs) + '</b></div>'
      + '<div class="drow"><span>' + T("Tage", "Days") + '</span><b>' + activeDays + ' ' + T("aktiv", "active") + ' · ' + restDays + ' ' + T("Zero", "zero") + '</b></div>'
      + '</div>';

    document.getElementById("dash").innerHTML = hero + grid + two + recent + timeline;
  }
})();
</script>
