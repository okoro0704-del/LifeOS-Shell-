import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test, { describe } from "node:test";
import { DEFAULT_PREFERENCES } from "@lifeos/shared";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API = "http://127.0.0.1:8790";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createSessionUser() {
  const trustId = `TD-S4${randomBytes(4).toString("hex").toUpperCase()}`;
  const user = await prisma.user.create({
    data: {
      trustId,
      displayName: "Sprint Four",
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

describe("sprint 4 command layer API", () => {
  test("universal search returns typed results", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/search?q=${encodeURIComponent("wallet")}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      results: Array<{ type: string; title: string; actions: unknown[] }>;
      businesses: unknown[];
    };
    assert.ok(Array.isArray(body.results));
    assert.ok(body.results.length >= 1);
    assert.ok(body.results.every((r) => r.type && r.title && Array.isArray(r.actions)));
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("no-result search is empty not error", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/search?q=${encodeURIComponent("zzzxxyynonexistent999")}`, {
      headers: { Cookie: cookie },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { results: unknown[] };
    assert.equal(body.results.length, 0);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("command routing open wallet navigates", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ text: "Open my wallet" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { type: string; path?: string; intent: { kind: string } };
    assert.equal(body.type, "navigate");
    assert.equal(body.path, "/app/wallet");
    assert.equal(body.intent.kind, "SHOW_WALLET");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("book command returns preview not execute", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ text: "Book a massage" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { type: string; preview?: { actionId: string } };
    assert.equal(body.type, "preview");
    assert.equal(body.preview?.actionId, "BOOK_SERVICE");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("action execute without confirm returns preview for PAY", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/actions/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        actionId: "PAY_INVOICE",
        params: { merchant: "Sunrise Hotel", amount: 50 },
        confirmed: false,
      }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { type: string };
    assert.equal(body.type, "preview");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("quick access pin/unpin/reorder", async () => {
    const { cookie, user } = await createSessionUser();
    const list = await fetch(`${API}/quick-access`, { headers: { Cookie: cookie } });
    assert.equal(list.status, 200);
    const items = ((await list.json()) as { items: Array<{ id: string }> }).items;
    assert.ok(items.length >= 1);
    const id = items[0].id;

    const pin = await fetch(`${API}/quick-access/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id }),
    });
    assert.equal(pin.status, 200);

    const reorder = await fetch(`${API}/quick-access/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ order: [id] }),
    });
    assert.equal(reorder.status, 200);

    const unpin = await fetch(`${API}/quick-access/unpin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ id }),
    });
    assert.equal(unpin.status, 200);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("recent commands and clear", async () => {
    const { cookie, user } = await createSessionUser();
    await fetch(`${API}/commands`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ text: "Show my activity" }),
    });
    const recent = await fetch(`${API}/commands/recent`, { headers: { Cookie: cookie } });
    assert.equal(recent.status, 200);
    const body = (await recent.json()) as { items: unknown[] };
    assert.ok(body.items.length >= 1);
    const cleared = await fetch(`${API}/commands/recent`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    assert.equal(cleared.status, 200);
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("ai intent endpoint", async () => {
    const { cookie, user } = await createSessionUser();
    const res = await fetch(`${API}/ai/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ text: "Find restaurants near me" }),
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { intent: { kind: string } };
    assert.equal(body.intent.kind, "DISCOVER");
    await prisma.user.delete({ where: { id: user.id } });
  });

  test("search is user-scoped (tenant isolation)", async () => {
    const a = await createSessionUser();
    const b = await createSessionUser();
    await prisma.activity.create({
      data: {
        userId: a.user.id,
        kind: "hotel_booking",
        title: "Secret Private Booking Alpha",
        detail: "private-only-a",
        source: "test",
        experienceId: null,
      },
    });
    const res = await fetch(
      `${API}/search?q=${encodeURIComponent("Secret Private Booking Alpha")}`,
      { headers: { Cookie: b.cookie } },
    );
    assert.equal(res.status, 200);
    const body = (await res.json()) as { results: Array<{ title: string }> };
    assert.ok(!body.results.some((r) => r.title.includes("Secret Private Booking Alpha")));
    await prisma.user.delete({ where: { id: a.user.id } });
    await prisma.user.delete({ where: { id: b.user.id } });
  });
});
