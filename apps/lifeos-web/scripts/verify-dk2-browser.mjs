// Headless local runtime proof. No production routes, accounts, or visual redesign.
import { createServer } from "vite";
import { createRequire } from "node:module";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
// Reuse installed verification tooling; never change frozen package/dependency files.
const { chromium } = process.env.DK2_PLAYWRIGHT_MODULE
  ? require(process.env.DK2_PLAYWRIGHT_MODULE)
  : require("playwright");
const profile = await mkdtemp(join(tmpdir(), "lifeos-dk2-browser-"));
const server = await createServer({ configFile: false, appType: "custom", root, optimizeDeps: { entries: ["test/fixtures/dk2-browser-harness.ts"] }, server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
server.middlewares.use("/__dk2-proof", (_req, res) => { res.setHeader("Content-Type", "text/html"); res.end("<!doctype html><title>DK2 headless proof</title><body></body>"); });
await server.listen();
const origin = server.resolvedUrls.local[0];
let context;
const results = {};
const pageErrors = [];
try {
  async function open() {
    context = await chromium.launchPersistentContext(profile, { headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
    const page = context.pages()[0] ?? await context.newPage();
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(new URL("/__dk2-proof", origin).href);
    await page.evaluate(async () => { window.dk2 = await import("/test/fixtures/dk2-browser-harness.ts"); });
    return page;
  }
  let page = await open();
  results.initial = await page.evaluate(() => window.dk2.seedAndPlay());
  // Full Chromium shutdown: IndexedDB must survive process/context restart on disk.
  await context.close(); context = undefined;
  page = await open();
  await context.setOffline(true);
  results.restartOffline = await page.evaluate(() => window.dk2.restoreOffline());
  results.transferRecovery = await page.evaluate(() => window.dk2.transferAndRecovery());
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  results.status = "PASSED";
  results.browser = "Chromium";
  results.durability = "Persistent profile, complete browser shutdown and reopen";
  results.scope = "Headless runtime; test code loaded from localhost before disabling network. No production UI adoption or offline app-shell claim.";
  results.checkCount = Object.values(results).filter(v => v && typeof v === "object" && Array.isArray(v.checks)).reduce((n, v) => n + v.checks.length, 0);
  await writeFile(resolve(root, "../../docs/dual-kernel-dk2-browser-results.json"), JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
} finally { if (context) await context.close(); await server.close(); }
