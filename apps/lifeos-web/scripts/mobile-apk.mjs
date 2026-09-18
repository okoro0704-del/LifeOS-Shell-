import { spawnSync, execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const root = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(root, "..");
const androidRoot = path.join(webRoot, "android");
const keystore = path.join(androidRoot, "app", "lifeos-release.keystore");
const desktop = path.join(os.homedir(), "Desktop");

function run(cmd, args, cwd = webRoot) {
  const result = spawnSync(cmd, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function findBuildTools() {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");
  const btRoot = path.join(sdk, "build-tools");
  if (!existsSync(btRoot)) return null;
  const versions = readdirSync(btRoot)
    .filter((n) => /^\d/.test(n))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return versions[0] ? path.join(btRoot, versions[0]) : null;
}

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
// Debug APK is the most reliable sideload artifact across Android versions.
run(gradlew, ["assembleDebug", "assembleRelease"], androidRoot);

const debugApk = path.join(androidRoot, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const releaseApk = path.join(
  androidRoot,
  "app",
  "build",
  "outputs",
  "apk",
  "release",
  "app-release.apk",
);

if (!existsSync(debugApk)) {
  console.error("Debug APK not found after assembleDebug");
  process.exit(1);
}

const outDebug = path.join(desktop, "LifeOS.apk");
copyFileSync(debugApk, outDebug);
console.log(`\nSideload APK (use this):\n  ${outDebug}\n`);

const bt = findBuildTools();
if (bt && existsSync(releaseApk) && existsSync(keystore)) {
  const aligned = path.join(os.tmpdir(), "lifeos-aligned.apk");
  const signed = path.join(os.tmpdir(), "lifeos-signed.apk");
  const zipalign = path.join(bt, process.platform === "win32" ? "zipalign.exe" : "zipalign");
  const apksigner = path.join(bt, process.platform === "win32" ? "apksigner.bat" : "apksigner");
  run(zipalign, ["-f", "-p", "4", releaseApk, aligned], androidRoot);
  run(
    apksigner,
    [
      "sign",
      "--ks",
      keystore,
      "--ks-pass",
      "pass:lifeos-release",
      "--ks-key-alias",
      "lifeos",
      "--key-pass",
      "pass:lifeos-release",
      "--v1-signing-enabled",
      "true",
      "--v2-signing-enabled",
      "true",
      "--v3-signing-enabled",
      "true",
      "--out",
      signed,
      aligned,
    ],
    androidRoot,
  );
  try {
    execFileSync(apksigner, ["verify", "--verbose", signed], { stdio: "inherit" });
  } catch {
    /* verify warnings are non-fatal */
  }
  const outRelease = path.join(desktop, "LifeOS-release.apk");
  copyFileSync(signed, outRelease);
  console.log(`Release APK:\n  ${outRelease}\n`);
}
