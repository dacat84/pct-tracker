---
layout: default
title: "Photos"
nav: photos
---

<div class="card">
  <div class="card-title" data-en="Photos" data-de="Fotos">Photos</div>
  <div class="card-sub" data-en="Photos from the trail, newest first." data-de="Bilder von unterwegs, neueste zuerst.">Photos from the trail, newest first.</div>

  <div id="photoGrid" class="photo-grid" aria-live="polite"></div>
  <div id="photoError" class="muted small" style="display:none; margin-top:10px;">
    Could not load photos right now.
  </div>
</div>

<style>
  .photo-grid{
    display:grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-flow: dense;
    gap: 12px;
    margin-top: 14px;
  }
  @media (max-width: 720px){ .photo-grid{ grid-template-columns: repeat(2, 1fr); } }
  .photo-item{
    position:relative;
    aspect-ratio: 1 / 1;
    border-radius: 14px;
    overflow: hidden;
    border: 1px solid var(--line);
    background: #f0f2ec;
    display:block;
    box-shadow: var(--shadow);
  }
  .photo-item img{ width:100%; height:100%; object-fit: cover; display:block; transition: transform .35s ease; }
  .photo-item:hover img{ transform: scale(1.04); }
  .photo-item.feat{ grid-column: span 2; grid-row: span 2; }
  .photo-badge{ position:absolute; top:10px; left:10px; z-index:2; background:rgba(30,36,28,.62); color:#fff; backdrop-filter:blur(4px); font:600 11px Inter,system-ui,sans-serif; padding:4px 9px; border-radius:999px; }
  .lightbox{ position:fixed; inset:0; background: rgba(20,24,20,.88); display:none; align-items:center; justify-content:center; z-index: 9999; padding: 18px; }
  .lightbox.open{ display:flex; }
  .lightbox img{ max-width: min(1200px, 96vw); max-height: 92vh; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); background: rgba(0,0,0,.2); }
  .lightbox .hint{ position:fixed; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 12px; opacity: .75; color:#fff; }
</style>

<div id="lightbox" class="lightbox" role="dialog" aria-modal="true">
  <img id="lightboxImg" alt="">
  <div class="hint muted">Click anywhere to close • ESC</div>
</div>

<script>
  // --- CONFIG (only these 3 values matter) ---
  const LANG = (function(){var L=localStorage.getItem('pctLang'); if(L!=='de'&&L!=='en'){L=((navigator.language||'en').slice(0,2)==='de')?'de':'en';} return L;})();
  const FLICKR_API_KEY = "a8b28521e8527042f868d9b98b567ff3";
  const USER_ID = "35469735@N03";
  const PHOTOSET_ID = "72177720331905792"; // your album id

  // JSONP helper (avoids any CORS headaches on GitHub Pages)
  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = "flickr_cb_" + Math.random().toString(36).slice(2);
      const script = document.createElement("script");
      window[cb] = (data) => {
        cleanup();
        resolve(data);
      };
      function cleanup(){
        try { delete window[cb]; } catch(e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      }
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP failed"));
      };
      script.src = url + "&format=json&jsoncallback=" + cb;
      document.body.appendChild(script);
    });
  }

  function pickUrl(p){
    // Prefer big, fallback to medium
    return p.url_l || p.url_c || p.url_z || p.url_o || p.url_b || p.url_m || p.url_q;
  }

  function openLightbox(src, alt){
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    img.src = src;
    img.alt = alt || "";
    lb.classList.add("open");
  }

  function closeLightbox(){
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    lb.classList.remove("open");
    img.src = "";
  }

  (function initLightbox(){
    const lb = document.getElementById("lightbox");
    lb.addEventListener("click", closeLightbox);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  })();

  async function loadPhotos(){
    const grid = document.getElementById("photoGrid");
    const err = document.getElementById("photoError");

    const base =
      "https://www.flickr.com/services/rest/?" +
      "method=flickr.photosets.getPhotos" +
      "&api_key=" + encodeURIComponent(FLICKR_API_KEY) +
      "&user_id=" + encodeURIComponent(USER_ID) +
      "&photoset_id=" + encodeURIComponent(PHOTOSET_ID) +
      "&extras=" + encodeURIComponent("url_q,url_m,url_z,url_c,url_l,url_o,date_upload");

    try{
      const data = await jsonp(base);
      if (!data || data.stat !== "ok") throw new Error("Flickr API error");

      let photos = (data.photoset && data.photoset.photo) ? data.photoset.photo : [];
      // newest first (if date_upload is present)
      photos.sort((a,b) => (parseInt(b.dateupload||0) - parseInt(a.dateupload||0)));

      grid.innerHTML = "";
      for (const p of photos){
        const thumb = p.url_q || p.url_m || p.url_z;
        const full = pickUrl(p) || thumb;
        if (!thumb) continue;

        const a = document.createElement("a");
        a.className = "photo-item" + (grid.children.length === 0 ? " feat" : "");
        if (grid.children.length === 0) {
          const badge = document.createElement("div");
          badge.className = "photo-badge";
          badge.textContent = (LANG === "de") ? "Neuestes" : "Newest";
          a.appendChild(badge);
        }
        a.href = "https://www.flickr.com/photos/" + USER_ID + "/" + p.id;
        a.target = "_blank";
        a.rel = "noopener";

        const img = document.createElement("img");
        img.loading = "lazy";
        img.src = thumb;
        img.alt = p.title || "Photo";

        // Click opens lightbox (and prevents leaving the site)
        a.addEventListener("click", (e) => {
          e.preventDefault();
          openLightbox(full, img.alt);
        });

        a.appendChild(img);
        grid.appendChild(a);
      }

      if (grid.children.length === 0) {
        err.style.display = "block";
      }
    } catch(e){
      console.error(e);
      err.style.display = "block";
    }
  }

  loadPhotos();
</script>
