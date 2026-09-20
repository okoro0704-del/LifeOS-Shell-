/**
 * Viewport-fixed diamond measurement (no auth).
 * Loads architecture CSS into a long scroll page and measures getBoundingClientRect
 * at 0/25/50/75/100% scroll.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(path.join(root, "src/styles.css"), "utf8");
const OUT = path.join(root, "tmp-accept");
mkdirSync(OUT, { recursive: true });

const html = `<!doctype html>
<html><head><meta charset="utf-8"/><style>
${css}
body { margin: 0; }
.grid { display: grid; grid-template-columns: 1fr 1fr; }
.cell { height: 120px; border: 1px solid #ccc; }
</style></head>
<body>
<ul class="discovery-expanded__grid grid" id="grid"></ul>
<button type="button" class="discovery-diamond discovery-diamond--float discovery-diamond--attention" data-discovery-diamond="float" aria-label="Return">
  <span class="discovery-diamond__face"><span class="discovery-diamond__icon">◆</span></span>
</button>
<script>
  const g = document.getElementById('grid');
  for (let i = 0; i < 100; i++) {
    const li = document.createElement('li');
    li.className = 'discovery-expanded__cell cell';
    li.textContent = 'Item ' + (i + 1);
    g.appendChild(li);
  }
</script>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.setContent(html, { waitUntil: "load" });

const points = [0, 0.25, 0.5, 0.75, 1];
const measures = [];
for (const p of points) {
  await page.evaluate((pct) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * pct);
  }, p);
  await page.waitForTimeout(100);
  const m = await page.evaluate(() => {
    const el = document.querySelector('[data-discovery-diamond="float"]');
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollY: window.scrollY,
    };
  });
  measures.push({ pct: p * 100, ...m });
}

const cols = await page.evaluate(() => {
  const g = document.querySelector(".discovery-expanded__grid");
  return getComputedStyle(g).gridTemplateColumns.split(" ").filter(Boolean).length;
});

await browser.close();

const cxs = measures.map((m) => m.cx);
const cys = measures.map((m) => m.cy);
const maxDx = Math.max(...cxs) - Math.min(...cxs);
const maxDy = Math.max(...cys) - Math.min(...cys);
const report = {
  viewport: "390x844",
  columns: cols,
  measures,
  maxCenterDeltaPx: { x: maxDx, y: maxDy },
  stable: maxDx < 2 && maxDy < 2,
  expectedCenter: { x: 195, y: 422 },
};

writeFileSync(path.join(OUT, "diamond-measure.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.stable) process.exitCode = 1;
