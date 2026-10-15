import assert from "node:assert/strict";
import test, { after, before, describe } from "node:test";

/**
 * Real ingest + feed routes against a disposable Postgres.
 * Run with LIFEOS_PG_TEST_URL=postgresql://... (schema pushed); skipped otherwise.
 */
const PG_URL = process.env.LIFEOS_PG_TEST_URL ?? "";
const SECRET = "test-ingest-secret-0123456789abcdef";
const APP = "mybrandos-ingest-test";

describe("publication ingest (real routes, Postgres)", { skip: !PG_URL && "LIFEOS_PG_TEST_URL not set" }, () => {
  let app: import("fastify").FastifyInstance;
  let prisma: typeof import("../src/lib/prisma.js").prisma;

  before(async () => {
    process.env.DATABASE_URL = PG_URL;
    process.env.LIFEOS_PUBLICATION_INGEST_SECRET = SECRET;
    delete process.env.MASTER_DISTRIBUTION_SECRET;
    delete process.env.DISTRIBUTOR_SECRET;
    const Fastify = (await import("fastify")).default;
    ({ prisma } = await import("../src/lib/prisma.js"));
    const { publicationRoutes } = await import("../src/routes/publications.js");
    app = Fastify();
    await publicationRoutes(app);
    await app.ready();
    await prisma.publicationProjection.deleteMany({ where: { originApplicationId: APP } });
  });

  after(async () => {
    await prisma.publicationProjection.deleteMany({ where: { originApplicationId: APP } });
    await app.close();
    await prisma.$disconnect();
  });

  function body(id: string, extra: Record<string, unknown> = {}) {
    return {
      originApplicationId: APP,
      originTenantId: "space-1",
      originPublicationId: id,
      originCreatorId: "creator-1",
      publicationType: "POST",
      title: `Title ${id}`,
      caption: "caption",
      authorSlug: "ingest-creator",
      publicDestinationUrl: "https://ingest-creator.getlifeos.app/",
      publishedAt: new Date().toISOString(),
      ...extra,
    };
  }

  const ingest = (payload: unknown, secret = SECRET) =>
    app.inject({ method: "POST", url: "/v1/publications/ingest", headers: { authorization: `Bearer ${secret}` }, payload: payload as object });

  async function feedIds(): Promise<string[]> {
    const res = await app.inject({ method: "GET", url: "/v1/publications/feed?limit=100" });
    assert.equal(res.statusCode, 200);
    return (res.json().items as Array<{ originApplicationId: string; originPublicationId: string }>)
      .filter((row) => row.originApplicationId === APP)
      .map((row) => row.originPublicationId);
  }

  const rows = (id: string) => prisma.publicationProjection.findMany({ where: { originApplicationId: APP, originPublicationId: id } });

  test("rejects a wrong secret without writing", async () => {
    const res = await ingest(body("p-auth"), "wrong-secret");
    assert.equal(res.statusCode, 401);
    assert.equal((await rows("p-auth")).length, 0);
  });

  test("first delivery creates (201), redelivery updates (200), one row, visible in feed", async () => {
    const first = await ingest(body("p-1", { originSequence: 1 }));
    assert.equal(first.statusCode, 201);
    assert.equal(first.json().created, true);
    assert.equal(first.json().visible, true);
    const again = await ingest(body("p-1", { originSequence: 1 }));
    assert.equal(again.statusCode, 200);
    assert.equal(again.json().projectionId, first.json().projectionId);
    assert.equal((await rows("p-1")).length, 1);
    assert.ok((await feedIds()).includes("p-1"));
  });

  test("revoke hides; a delayed older publish cannot resurrect it", async () => {
    await ingest(body("p-2", { originSequence: 1 }));
    const revoke = await ingest(body("p-2", { originSequence: 2, publicationState: "REVOKED", privacy: "PRIVATE" }));
    assert.equal(revoke.statusCode, 200);
    assert.equal(revoke.json().visible, false);
    assert.ok(!(await feedIds()).includes("p-2"));
    const delayed = await ingest(body("p-2", { originSequence: 1 }));
    assert.equal(delayed.statusCode, 200);
    assert.equal(delayed.json().stale, true);
    assert.ok(!(await feedIds()).includes("p-2"));
    // A newer publish (republish) is applied.
    const republish = await ingest(body("p-2", { originSequence: 3 }));
    assert.equal(republish.json().visible, true);
    assert.ok((await feedIds()).includes("p-2"));
  });

  test("revoke arriving before its publish leaves a hidden tombstone", async () => {
    const revoke = await ingest(body("p-3", { originSequence: 2, publicationState: "REVOKED", privacy: "PRIVATE" }));
    assert.equal(revoke.statusCode, 201);
    assert.equal(revoke.json().visible, false);
    const late = await ingest(body("p-3", { originSequence: 1 }));
    assert.equal(late.json().stale, true);
    assert.ok(!(await feedIds()).includes("p-3"));
  });

  test("unsequenced (pull reconcile) writes cannot resurrect a sequenced revoke", async () => {
    const { upsertPublicationProjection } = await import("../src/services/ecosystem-publications.js");
    await ingest(body("p-4", { originSequence: 1 }));
    await ingest(body("p-4", { originSequence: 2, publicationState: "REVOKED", privacy: "PRIVATE" }));
    const pulled = await upsertPublicationProjection({ ...body("p-4"), originCreatorId: null });
    assert.equal(pulled.stale, true);
    assert.ok(!(await feedIds()).includes("p-4"));
  });

  test("a publication bound to one creator cannot be claimed by another (409)", async () => {
    await ingest(body("p-5", { originSequence: 1 }));
    const forged = await ingest(body("p-5", { originSequence: 9, originCreatorId: "creator-2", title: "hijack" }));
    assert.equal(forged.statusCode, 409);
    const [row] = await rows("p-5");
    assert.equal(row.title, "Title p-5");
    assert.equal(row.originCreatorId, "creator-1");
  });

  test("concurrent first deliveries store exactly one row", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => ingest(body("p-6", { originSequence: 1 }))));
    for (const res of results) assert.ok(res.statusCode === 200 || res.statusCode === 201, `status ${res.statusCode}`);
    assert.equal(results.filter((res) => res.statusCode === 201).length, 1);
    assert.equal((await rows("p-6")).length, 1);
  });
});
