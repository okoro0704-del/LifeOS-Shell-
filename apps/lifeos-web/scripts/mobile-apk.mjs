import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "..");
const androidRoot = path.join(webRoot, "android");
const keystore = path.join(androidRoot, "app", "lifeos-release.keystore");

function run(cmd, args, cwd = webRoot) {
  const result = spawnSync(cmd, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Ensure a local release keystore exists for sideloadable APKs.
if (!existsSync(keystore)) {
  console.log("Generating lifeos-release.keystore…");
  run("keytool", [
    "-genkeypair",
    "-v",
    "-keystore",
    keystore,
    "-alias",
    "lifeos",
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "36500",
    "-storepass",
    "lifeos-release",
    "-keypass",
    "lifeos-release",
    "-dname",
    "CN=LifeOS,OU=Mobile,O=LifeOS,L=Internet,ST=NA,C=US",
  ]);
}

run("node", [path.join(root, "mobile-build.mjs")]);

const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
run(gradlew, ["assembleRelease"], androidRoot);

const apk = path.join(androidRoot, "app", "build", "outputs", "apk", "release", "app-release.apk");
console.log(`\nAPK ready:\n  ${apk}\n`);
if (!existsSync(apk)) {
  console.error("APK not found after assembleRelease");
  process.exit(1);
}
