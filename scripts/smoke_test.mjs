// Quick check of the live site after every deploy: loads the pages in a real
// browser (desktop and phone) and checks that nothing is broken.
// Usage: node scripts/smoke_test.mjs [base-url]
import { chromium, devices } from "playwright";

const BASE = (process.argv[2] || "https://dacat84.github.io/pct-tracker/").replace(/\/?$/, "/");
const bust = "&_=" + Date.now();   // skip the browser/CDN cache
const problems = [];

// main pages must only ever use the real data (data/), never data/demo or data/test
const realOnly = async (p) => {
  const src = await p.evaluate(() => window.PCTLab && window.PCTLab.src);
  if (src !== "live") throw new Error("main page uses data source '" + src + "'");
  if (p.__demoHits) throw new Error("main page loaded demo or test data");
};
const checks = [
  { path: "?x=1", name: "Reportage", run: async (p) => { await p.waitForSelector(".me", { timeout: 30000 }); await realOnly(p); } },
  { path: "tagebuch/?x=1", name: "Tagebuch", run: async (p) => { await p.waitForSelector(".e", { timeout: 30000 }); await realOnly(p); } },
  { path: "fotos/?x=1", name: "Fotos", run: async (p) => { await p.waitForFunction(() => document.querySelector(".ph, .empty"), null, { timeout: 30000 }); await realOnly(p); } },
  { path: "statistik/?x=1", name: "Statistik", run: async (p) => { await p.waitForFunction(() => /km|mi/.test(document.getElementById("hTot")?.textContent || ""), null, { timeout: 30000 }); await realOnly(p); } },
  { path: "ausruestung/?x=1", name: "Ausrüstung", run: async (p) => {
      const v = await p.textContent(".t.base .v"); if (!/\d{3,}/.test(v)) throw new Error("base weight missing ('" + v + "')"); await realOnly(p); } },
  { path: "labs/?data=demo", name: "Labs Reportage", run: async (p) => {
      await p.waitForFunction(() => /\d/.test(document.getElementById("cDay")?.textContent || ""), null, { timeout: 30000 });
      const day = await p.textContent("#cDay");
      if (!/(Tag|Day) \d+/.test(day)) throw new Error("day card shows '" + day + "'");
      if (!(await p.$("#prof svg"))) throw new Error("elevation strip missing");
  } },
  { path: "labs/statistik/?data=demo", name: "Labs Statistik", run: async (p) => {
      await p.waitForFunction(() => /km|mi/.test(document.getElementById("hTot")?.textContent || ""), null, { timeout: 30000 });
      const w = await p.$eval("#hBar", (e) => parseFloat(e.style.width) || 0);
      if (!(w > 0)) throw new Error("progress bar is empty");
      const rows = await p.$$eval("#days .row", (r) => r.length);
      if (rows < 10) throw new Error("day list has only " + rows + " rows");
  } },
  { path: "labs/tagebuch/?data=test", name: "Labs Tagebuch (Testdaten)", run: async (p) => { await p.waitForSelector(".e", { timeout: 30000 }); } },
];

const browser = await chromium.launch();
for (const [label, ctxOpts] of [["Desktop", { viewport: { width: 1300, height: 900 } }], ["Handy", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext(ctxOpts);
  for (const c of checks) {
    const page = await ctx.newPage(), errors = [];
    page.on("request", (r) => { if (/\/data\/(demo|test)\//.test(r.url()) && !c.path.startsWith("labs/")) page.__demoHits = true; });
    page.on("pageerror", (e) => errors.push(e.message));
    const url = BASE + c.path + (c.path.includes("?") ? bust : "?" + bust.slice(1));
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
      if (!res || res.status() >= 400) throw new Error("HTTP " + (res && res.status()));
      await c.run(page);
      await page.waitForTimeout(1500);
      if (errors.length) throw new Error("JavaScript error: " + errors[0]);
      console.log("ok   " + label + " · " + c.name);
    } catch (e) {
      problems.push(label + " · " + c.name + ": " + e.message.split("\n")[0]);
      console.log("FAIL " + label + " · " + c.name + ": " + e.message.split("\n")[0]);
    }
    await page.close();
  }
  await ctx.close();
}
await browser.close();

if (problems.length) {
  const fs = await import("node:fs");
  fs.writeFileSync("smoke_problems.txt", problems.map((p) => "- " + p).join("\n"));
  process.exit(1);
}
