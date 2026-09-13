---
layout: default
title: Gear
nav: gear
permalink: /gear/
---
<div class="card">
  <div class="card-title" style="font-size:24px;margin-bottom:6px" data-en="Gear" data-de="Ausrüstung">Gear</div>
  <div class="card-sub" data-en="What I carry: an ultralight kit for three seasons on the PCT." data-de="Was ich mittrage: ein ultraleichtes Setup für drei Jahreszeiten auf dem PCT.">What I carry: an ultralight kit for three seasons on the PCT.</div>

  <div class="gg">
    <div class="gg-base">
      <div class="gg-k" data-en="Base weight" data-de="Base Weight">Base weight</div>
      <div class="gg-v">3761&nbsp;<span>g</span></div>
      <div class="gg-note" data-en="≈ 3.76 kg · everything in the pack, without food, water & worn clothing" data-de="≈ 3,76 kg · alles im Rucksack, ohne Essen, Wasser & getragene Kleidung">≈ 3.76 kg · everything in the pack, without food, water &amp; worn clothing</div>
    </div>
    <div class="gg-pills">
      <div class="gg-pill"><div class="k" data-en="Shelter" data-de="Nachtlager">Shelter</div><div class="v">335&nbsp;g</div><div class="s">Tarp + Bivy</div></div>
      <div class="gg-pill"><div class="k" data-en="Sleep system" data-de="Schlafsystem">Sleep system</div><div class="v">1006&nbsp;g</div><div class="s">Quilt 20°F + Pad</div></div>
      <div class="gg-pill"><div class="k" data-en="Pack" data-de="Rucksack">Pack</div><div class="v">485&nbsp;g</div><div class="s" data-en="Cutaway 30L + fanny pack" data-de="Cutaway 30L + Gürteltasche">Cutaway 30L + fanny pack</div></div>
    </div>
  </div>
</div>

<div class="card lp-card">
  <div class="lp-shell">
    <div class="lp-frame">
      <script src="https://lighterpack.com/e/bv8lr0"></script>
      <div id="bv8lr0"></div>
    </div>
  </div>
</div>

<script>
  (function () {
    let tries = 0;
    const timer = setInterval(() => {
      const iframe = document.querySelector('#bv8lr0 iframe');
      tries++;
      if (iframe) {
        iframe.setAttribute('title', 'Lighterpack gear list');
        iframe.style.background = '#ffffff';
        iframe.style.border = '0';
        clearInterval(timer);
      }
      if (tries > 80) clearInterval(timer);
    }, 100);
  })();
</script>
<style>
  .gg{ display:grid; grid-template-columns:1fr 1.3fr; gap:16px; margin-top:16px; }
  @media (max-width:640px){ .gg{ grid-template-columns:1fr; } }
  .gg-base{ background:linear-gradient(180deg,#fff,#fbf7f0); border:1px solid var(--line); border-radius:14px; padding:16px 18px; display:flex; flex-direction:column; justify-content:center; }
  .gg-base .gg-k{ font-size:12px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
  .gg-base .gg-v{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:40px; line-height:1.05; color:#cf7440; margin:4px 0 6px; }
  .gg-base .gg-v span{ font-size:18px; color:var(--muted); font-family:Inter,sans-serif; font-weight:600; }
  .gg-base .gg-note{ font-size:12.5px; color:var(--muted); line-height:1.5; }
  .gg-pills{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
  @media (max-width:640px){ .gg-pills{ grid-template-columns:repeat(3,1fr); } }
  @media (max-width:420px){ .gg-pills{ grid-template-columns:1fr; } }
  .gg-pill{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:13px 14px; box-shadow:var(--shadow); }
  .gg-pill .k{ font-size:11.5px; font-weight:700; letter-spacing:.03em; text-transform:uppercase; color:var(--muted); }
  .gg-pill .v{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:22px; color:var(--text); margin:3px 0 2px; }
  .gg-pill .s{ font-size:12px; color:var(--muted); }
  .lp-shell{ max-width:980px; margin:0 auto; padding:0; background:transparent; border-radius:16px; }
  .lp-frame{ background:#fff; border-radius:14px; padding:0; overflow:hidden; }
  #bv8lr0 iframe{ width:100% !important; height:72vh !important; max-height:900px !important; border-radius:12px !important; display:block; }
  @media (max-width:520px){ #bv8lr0 iframe{ height:78vh !important; } .lp-shell{ padding:10px; } .lp-frame{ padding:10px; } }
</style>
