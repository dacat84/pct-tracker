---
layout: default
title: Diary
nav: updates
---

<div class="updates">

<h2 class="updates-title" data-en="Diary" data-de="Tagebuch">Diary</h2>
<p class="muted" style="margin:-4px 2px 16px;font-size:13.5px" data-en="The journey begins long before the first step." data-de="Die Reise beginnt lange vor dem ersten Schritt.">The journey begins long before the first step.</p>
{% assign items = site.updates | sort: "date" | reverse %}
{% assign months_de = "Januar,Februar,März,April,Mai,Juni,Juli,August,September,Oktober,November,Dezember" | split: "," %}
{% for u in items %}{% assign mi = u.date | date: "%-m" | minus: 1 %}{% assign date_en = u.date | date: "%B %-d, %Y, %-I:%M %p" %}{% capture date_de %}{{ u.date | date: "%-d" }}. {{ months_de[mi] }} {{ u.date | date: "%Y, %H:%M" }} Uhr{% endcapture %}{% assign t_en = u.title_en | default: u.title %}{% assign t_de = u.title | default: u.title_en %}
<div class="update-card">
{% if t_en %}<div class="update-title" data-en="{{ t_en | escape }}" data-de="{{ t_de | escape }}">{{ t_en }}</div>{% endif %}
<div class="update-date" data-en="{{ date_en }}" data-de="{{ date_de }}">{{ date_en }}</div>
<div class="update-text">
<div class="lang-de" markdown="1">{{ u.de | markdownify }}</div>
<div class="lang-en" markdown="1">{{ u.en | default: u.de | markdownify }}</div>
</div>
</div>  
{% endfor %}
<div class="update-note" data-en="(Older entries at the bottom)" data-de="(Ältere Einträge unten)">(Older entries at the bottom)</div>

</div>

<style>
  .update-title{ font-family:'Fraunces',Georgia,serif; font-weight:600; font-size:19px; color:#1e241c; margin:2px 0 4px; line-height:1.25; }
  .update-card .update-date{ font-size:12.5px; color:#8a9082; font-weight:600; letter-spacing:.01em; }
</style>
