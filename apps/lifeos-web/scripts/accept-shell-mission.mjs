/**
 * Acceptance: viewport-fixed discovery diamond + shell timing + biz dock order.
 * Run after deploy or against local preview:
 *   npx playwright install chromium
 *   node scripts/accept-shell-mission.mjs
 *
 * Env:
 *   LIFEOS_ACCEPT_URL (default https://lifeosapp.getlifeos.app)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.LIFEOS_ACCEPT_URL || "https://lifeosapp.getlifeos.app";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tmp-accept");
mkdirSync(OUT, { recursive: true });

async function ensureAuthed(page) {
  await page.goto(`${ORIGIN}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  const bypass = page.getByRole("button", { name: /Enter LifeOS \(bypass\)/i });
  if (await bypass.count()) {
    await bypass.click();
    await page.waitForURL(/\/app/, { timeout: 60000 });
    return;
  }
  if (!page.url().includes("/app")) {
    await page.goto(`${ORIGIN}/app/business`, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
}

async function openBusiness(page) {
  await page.goto(`${ORIGIN}/app/business`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  // Switch to business if still personal
  const space = page.locator('[aria-label="Space Switcher"]').first();
  if ((await space.count()) && !(await page.locator(".business-home").count())) {
    // summon shell then tap space
    await page.locator(".lifeos-cmd-nav__edge").click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(300);
    await space.click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
  }
  await page.goto(`${ORIGIN}/app/business`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".business-home", { timeout: 30000 });
}

function centerOf(r) {
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, ...r };
}

async function measureDiamondScroll(page) {
  // Expand businesses
  const expand = page.locator('[data-discovery-diamond="inline"]').first();
  await expand.click();
  await page.waitForSelector('[data-discovery-diamond="float"]', { timeout: 15000 });
  await page.waitForTimeout(400);

  const points = [0, 0.25, 0.5, 0.75, 1];
  const measures = [];
  for (const p of points) {
    await page.evaluate((pct) => {
      const max = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        document.body.scrollHeight - window.innerHeight,
        0,
      );
      window.scrollTo(0, max * pct);
    }, p);
    await page.waitForTimeout(250);
    const rect = await page.evaluate(() => {
      const el = document.querySelector('[data-discovery-diamond="float"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        vw: window.innerWidth,
        vh: window.innerHeight,
        scrollY: window.scrollY,
      };
    });
    measures.push({ pct: p * 100, rect: rect ? centerOf(rect) : null });
  }
  return measures;
}

async function measureShellTiming(page) {
  await page.goto(`${ORIGIN}/app/personal/post`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(500);
  // Ensure shell closed
  await page.evaluate(() => {
    document.documentElement.dataset.shellControls = "0";
  });
  const edge = page.locator(".lifeos-cmd-nav__edge");
  await edge.click({ force: true });
  const t0 = Date.now();
  await page.waitForFunction(() => document.documentElement.dataset.shellControls === "1", {
    timeout: 5000,
  });
  // Idle dismiss
  await page.waitForFunction(() => document.documentElement.dataset.shellControls === "0", {
    timeout: 5000,
  });
  const idleMs = Date.now() - t0;

  // Confirm dismiss after section tap
  await edge.click({ force: true });
  await page.waitForFunction(() => document.documentElement.dataset.shellControls === "1");
  const tab = page.locator('.segment-topbar__tab:not(.is-active)').first();
  const t1 = Date.now();
  if (await tab.count()) {
    await tab.click();
    await page.waitForFunction(() => document.documentElement.dataset.shellControls === "0", {
      timeout: 4000,
    });
  }
  const confirmMs = Date.now() - t1;
  return { idleMs, confirmMs };
}

async function measureLivingPlacement(page) {
  await page.goto(`${ORIGIN}/app/personal/post`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-living-identity]", { timeout: 20000 });
  const personal = await page.evaluate(() => {
    const el = document.querySelector("[data-living-identity]");
    const r = el?.getBoundingClientRect();
    return {
      placement: el?.getAttribute("data-living-placement"),
      centerX: r ? r.x + r.width / 2 : null,
      vw: window.innerWidth,
    };
  });

  await page.goto(`${ORIGIN}/app/business`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-living-identity]", { timeout: 20000 });
  const business = await page.evaluate(() => {
    const el = document.querySelector("[data-living-identity]");
    const r = el?.getBoundingClientRect();
    return {
      placement: el?.getAttribute("data-living-placement"),
      centerX: r ? r.x + r.width / 2 : null,
      vw: window.innerWidth,
    };
  });
  return { personal, business };
}

async function bizDockOrder(page) {
  await openBusiness(page);
  const edge = page.locator(".lifeos-cmd-nav__edge");
  await edge.click({ force: true });
  await page.waitForSelector(".lifeos-biz-dock.is-open", { timeout: 8000 });
  return page.evaluate(() => {
    const dock = document.querySelector(".lifeos-biz-dock");
    const labels = [...(dock?.querySelectorAll(".lifeos-biz-dock__label") ?? [])].map(
      (n) => n.textContent?.trim() || "",
    );
    return {
      orderAttr: dock?.getAttribute("data-biz-dock-order"),
      labels,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const report = {
  origin: ORIGIN,
  at: new Date().toISOString(),
  viewports: {},
};

try {
  await ensureAuthed(page);
  report.bizDock = await bizDockOrder(page);
  report.diamond = await measureDiamondScroll(page);
  report.living = await measureLivingPlacement(page);
  report.timing = await measureShellTiming(page);

  for (const vp of [
    { name: "390x844", width: 390, height: 844 },
    { name: "768x1024", width: 768, height: 1024 },
    { name: "1440x900", width: 1440, height: 900 },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await openBusiness(page);
    const edge = page.locator(".lifeos-cmd-nav__edge");
    await edge.click({ force: true });
    await page.waitForTimeout(400);
    const shot = path.join(OUT, `${vp.name}-biz-dock.png`);
    await page.screenshot({ path: shot, fullPage: false });
    report.viewports[vp.name] = { screenshot: shot };
  }
} catch (err) {
  report.error = String(err);
} finally {
  await browser.close();
}

const outFile = path.join(OUT, "shell-mission-report.json");
writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("Wrote", outFile);
