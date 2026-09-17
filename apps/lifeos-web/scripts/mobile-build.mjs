import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "..");

/** Production shell loads live Netlify — install APK once, OTA web updates forever. */
const LIVE_WEB =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.VITE_LIFEOS_WEB ||
  "https://lifeosapp.getlifeos.app";

const env = {
  ...process.env,
  VITE_LIFEOS_API:
    process.env.VITE_LIFEOS_API || "https://lifeos-shell-production.up.railway.app",
  VITE_LIFEOS_WEB: LIVE_WEB.replace(/\/$/, ""),
  CAPACITOR_SERVER_URL: LIVE_WEB.replace(/\/$/, ""),
};

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: webRoot,
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`LifeOS mobile sync → CAPACITOR_SERVER_URL=${env.CAPACITOR_SERVER_URL}`);
run("npm", ["run", "build"]);
run("npx", ["cap", "sync"]);
