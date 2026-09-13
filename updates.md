---
layout: default
title: Diary
nav: updates
---

<div class="updates">

<h2 class="updates-title" data-en="Trail Diary" data-de="Trail-Tagebuch">Trail Diary</h2>
<p class="muted" style="margin:-4px 2px 14px;font-size:13.5px" data-en="Short notes from the trail, newest first." data-de="Kurze Notizen von unterwegs, neueste zuerst.">Short notes from the trail, newest first.</p>
{% assign items = site.updates | sort: "date" | reverse %}
{% assign months_de = "Januar,Februar,März,April,Mai,Juni,Juli,August,September,Oktober,November,Dezember" | split: "," %}
{% for u in items %}{% assign mi = u.date | date: "%-m" | minus: 1 %}{% assign date_en = u.date | date: "%B %-d, %Y, %-I:%M %p" %}{% capture date_de %}{{ u.date | date: "%-d" }}. {{ months_de[mi] }} {{ u.date | date: "%Y, %H:%M" }} Uhr{% endcapture %}
<div class="update-card">
<div class="update-date" data-en="{{ date_en }}" data-de="{{ date_de }}">{{ date_en }}</div>
<div class="update-text">
<div class="lang-de" markdown="1">{{ u.de | markdownify }}</div>
<div class="lang-en" markdown="1">{{ u.en | markdownify }}</div>
</div>
</div>  
{% endfor %}
<div class="update-note" data-en="(Older entries at the bottom)" data-de="(Ältere Einträge unten)">(Older entries at the bottom)</div>

</div>
