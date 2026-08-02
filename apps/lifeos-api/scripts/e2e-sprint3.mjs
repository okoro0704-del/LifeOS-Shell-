import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { verifyExperienceToken } from "@lifeos/experience-sdk";
import { DEFAULT_PREFERENCES } from "@lifeos/shared";

const API = "http://127.0.0.1:8790";
const HOS = "http://localhost:5180";
const prisma = new PrismaClient();
const hash = (v) => createHash("sha256").update(v).digest("hex");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const trustId = "TD-E2E" + randomBytes(3).toString("hex").toUpperCase();
const user = await prisma.user.create({
  data: { trustId, displayName: "E2E Guest", preferences: JSON.stringify(DEFAULT_PREFERENCES) },
});
const raw = randomBytes(24).toString("base64url");
await prisma.session.create({
  data: { tokenHash: hash(raw), userId: user.id, expiresAt: new Date(Date.now() + 3600_000) },
});
const cookie = "lifeos_session=" + raw;
const expId = "exp_sunrise_hotel";

try {
  console.log("1. JWKS");
  const jwks = await fetch(API + "/.well-known/experience-keys").then((r) => r.json());
  assert(jwks.keys?.length >= 1 && !("d" in jwks.keys[0]), "JWKS must be public only");
  console.log("   OK kid=" + jwks.keys[0].kid);

  console.log("2. Connect + issue session");
  await fetch(API + "/experiences/" + expId + "/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ permissions: ["profile.basic", "notifications"] }),
  });
  const sessRes = await fetch(API + "/experiences/" + expId + "/session", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert(sessRes.status === 200, "session create failed " + sessRes.status);
  const { session } = await sessRes.json();
  assert(session.handoff?.startsWith("hof_"), "handoff missing");
  assert(session.launchUrl.includes("/auth/lifeos"), "launchUrl wrong");
  assert(!session.launchUrl.includes("trustId="), "must not leak trustId");
  assert(!session.launchUrl.includes("permissions="), "must not leak permissions");
  console.log("   OK handoff + launchUrl");

  console.log("3. HospitalityOS auth page reachable");
  const hosAuth = await fetch(HOS + "/auth/lifeos");
  assert(hosAuth.status === 200, "HOS auth page " + hosAuth.status);
  console.log("   OK " + HOS + "/auth/lifeos");

  console.log("4. Exchange + verify (HospitalityOS path)");
  const ex = await fetch(API + "/experience-sessions/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoff: session.handoff, experienceId: expId }),
  });
  assert(ex.status === 200, "exchange failed");
  const { token, scopes } = await ex.json();
  const verified = await verifyExperienceToken({
    token,
    jwksUrl: API + "/.well-known/experience-keys",
    expectedAudience: expId,
  });
  assert(verified.ok, "verify failed: " + (verified.ok ? "" : verified.message));
  assert(verified.claims.iss === "lifeos", "issuer");
  assert(verified.claims.aud === expId, "aud");
  assert(!JSON.stringify(verified.claims).includes("TD-"), "no TrustID in claims");
  console.log("   OK scopes=" + scopes.join(","));

  console.log("5. Introspect active");
  let intro = await fetch(API + "/experience-sessions/introspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jti: verified.claims.jti }),
  }).then((r) => r.json());
  assert(intro.active === true, "should be active");
  console.log("   OK active");

  console.log("6. Replay rejected");
  const replay = await fetch(API + "/experience-sessions/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoff: session.handoff, experienceId: expId }),
  }).then((r) => r.json());
  assert(replay.error === "replay_detected", "replay: " + replay.error);
  console.log("   OK");

  console.log("7. Disconnect revokes");
  const connRes = await fetch(API + "/connections", { headers: { Cookie: cookie } });
  const { connections } = await connRes.json();
  const conn = connections.find((c) => c.experienceId === expId);
  assert(conn, "connection missing");
  const del = await fetch(API + "/connections/" + conn.id, {
    method: "DELETE",
    headers: { Cookie: cookie },
  });
  assert(del.status === 200, "disconnect failed " + del.status);
  intro = await fetch(API + "/experience-sessions/introspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jti: verified.claims.jti }),
  }).then((r) => r.json());
  assert(intro.active === false, "should be inactive after disconnect");
  console.log("   OK reason=" + intro.reason);

  console.log("8. Query-param auth cannot authenticate");
  const q = await fetch(HOS + "/?user=123&trustId=TD-FAKE&permissions=wallet.pay");
  assert(q.status === 200, "page loads");
  const html = await q.text();
  assert(!html.includes("TD-FAKE"), "must not echo trustId");
  console.log("   OK page does not honor query auth");

  console.log("\nE2E PASSED");
} finally {
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
  await prisma.$disconnect();
}
