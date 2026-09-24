/**
 * Acceptance-only: measure Home section-bar geometry on rendered LifeOS.
 * Run: npx playwright install chromium && node scripts/accept-section-nav.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.LIFEOS_ACCEPT_URL || "https://lifeosapp.getlifeos.app";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "tmp-accept");
mkdirSync(OUT, { recursive: true });

const SECTIONS = ["post", "reels", "products", "communities"];
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1440x900", width: 1440, height: 900 },
];

async function ensureAuthed(page) {
  await page.goto(`${ORIGIN}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  const bypass = page.getByRole("button", { name: /Enter LifeOS \(bypass\)/i });
  if (await bypass.count()) {
    await bypass.click();
    await page.waitForURL(/\/app/, { timeout: 60000 });
    return;
  }
  const enter = page.getByRole("button", { name: /Enter LifeOS/i }).first();
  if (await enter.count()) {
    await enter.click();
    await page.waitForTimeout(2000);
  }
  // If already in app
  if (!page.url().includes("/app")) {
    await page.goto(`${ORIGIN}/app/personal/post`, { waitUntil: "domcontentloaded", timeout: 60000 });
  }
}

async function measureSection(page, section) {
  await page.goto(`${ORIGIN}/app/personal/${section}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector(".segment-topbar--glass", { timeout: 30000 });
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const bar = document.querySelector(".segment-topbar--glass");
    const search = document.querySelector(".segment-topbar__icon-btn--search");
    const brand = document.querySelector(".kernel-brand-bar");
    const active = document.querySelector(".segment-topbar__tab.is-active");
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        top: Math.round(b.top * 10) / 10,
        bottom: Math.round(b.bottom * 10) / 10,
        height: Math.round(b.height * 10) / 10,
        y: Math.round(b.y * 10) / 10,
      };
    };
    return {
      bar: r(bar),
      search: r(search),
      brand: r(brand),
      active: r(active),
      path: location.pathname,
    };
  });
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    isMobile: vp.width < 600,
    hasTouch: vp.width < 600,
  });
  const page = await context.newPage();
  const result = { viewport: vp.name, sections: {}, ok: true, notes: [] };
  try {
    await ensureAuthed(page);
    for (const section of SECTIONS) {
      const m = await measureSection(page, section);
      result.sections[section] = m;
      await page.screenshot({
        path: path.join(OUT, `${vp.name}-${section}.png`),
        fullPage: false,
      });
    }
    const tops = SECTIONS.map((s) => result.sections[s]?.bar?.top).filter((n) => typeof n === "number");
    const searchTops = SECTIONS.map((s) => result.sections[s]?.search?.top).filter(
      (n) => typeof n === "number",
    );
    const heights = SECTIONS.map((s) => result.sections[s]?.bar?.height).filter(
      (n) => typeof n === "number",
    );
    const maxDelta = Math.max(...tops) - Math.min(...tops);
    const searchDelta = Math.max(...searchTops) - Math.min(...searchTops);
    const heightDelta = Math.max(...heights) - Math.min(...heights);
    result.maxBarYDelta = maxDelta;
    result.maxSearchYDelta = searchDelta;
    result.maxHeightDelta = heightDelta;
    result.ok = maxDelta <= 2 && searchDelta <= 2 && heightDelta <= 2;

    // Shell / content chrome presence at Post
    await page.goto(`${ORIGIN}/app/personal/post`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".content-nav-bar, .bottom-nav", { timeout: 20000 });
    const chrome = await page.evaluate(async () => {
      const contentNav = document.querySelector(".content-nav-bar");
      const bottom = document.querySelector(".bottom-nav");
      const free = [...document.querySelectorAll("button,a")].some((el) =>
        /FREE/.test(el.textContent || ""),
      );
      const offline = [...document.querySelectorAll("button,a")].some((el) =>
        /OFFLINE/.test(el.textContent || ""),
      );
      const live = [...document.querySelectorAll("a,button")].some((el) =>
        /\bLIVE\b/.test(el.textContent || ""),
      );
      // Enter content mode by scrolling immersive feed if present
      const feed = document.querySelector(".immersive-feed");
      let after = null;
      if (feed) {
        feed.scrollTop = Math.min(feed.scrollHeight, 900);
        await new Promise((r) => setTimeout(r, 400));
        after = {
          contentDocked: contentNav?.classList.contains("is-docked") || false,
          bottomHidden:
            bottom?.classList.contains("is-chrome-hidden") ||
            bottom?.getAttribute("aria-hidden") === "true" ||
            getComputedStyle(bottom || document.body).opacity === "0",
          htmlChrome: document.documentElement.classList.contains("lifeos-chrome-hidden"),
        };
        feed.scrollTop = 0;
        await new Promise((r) => setTimeout(r, 400));
      }
      return {
        free,
        offline,
        live,
        contentNav: Boolean(contentNav),
        bottomNav: Boolean(bottom),
        afterScroll: after,
      };
    });
    result.chrome = chrome;

    // FREE / OFFLINE / LIVE routes
    const freeBtn = page.locator(".content-nav-bar__chip", { hasText: "FREE" });
    if (await freeBtn.count()) {
      await freeBtn.click();
      await page.waitForTimeout(800);
      result.freeRoute = page.url();
    }
    const offlineBtn = page.locator(".content-nav-bar__chip", { hasText: "OFFLINE" });
    if (await offlineBtn.count()) {
      await offlineBtn.click();
      await page.waitForTimeout(800);
      result.offlineRoute = page.url();
    }
    const liveLink = page.locator(".content-nav-bar__live");
    if (await liveLink.count()) {
      await liveLink.click();
      await page.waitForTimeout(800);
      result.liveRoute = page.url();
    }
  } catch (err) {
    result.ok = false;
    result.error = String(err?.message || err);
  } finally {
    await context.close();
  }
  return result;
}

const browser = await chromium.launch({ headless: true });
const report = { origin: ORIGIN, commitHint: "3c178d2", viewports: [] };
try {
  for (const vp of VIEWPORTS) {
    report.viewports.push(await runViewport(browser, vp));
  }
} finally {
  await browser.close();
}

const outFile = path.join(OUT, "report.json");
writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log(`Wrote ${outFile}`);
