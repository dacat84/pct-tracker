// Quick check of the live site after every deploy: loads the pages in a real
// browser (desktop and phone) and checks that nothing is broken.
// Usage: node scripts/smoke_test.mjs [base-url]
import { chromium, devices } from "playwright";

const BASE = (process.argv[2] || "https://dacat84.github.io/pct-tracker/").replace(/\/?$/, "/");
const bust = "&_=" + Date.now();   // skip the browser/CDN cache
const problems = [];

const checks = [
  { path: "labs/?data=demo", name: "Reportage", run: async (p) => {
      await p.waitForFunction(() => /\d/.test(document.getElementById("cDay")?.textContent || ""), null, { timeout: 30000 });
      const day = await p.textContent("#cDay");
      if (!/(Tag|Day) \d+/.test(day)) throw new Error("day card shows '" + day + "'");
      if (!(await p.$("#prof svg"))) throw new Error("elevation strip missing");
      if (!(await p.$(".me"))) throw new Error("position marker missing");
  } },
  { path: "labs/statistik/?data=demo", name: "Statistik", run: async (p) => {
      await p.waitForFunction(() => /km|mi/.test(document.getElementById("hTot")?.textContent || ""), null, { timeout: 30000 });
      const w = await p.$eval("#hBar", (e) => parseFloat(e.style.width) || 0);
      if (!(w > 0)) throw new Error("progress bar is empty");
      const rows = await p.$$eval("#days .row", (r) => r.length);
      if (rows < 10) throw new Error("day list has only " + rows + " rows");
      if (!(await p.$("#prof svg path"))) throw new Error("elevation profile missing");
  } },
  { path: "labs/tagebuch/?data=demo", name: "Tagebuch", run: async (p) => {
      await p.waitForSelector(".e", { timeout: 30000 });
  } },
  { path: "labs/?data=test", name: "Reportage (Testdaten)", run: async (p) => { await p.waitForSelector(".me", { timeout: 30000 }); } },
  { path: "?x=1", name: "Startseite", run: async (p) => { await p.waitForTimeout(4000); } },
  { path: "stats.html?x=1", name: "Statistik (alt)", run: async (p) => { await p.waitForTimeout(3000); } },
];

const browser = await chromium.launch();
for (const [label, ctxOpts] of [["Desktop", { viewport: { width: 1300, height: 900 } }], ["Handy", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext(ctxOpts);
  for (const c of checks) {
    const page = await ctx.newPage(), errors = [];
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
