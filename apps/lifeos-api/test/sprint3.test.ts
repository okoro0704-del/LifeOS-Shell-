import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import test, { describe } from "node:test";
import { SignJWT } from "jose";
import { DEFAULT_PREFERENCES, EXPERIENCE_TOKEN_ISSUER } from "@lifeos/shared";
import { createExperienceBridge, verifyExperienceToken } from "@lifeos/experience-sdk";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const API = "http://127.0.0.1:8790";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createSessionUser() {
  const trustId = `TD-S3${randomBytes(4).toString("hex").toUpperCase()}`;
  const user = await prisma.user.create({
    data: {
      trustId,
      displayName: "Sprint Three",
      preferences: JSON.stringify(DEFAULT_PREFERENCES),
    },
  });
  const raw = randomBytes(24).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hash(raw),
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  return { user, cookie: `lifeos_session=${raw}` };
}

async function connectAndIssue(cookie: string, experienceId = "exp_sunrise_hotel") {
  await fetch(`${API}/experiences/${experienceId}/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ permissions: ["profile.basic", "notifications"] }),
  });
  const res = await fetch(`${API}/experiences/${experienceId}/session`, {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(res.status, 200);
  return (await res.json()) as {
    session: { sessionId: string; handoff: string; launchUrl: string; experienceId: string };
  };
}

describe("experience session protocol", () => {
  test("JWKS is public and has no private material", async () => {
    const res = await fetch(`${API}/.well-known/experience-keys`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { keys: Record<string, unknown>[] };
    assert.ok(body.keys.length >= 1);
    for (const k of body.keys) {
      assert.ok(!("d" in k), "private key material must not be published");
      assert.equal(k.alg, "EdDSA");
    }
  });

  test("valid handoff exchange + JWT verify accepts", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie);
    assert.ok(session.handoff.startsWith("hof_"));
    assert.ok(session.launchUrl.includes("/auth/lifeos"));
    assert.ok(!session.launchUrl.includes("trustId="));
    assert.ok(!session.launchUrl.includes("permissions="));

    const exchange = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    assert.equal(exchange.status, 200);
    const body = (await exchange.json()) as { token: string };
    assert.ok(body.token.split(".").length === 3);

    const verified = await verifyExperienceToken({
      token: body.token,
      jwksUrl: `${API}/.well-known/experience-keys`,
      expectedAudience: "exp_sunrise_hotel",
      requiredScopes: ["profile.basic"],
    });
    assert.equal(verified.ok, true);
    if (verified.ok) {
      assert.equal(verified.claims.iss, EXPERIENCE_TOKEN_ISSUER);
      assert.equal(verified.claims.aud, "exp_sunrise_hotel");
      assert.equal(verified.claims.sub, user.id);
      assert.ok(verified.claims.scopes.includes("profile.basic"));
      assert.ok(!("access_token" in verified.claims));
    }
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("handoff replay is rejected", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie);
    const first = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    assert.equal(first.status, 200);
    const second = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    assert.equal(second.status, 401);
    const body = (await second.json()) as { error: string };
    assert.equal(body.error, "replay_detected");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("wrong audience rejected", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie, "exp_sunrise_hotel");
    const res = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_grand_restaurant" }),
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "wrong_audience");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("revoked session rejected by introspect", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie);
    const exchange = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    const { token } = (await exchange.json()) as { token: string };
    const verified = await verifyExperienceToken({
      token,
      jwksUrl: `${API}/.well-known/experience-keys`,
      expectedAudience: "exp_sunrise_hotel",
    });
    assert.equal(verified.ok, true);
    if (!verified.ok) return;

    const connections = await fetch(`${API}/connections`, { headers: { Cookie: cookie } });
    const list = (await connections.json()) as {
      connections: { id: string; experienceId: string; status: string }[];
    };
    const conn = list.connections.find((c) => c.experienceId === "exp_sunrise_hotel");
    assert.ok(conn);
    await fetch(`${API}/connections/${conn!.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });

    const intro = await fetch(`${API}/experience-sessions/introspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jti: verified.claims.jti }),
    });
    const introBody = (await intro.json()) as { active: boolean };
    assert.equal(introBody.active, false);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("modified payload / wrong key rejected", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie);
    const exchange = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    const { token } = (await exchange.json()) as { token: string };
    const parts = token.split(".");
    const tampered = `${parts[0]}.${parts[1].slice(0, -2)}xx.${parts[2]}`;
    const bad = await verifyExperienceToken({
      token: tampered,
      jwksUrl: `${API}/.well-known/experience-keys`,
      expectedAudience: "exp_sunrise_hotel",
    });
    assert.equal(bad.ok, false);

    const { privateKey } = generateKeyPairSync("ed25519");
    const evil = await new SignJWT({
      iss: EXPERIENCE_TOKEN_ISSUER,
      sub: user.id,
      aud: "exp_sunrise_hotel",
      sid: "x",
      jti: "y",
      experience_id: "exp_sunrise_hotel",
      business_id: "biz",
      scopes: ["wallet.pay"],
    })
      .setProtectedHeader({ alg: "EdDSA", kid: "evil", typ: "JWT" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const wrongKey = await verifyExperienceToken({
      token: evil,
      jwksUrl: `${API}/.well-known/experience-keys`,
      expectedAudience: "exp_sunrise_hotel",
    });
    assert.equal(wrongKey.ok, false);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("missing scope rejected by verifier", async () => {
    const { cookie, user } = await createSessionUser();
    const { session } = await connectAndIssue(cookie);
    const exchange = await fetch(`${API}/experience-sessions/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handoff: session.handoff, experienceId: "exp_sunrise_hotel" }),
    });
    const { token } = (await exchange.json()) as { token: string };
    const verified = await verifyExperienceToken({
      token,
      jwksUrl: `${API}/.well-known/experience-keys`,
      expectedAudience: "exp_sunrise_hotel",
      requiredScopes: ["wallet.pay"],
    });
    assert.equal(verified.ok, false);
    if (!verified.ok) assert.equal(verified.code, "permission_denied");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("bridge rejects unknown origins", () => {
    const accepted: string[] = [];
    const bridge = createExperienceBridge({
      targetOrigin: "http://localhost:5180",
      onMessage() {
        accepted.push("ok");
      },
    });
    assert.equal(bridge.isTrustedOrigin("http://localhost:5180"), true);
    assert.equal(bridge.isTrustedOrigin("https://evil.example"), false);
    bridge.destroy();
  });
});

test("cleanup", async () => {
  await prisma.$disconnect();
});
