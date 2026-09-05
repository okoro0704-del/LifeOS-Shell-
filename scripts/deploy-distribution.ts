/**
 * Upload LifeOS release artifacts to the Master Distribution Hub and
 * broadcast release events via ElfCom (through distribution-hub push + direct BaaS).
 *
 * Env:
 *   MASTER_DISTRIBUTION_URL     — LifeOS API hub hosting POST /v1/releases
 *   MASTER_DISTRIBUTION_SECRET  — Bearer for /v1/releases
 *   DISTRIBUTION_HUB_URL        — Platform distribution-hub (jobs + ElfCom push)
 *   TRUST_ID_JWT_SECRET         — HS256 secret for hub auth
 *   TRUST_ID_ISSUER / TRUST_ID_AUDIENCE
 *   ELFCOM_BASE_URL / ELFCOM_API_URL / ELFCOM_BAAS_API_KEY
 *   RELEASE_VERSION
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHmac, createSecretKey } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const DIST_HUB_URL = (
  process.env.MASTER_DISTRIBUTION_URL ||
  process.env.DISTRIBUTOR_URL ||
  "https://lucid-integrity-production.up.railway.app"
).replace(/\/$/, "");
const DIST_SECRET = process.env.MASTER_DISTRIBUTION_SECRET || process.env.DISTRIBUTOR_SECRET || "";
const PLATFORM_HUB_URL = (
  process.env.DISTRIBUTION_HUB_URL ||
  "https://distribution-hub-production.up.railway.app"
).replace(/\/$/, "");
const ELFCOM_BASE = (
  process.env.ELFCOM_BASE_URL ||
  process.env.ELFCOM_API_URL ||
  ""
).replace(/\/$/, "");
const ELFCOM_KEY = process.env.ELFCOM_BAAS_API_KEY || "";

type PublishResult = {
  platform: string;
  skipped?: boolean;
  status?: number;
  body?: unknown;
};

function resolveVersion(): string {
  if (process.env.RELEASE_VERSION) return process.env.RELEASE_VERSION;
  try {
    const pkg = require(path.join(root, "package.json")) as { version?: string };
    return pkg.version || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/** Minimal HS256 JWT for distribution-hub TrustID middleware. */
function mintHubToken(tenantId: string): string | null {
  const secret = process.env.TRUST_ID_JWT_SECRET;
  if (!secret) return null;
  const iss = process.env.TRUST_ID_ISSUER || "lifeos-trust-id";
  const aud = process.env.TRUST_ID_AUDIENCE || "platform-jobs-engine";
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "lifeos-release-bot",
      tenantId,
      iss,
      aud,
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", createSecretKey(Buffer.from(secret)))
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

async function publishRelease(
  appId: string,
  version: string,
  platform: string,
  artifactPath: string,
): Promise<PublishResult> {
  const abs = path.isAbsolute(artifactPath) ? artifactPath : path.join(root, artifactPath);
  if (!fs.existsSync(abs)) {
    console.warn(`Artifact not found at ${abs}, skipping platform: ${platform}`);
    return { platform, skipped: true };
  }

  const fileBuffer = fs.readFileSync(abs);
  const filename = path.basename(abs);
  console.log(`Uploading ${appId} v${version} [${platform}] to Master Distribution Hub...`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (DIST_SECRET) {
    headers.Authorization = `Bearer ${DIST_SECRET}`;
  }

  const maxInline = 1_500_000;
  const payload: Record<string, unknown> = {
    appId,
    version,
    platform,
    filename,
    contentType: filename.endsWith(".html")
      ? "text/html"
      : filename.endsWith(".apk")
        ? "application/vnd.android.package-archive"
        : "application/octet-stream",
    sizeBytes: fileBuffer.length,
  };
  if (fileBuffer.length <= maxInline) {
    payload.artifactBase64 = fileBuffer.toString("base64");
  }

  const response = await fetch(`${DIST_HUB_URL}/v1/releases`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }

  if (!response.ok) {
    throw new Error(
      `Failed to publish ${platform} release: ${response.status} ${response.statusText} — ${text.slice(0, 400)}`,
    );
  }

  console.log(`Successfully published ${platform} release (${response.status}):`, body);
  await dispatchReleaseNotices({ appId, version, platform });
  return { platform, status: response.status, body };
}

async function dispatchReleaseNotices(input: {
  appId: string;
  version: string;
  platform: string;
}): Promise<void> {
  const hubToken = mintHubToken(process.env.ELFCOM_TENANT_ID || "lifeos");
  if (hubToken) {
    try {
      const res = await fetch(`${PLATFORM_HUB_URL}/v1/distribution/push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hubToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "lifeos.release.published",
          payload: input,
          idempotencyKey: `lifeos-release-${input.appId}-${input.version}-${input.platform}`,
        }),
      });
      const text = await res.text();
      console.log(`distribution-hub push ${res.status}: ${text.slice(0, 240)}`);
    } catch (err) {
      console.warn(
        "distribution-hub push failed:",
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.warn("TRUST_ID_JWT_SECRET unset — skipping distribution-hub ElfCom push");
  }

  if (!ELFCOM_BASE || !ELFCOM_KEY) {
    console.warn("ELFCOM_BASE_URL / ELFCOM_BAAS_API_KEY unset — skipping direct ElfCom dispatch");
    return;
  }

  try {
    const res = await fetch(`${ELFCOM_BASE}/v1/events/push`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ELFCOM_KEY}`,
        "Content-Type": "application/json",
        "X-ElfCom-Tenant": process.env.ELFCOM_TENANT_ID || "lifeos",
      },
      body: JSON.stringify({
        type: "lifeos.release.published",
        tenantId: process.env.ELFCOM_TENANT_ID || "lifeos",
        payload: {
          title: `LifeOS ${input.version} (${input.platform})`,
          body: `${input.appId} ${input.version} is available for ${input.platform}.`,
          ...input,
        },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(`ElfCom events/push ${res.status}: ${text.slice(0, 300)}`);
      return;
    }
    console.log(`ElfCom events/push ok for ${input.platform}: ${text.slice(0, 200)}`);
  } catch (err) {
    console.warn("ElfCom events/push failed:", err instanceof Error ? err.message : err);
  }
}

async function run() {
  const version = resolveVersion();
  console.log(
    `Distribution deploy — releases=${DIST_HUB_URL} platformHub=${PLATFORM_HUB_URL} version=${version}`,
  );

  const results: PublishResult[] = [];
  results.push(
    await publishRelease("lifeos-web", version, "web", "apps/lifeos-web/dist/index.html"),
  );
  results.push(
    await publishRelease(
      "lifeos-desktop",
      version,
      "windows",
      "apps/lifeos-web/src-tauri/target/release/bundle/msi/LifeOS_1.0.0_x64_en-US.msi",
    ),
  );
  results.push(
    await publishRelease(
      "lifeos-mobile",
      version,
      "android",
      "apps/lifeos-web/android/app/build/outputs/apk/release/app-release.apk",
    ),
  );

  const published = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  console.log(
    `Done. published=${published.length} skipped=${skipped.length} (${skipped.map((s) => s.platform).join(", ") || "none"})`,
  );

  if (published.length === 0) {
    console.error("No artifacts published — build web/desktop/mobile first.");
    process.exit(2);
  }
}

run().catch((err) => {
  console.error("Distribution Deployment Failed:", err);
  process.exit(1);
});
