import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test, { describe } from "node:test";
import {
  canLoadExperience,
  validateExperienceOrigin,
} from "@lifeos/experience-sdk";
import type { ExperienceRecord } from "@lifeos/shared";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_PREFERENCES } from "@lifeos/shared";

const prisma = new PrismaClient();

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("authentication & user model", () => {
  test("unauthenticated request to protected route is rejected", async () => {
    const res = await fetch("http://127.0.0.1:8790/me");
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: string };
    assert.ok(body.error === "unauthorized" || body.error === "session_expired");
  });

  test("invalid TrustID token cannot create a LifeOS session", async () => {
    const res = await fetch("http://127.0.0.1:8790/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: "not-a-real-token-xxxxxxxxxxxx" }),
    });
    assert.ok(res.status === 401 || res.status === 503);
    const body = (await res.json()) as { error: string };
    assert.ok(
      ["invalid_token", "authorization_revoked", "trustid_unavailable"].includes(body.error),
    );
  });

  test("same TrustID cannot create multiple LifeOS consumer users", async () => {
    const trustId = `TD-TEST${randomBytes(4).toString("hex").toUpperCase()}`;
    const first = await prisma.user.create({
      data: {
        trustId,
        displayName: "Test User",
        preferences: JSON.stringify(DEFAULT_PREFERENCES),
      },
    });
    await assert.rejects(
      () =>
        prisma.user.create({
          data: {
            trustId,
            displayName: "Duplicate",
            preferences: JSON.stringify(DEFAULT_PREFERENCES),
          },
        }),
    );
    const count = await prisma.user.count({ where: { trustId } });
    assert.equal(count, 1);
    await prisma.user.delete({ where: { id: first.id } });
  });

  test("logout invalidates the LifeOS session", async () => {
    const trustId = `TD-SESS${randomBytes(4).toString("hex").toUpperCase()}`;
    const user = await prisma.user.create({
      data: {
        trustId,
        displayName: "Session User",
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

    const meBefore = await fetch("http://127.0.0.1:8790/me", {
      headers: { Cookie: `lifeos_session=${raw}` },
    });
    assert.equal(meBefore.status, 200);

    const logout = await fetch("http://127.0.0.1:8790/auth/logout", {
      method: "POST",
      headers: { Cookie: `lifeos_session=${raw}` },
    });
    assert.equal(logout.status, 200);

    const meAfter = await fetch("http://127.0.0.1:8790/me", {
      headers: { Cookie: `lifeos_session=${raw}` },
    });
    assert.equal(meAfter.status, 401);

    await prisma.user.delete({ where: { id: user.id } });
  });

  test("expired session is reported as session_expired", async () => {
    const trustId = `TD-EXP${randomBytes(4).toString("hex").toUpperCase()}`;
    const user = await prisma.user.create({
      data: {
        trustId,
        displayName: "Expired User",
        preferences: JSON.stringify(DEFAULT_PREFERENCES),
      },
    });
    const raw = randomBytes(24).toString("base64url");
    await prisma.session.create({
      data: {
        tokenHash: hash(raw),
        userId: user.id,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    const res = await fetch("http://127.0.0.1:8790/me", {
      headers: { Cookie: `lifeos_session=${raw}` },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { error: string };
    assert.equal(body.error, "session_expired");

    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("wallet provider abstraction", () => {
  test("unbound FinProv ledger refuses mock settlement", async () => {
    const {
      UnboundTokenNetworkProvider,
      FinProvUnboundError,
      createTokenNetworkProvider,
    } = await import("@lifeos/token-network");
    const provider = createTokenNetworkProvider("unbound");
    assert.ok(provider instanceof UnboundTokenNetworkProvider);
    await assert.rejects(() => provider.getBalance("TD-WALLETTEST01"), (err: unknown) => {
      assert.ok(err instanceof FinProvUnboundError);
      return true;
    });
  });
});

describe("experience registry security", () => {
  const base: ExperienceRecord = {
    id: "exp_test",
    businessId: "biz_test",
    businessName: "Test Hotel",
    osType: "hospitality",
    category: "Hotels",
    experienceUrl: "http://localhost:5180/",
    approvedOrigin: "http://localhost:5180",
    displayName: "Test Hotel",
    description: "test",
    status: "active",
    permissions: [],
  };

  test("registered matching origin is allowed", () => {
    const check = validateExperienceOrigin(base.experienceUrl, base.approvedOrigin);
    assert.equal(check.ok, true);
    assert.equal(canLoadExperience(base), true);
  });

  test("invalid origin is rejected", () => {
    const check = validateExperienceOrigin(
      "http://evil.example/",
      "http://localhost:5180",
    );
    assert.equal(check.ok, false);
  });

  test("unregistered/mismatched experience cannot load", () => {
    const bad: ExperienceRecord = {
      ...base,
      experienceUrl: "https://unapproved.example/app",
      approvedOrigin: "http://localhost:5180",
    };
    assert.equal(canLoadExperience(bad), false);
  });

  test("inactive experience is rejected", () => {
    assert.equal(canLoadExperience({ ...base, status: "inactive" }), false);
  });

  test("API rejects unknown experience id", async () => {
    const trustId = `TD-EXPAPI${randomBytes(3).toString("hex").toUpperCase()}`;
    const user = await prisma.user.create({
      data: {
        trustId,
        displayName: "Exp User",
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

    const res = await fetch("http://127.0.0.1:8790/experiences/does-not-exist", {
      headers: { Cookie: `lifeos_session=${raw}` },
    });
    assert.equal(res.status, 404);

    await prisma.user.delete({ where: { id: user.id } });
  });
});

describe("data separation", () => {
  test("LifeOS schema has no hospitality domain tables", async () => {
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
    );
    const names = rows.map((r) => r.name.toLowerCase());
    assert.ok(names.includes("user"));
    assert.ok(names.includes("experience"));
    assert.ok(!names.includes("hotel_reservations"));
    assert.ok(!names.includes("reservation"));
    assert.ok(!names.includes("room"));
    assert.ok(!names.includes("order"));
  });

  test("seeded experiences point at independent HospitalityOS origin", async () => {
    const exp = await prisma.experience.findFirst({
      where: { id: "exp_sunrise_hotel" },
    });
    assert.ok(exp);
    assert.equal(exp!.approvedOrigin, "http://localhost:5180");
    assert.ok(exp!.experienceUrl.startsWith("http://localhost:5180"));
  });
});

test("cleanup prisma", async () => {
  await prisma.$disconnect();
});
