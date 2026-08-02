import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test, { describe } from "node:test";
import { DEFAULT_PREFERENCES, EXPERIENCE_PERMISSIONS } from "@lifeos/shared";
import { PrismaClient } from "@prisma/client";
import {
  canLoadExperience,
  validateExperienceOrigin,
} from "@lifeos/experience-sdk";
import type { ExperienceRecord } from "@lifeos/shared";

const prisma = new PrismaClient();
const API = "http://127.0.0.1:8790";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createSessionUser() {
  const trustId = `TD-S2${randomBytes(4).toString("hex").toUpperCase()}`;
  const user = await prisma.user.create({
    data: {
      trustId,
      displayName: "Sprint Two",
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

describe("experience permissions & connections", () => {
  test("unapproved permission denied", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/experiences/exp_sunrise_hotel/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ permissions: ["wallet.pay"] }),
    });
    assert.equal(res.status, 403);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "permission_denied");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("approved permission granted and connection listed", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/experiences/exp_sunrise_hotel/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ permissions: ["profile.basic", "notifications"] }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      connectionId: string;
      grantedPermissions: string[];
      session: { sessionId: string; claims: Record<string, unknown> };
    };
    assert.ok(body.connectionId);
    assert.deepEqual(body.grantedPermissions.sort(), ["notifications", "profile.basic"]);
    assert.ok(body.session.sessionId);
    assert.ok(body.session.handoff.startsWith("hof_"));
    assert.ok(body.session.launchUrl.includes("/auth/lifeos"));
    assert.ok(!("claims" in body.session));
    assert.ok(!("token" in body.session));

    const list = await fetch(`${API}/connections`, { headers: { Cookie: cookie } });
    assert.equal(list.status, 200);
    const connections = (await list.json()) as {
      connections: { id: string; status: string; experienceId: string }[];
    };
    const conn = connections.connections.find((c) => c.experienceId === "exp_sunrise_hotel");
    assert.ok(conn);
    assert.equal(conn!.status, "connected");

    const disc = await fetch(`${API}/connections/${conn!.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(disc.status, 200);

    const list2 = await fetch(`${API}/connections`, { headers: { Cookie: cookie } });
    const after = (await list2.json()) as {
      connections: { id: string; status: string; experienceId: string }[];
    };
    const again = after.connections.find((c) => c.id === conn!.id);
    assert.equal(again?.status, "disconnected");

    await prisma.user.delete({ where: { id: user.id } });
  });

  test("permission revocation clears grants", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/experiences/exp_sunrise_hotel/connect`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ permissions: ["profile.basic"] }),
    });
    const body = (await res.json()) as { connectionId: string };
    await fetch(`${API}/connections/${body.connectionId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    const session = await fetch(`${API}/experiences/exp_sunrise_hotel/session`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(session.status, 403);
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("activity & notifications", () => {
  test("activity deep links resolve to experiences", async () => {
    const { cookie, user } = await createSessionUser();
    await prisma.activity.create({
      data: {
        userId: user.id,
        kind: "hotel_booking",
        title: "Booking confirmed",
        detail: "Sunrise Hotel",
        source: "hospitalityos",
        experienceId: "exp_sunrise_hotel",
        deepLink: "/app/discover?open=exp_sunrise_hotel",
      },
    });
    const res = await fetch(`${API}/activity`, { headers: { Cookie: cookie } });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      activities: { deepLink?: string; experienceId?: string; source: string }[];
    };
    const hit = body.activities.find((a) => a.experienceId === "exp_sunrise_hotel");
    assert.ok(hit);
    assert.equal(hit!.deepLink, "/app/discover?open=exp_sunrise_hotel");
    assert.equal(hit!.source, "hospitalityos");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("notification mark read and read-all", async () => {
    const { cookie, user } = await createSessionUser();
    const n = await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Test",
        body: "Body",
        source: "lifeos",
        category: "System",
        read: false,
      },
    });
    const before = await fetch(`${API}/notifications`, { headers: { Cookie: cookie } });
    const beforeBody = (await before.json()) as { unreadCount: number };
    assert.ok(beforeBody.unreadCount >= 1);

    const mark = await fetch(`${API}/notifications/${n.id}/read`, {
      method: "PATCH",
      headers: { Cookie: cookie },
    });
    assert.equal(mark.status, 200);

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Another",
        body: "x",
        source: "lifeos",
        category: "Wallet",
        read: false,
      },
    });
    const all = await fetch(`${API}/notifications/read-all`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    assert.equal(all.status, 200);
    const after = await fetch(`${API}/notifications`, { headers: { Cookie: cookie } });
    const afterBody = (await after.json()) as { unreadCount: number };
    assert.equal(afterBody.unreadCount, 0);
    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("preferences isolation", () => {
  test("preferences belong to current user only", async () => {
    const a = await createSessionUser();
    const b = await createSessionUser();
    const patch = await fetch(`${API}/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: a.cookie },
      body: JSON.stringify({ language: "fr", marketingTips: true }),
    });
    assert.equal(patch.status, 200);
    const aPrefs = (await (await fetch(`${API}/preferences`, { headers: { Cookie: a.cookie } })).json()) as {
      preferences: { language: string; marketingTips: boolean };
    };
    const bPrefs = (await (await fetch(`${API}/preferences`, { headers: { Cookie: b.cookie } })).json()) as {
      preferences: { language: string; marketingTips: boolean };
    };
    assert.equal(aPrefs.preferences.language, "fr");
    assert.equal(aPrefs.preferences.marketingTips, true);
    assert.equal(bPrefs.preferences.language, "en");
    assert.equal(bPrefs.preferences.marketingTips, false);
    await prisma.user.delete({ where: { id: a.user.id } });
    await prisma.user.delete({ where: { id: b.user.id } });
  });
});

describe("auth & registry still hold", () => {
  test("protected routes reject unauthenticated", async () => {
    const res = await fetch(`${API}/connections`);
    assert.equal(res.status, 401);
  });

  test("invalid origin rejected", () => {
    const check = validateExperienceOrigin("https://evil.test", "http://localhost:5180");
    assert.equal(check.ok, false);
  });

  test("registered experience loadable", () => {
    const record: ExperienceRecord = {
      id: "x",
      businessId: "b",
      businessName: "B",
      osType: "hospitality",
      category: "Hotels",
      experienceType: "web",
      experienceUrl: "http://localhost:5180/",
      approvedOrigin: "http://localhost:5180",
      displayName: "B",
      description: "d",
      status: "active",
      version: "1",
      permissions: ["profile.basic"],
    };
    assert.equal(canLoadExperience(record), true);
  });

  test("permission catalog is explicit", () => {
    assert.ok(EXPERIENCE_PERMISSIONS.includes("profile.basic"));
    assert.ok(EXPERIENCE_PERMISSIONS.includes("notifications"));
  });
});

test("cleanup", async () => {
  await prisma.$disconnect();
});
