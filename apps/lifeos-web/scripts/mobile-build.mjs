import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "..");

const env = {
  ...process.env,
  VITE_LIFEOS_API:
    process.env.VITE_LIFEOS_API || "https://lifeos-shell-production.up.railway.app",
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

run("npm", ["run", "build"]);
run("npx", ["cap", "sync"]);
