import assert from "node:assert/strict";
import http from "node:http";
import test, { after, before, describe } from "node:test";

/**
 * Real ingest + feed routes against a disposable Postgres.
 * Run with LIFEOS_PG_TEST_URL=postgresql://... (schema pushed); skipped otherwise.
 */
const PG_URL = process.env.LIFEOS_PG_TEST_URL ?? "";
const SECRET = "test-ingest-secret-0123456789abcdef";
const APP = "mybrandos-ingest-test";
/** Fake mybrandOS public origin for the pull reconciler (fixed port: the origin is read at module load). */
const ORIGIN_PORT = 18799;
const ORIGIN = `http://127.0.0.1:${ORIGIN_PORT}`;
process.env.MYBRANDOS_API_URL = ORIGIN;

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

  test("dedicated credential: distributor secrets, short or missing secrets are refused", async () => {
    const { authorizePublicationIngest } = await import("../src/services/ecosystem-publications.js");
    const header = (v: string) => ({ authorization: `Bearer ${v}` });
    const distributor = "distributor-secret-0123456789abcdef";
    assert.equal(authorizePublicationIngest(header(distributor), { MASTER_DISTRIBUTION_SECRET: distributor }), false);
    assert.equal(authorizePublicationIngest(header(distributor), { DISTRIBUTOR_SECRET: distributor }), false);
    assert.equal(authorizePublicationIngest(header("short"), { LIFEOS_PUBLICATION_INGEST_SECRET: "short" }), false);
    assert.equal(authorizePublicationIngest(header(""), {}), false);
    assert.equal(authorizePublicationIngest({}, { LIFEOS_PUBLICATION_INGEST_SECRET: SECRET }), false);
    assert.equal(authorizePublicationIngest(header(SECRET), { LIFEOS_PUBLICATION_INGEST_SECRET: SECRET }), true);
    // A missing secret is not rescued by the development auth bypass.
    assert.equal(authorizePublicationIngest(header("anything"), { NODE_ENV: "development", LIFEOS_AUTH_BYPASS: "true" }), false);

    const saved = process.env.LIFEOS_PUBLICATION_INGEST_SECRET;
    process.env.MASTER_DISTRIBUTION_SECRET = distributor;
    delete process.env.LIFEOS_PUBLICATION_INGEST_SECRET;
    try {
      assert.equal((await ingest(body("p-auth-2"), distributor)).statusCode, 401);
      assert.equal((await ingest(body("p-auth-2"), SECRET)).statusCode, 401, "missing ingest secret fails closed");
      const reconcile = await app.inject({ method: "POST", url: "/v1/publications/reconcile", headers: { authorization: `Bearer ${distributor}` }, payload: {} });
      assert.equal(reconcile.statusCode, 401);
    } finally {
      process.env.LIFEOS_PUBLICATION_INGEST_SECRET = saved;
      delete process.env.MASTER_DISTRIBUTION_SECRET;
    }
    assert.equal((await rows("p-auth-2")).length, 0);
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

  test("unsequenced (pull reconcile) writes never modify a pushed publication", async () => {
    const { upsertPublicationProjection } = await import("../src/services/ecosystem-publications.js");
    await ingest(body("p-4b", { originSequence: 1, title: "Pushed title" }));
    const pulled = await upsertPublicationProjection({ ...body("p-4b"), title: "Stale page title", originCreatorId: null });
    assert.equal(pulled.stale, true);
    const [row] = await rows("p-4b");
    assert.equal(row.title, "Pushed title");
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

describe("pull reconciler (real reconcile, Postgres, fake mybrandOS origin)", { skip: !PG_URL && "LIFEOS_PG_TEST_URL not set" }, () => {
  type Card = {
    id: string;
    title: string;
    assetType: string;
    presentationTypes: string[];
    coverAvailable: boolean;
    access?: string | null;
    locked?: boolean;
    presentation?: { body?: string };
  };
  let origin: http.Server;
  let mode: "ok" | "gone" | "down" = "ok";
  let cards: Card[] = [];
  let app: import("fastify").FastifyInstance;
  let prisma: typeof import("../src/lib/prisma.js").prisma;
  const SLUG = "pull-creator";

  before(async () => {
    process.env.DATABASE_URL = PG_URL;
    process.env.LIFEOS_PUBLICATION_INGEST_SECRET = SECRET;
    origin = http.createServer((req, res) => {
      if (mode === "down") {
        res.writeHead(502, { "content-type": "text/html" });
        return res.end("<html>bad gateway</html>");
      }
      if (req.url === `/api/public/${SLUG}`) {
        if (mode === "gone") {
          res.writeHead(404, { "content-type": "application/json" });
          return res.end(JSON.stringify({ error: "not_found", message: "This branded experience is not available." }));
        }
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ slug: SLUG, publicEnabled: true, identity: { displayName: "Pull Creator" }, publishedAssets: cards }));
      }
      res.writeHead(200, { "content-type": "image/png" });
      res.end("png");
    });
    await new Promise<void>((resolve) => origin.listen(ORIGIN_PORT, "127.0.0.1", () => resolve()));
    const Fastify = (await import("fastify")).default;
    ({ prisma } = await import("../src/lib/prisma.js"));
    const { publicationRoutes } = await import("../src/routes/publications.js");
    app = Fastify();
    await publicationRoutes(app);
    await app.ready();
    await prisma.publicationProjection.deleteMany({ where: { authorSlug: SLUG } });
    await prisma.publicationSource.deleteMany({ where: { slug: SLUG } });
    // Registered under a preset application id: projections must still use the canonical "mybrandos" id.
    await prisma.publicationSource.create({
      data: {
        applicationId: "mybrandos-preset",
        tenantId: "tenant-pull",
        slug: SLUG,
        displayName: "Pull Creator",
        publicApiBaseUrl: ORIGIN,
        publicDestination: `https://${SLUG}.getlifeos.app/`,
        status: "active",
      },
    });
  });

  after(async () => {
    await prisma.publicationProjection.deleteMany({ where: { authorSlug: SLUG } });
    await prisma.publicationSource.deleteMany({ where: { slug: SLUG } });
    await app.close();
    await new Promise<void>((resolve) => origin.close(() => resolve()));
  });

  const card = (id: string, extra: Partial<Card> = {}): Card => ({
    id,
    title: `Pull ${id}`,
    assetType: "WRITING",
    presentationTypes: ["POST"],
    coverAvailable: false,
    access: "FREE",
    locked: false,
    presentation: { body: `body ${id}` },
    ...extra,
  });
  const reconcile = async () => {
    const res = await app.inject({ method: "POST", url: "/v1/publications/reconcile", headers: { authorization: `Bearer ${SECRET}` }, payload: {} });
    assert.equal(res.statusCode, 200);
    return res.json().report;
  };
  const push = (id: string, extra: Record<string, unknown>) =>
    app.inject({
      method: "POST",
      url: "/v1/publications/ingest",
      headers: { authorization: `Bearer ${SECRET}` },
      payload: {
        originApplicationId: "mybrandos",
        originTenantId: "space-pull",
        originPublicationId: id,
        originCreatorId: "creator-pull",
        publicationType: "POST",
        title: `Pushed ${id}`,
        caption: "pushed",
        authorSlug: SLUG,
        publicDestinationUrl: `https://${SLUG}.getlifeos.app/`,
        publishedAt: new Date().toISOString(),
        ...extra,
      },
    });
  const projections = (id?: string) =>
    prisma.publicationProjection.findMany({ where: { authorSlug: SLUG, ...(id ? { originPublicationId: id } : {}) } });
  const visible = async () =>
    (await prisma.publicationProjection.findMany({ where: { authorSlug: SLUG, hiddenAt: null } })).map((r) => r.originPublicationId).sort();

  test("only explicit, unlocked FREE posts are ingested; paid, locked and unclassified are rejected", async () => {
    cards = [
      card("free-1"),
      card("premium-1", { access: "PREMIUM", locked: true, presentation: { body: "" } }),
      card("vip-1", { access: "VIP", locked: true }),
      card("unclassified-1", { access: undefined, locked: undefined }),
      card("null-access-1", { access: null }),
      card("locked-free-1", { access: "FREE", locked: true }),
    ];
    const report = await reconcile();
    assert.deepEqual(await visible(), ["free-1"]);
    assert.equal(report.ineligible, 5);
    const [row] = await projections("free-1");
    assert.equal(row.originApplicationId, "mybrandos", "canonical application id, so push and pull share one row");
    assert.equal(row.originSequence, null);
  });

  test("a pushed publication is never overwritten by stale public-page data", async () => {
    assert.equal((await push("pushed-1", { originSequence: 1, title: "Fresh push title" })).statusCode, 201);
    cards = [card("free-1"), card("pushed-1", { title: "Stale page title" })];
    const report = await reconcile();
    const [row] = await projections("pushed-1");
    assert.equal(row.title, "Fresh push title");
    assert.equal(row.originSequence, 1);
    assert.equal(report.byApplication.find((r: { slug: string }) => r.slug === SLUG).pushManaged, 1);
  });

  test("a push-revoked publication stays revoked even while a stale public page still lists it", async () => {
    await push("pushed-2", { originSequence: 1 });
    await push("pushed-2", { originSequence: 2, publicationState: "REVOKED", privacy: "PRIVATE" });
    cards = [card("free-1"), card("pushed-1"), card("pushed-2")];
    await reconcile();
    const [row] = await projections("pushed-2");
    assert.ok(row.hiddenAt);
    assert.ok(!(await visible()).includes("pushed-2"));
  });

  test("pull then push of the same post stores one row, then push owns it", async () => {
    cards = [card("free-1"), card("pushed-1"), card("pp-1")];
    await reconcile();
    assert.equal((await projections("pp-1")).length, 1);
    assert.equal((await push("pp-1", { originSequence: 1, title: "Push owns it" })).statusCode, 200);
    const rows = await projections("pp-1");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].originSequence, 1);
    assert.equal(rows[0].title, "Push owns it");
  });

  test("push and pull running concurrently never duplicate and the push wins", async () => {
    for (let i = 0; i < 5; i += 1) {
      const id = `cc-${i}`;
      cards = [card("free-1"), card("pushed-1"), card("pp-1"), card(id, { title: "page title" })];
      await Promise.all([reconcile(), push(id, { originSequence: 1, title: "push title" }), reconcile()]);
      const rows = await projections(id);
      assert.equal(rows.length, 1, id);
      assert.equal(rows[0].originSequence, 1, id);
      assert.equal(rows[0].title, "push title", id);
    }
  });

  test("a post that becomes paid on the origin is taken down by the pull", async () => {
    cards = [card("free-1", { access: "PREMIUM", locked: true })];
    await reconcile();
    assert.ok(!(await visible()).includes("free-1"));
  });

  test("an unreachable origin hides nothing", async () => {
    cards = [card("free-1")];
    await reconcile();
    const before = await visible();
    assert.ok(before.includes("free-1"));
    mode = "down";
    const report = await reconcile();
    assert.ok(report.errors >= 1);
    assert.deepEqual(await visible(), before);
    mode = "ok";
  });

  test("a disabled/suspended public space (origin 404) takes pulled posts down; pushed posts follow their pushes", async () => {
    cards = [card("free-1")];
    await reconcile();
    assert.ok((await visible()).includes("free-1"));
    mode = "gone";
    await reconcile();
    const now = await visible();
    assert.ok(!now.includes("free-1"), "pulled post hidden");
    assert.ok(now.includes("pushed-1"), "pushed post is revoked by its origin's push, not by the pull");
    const source = await prisma.publicationSource.findFirstOrThrow({ where: { slug: SLUG } });
    assert.equal(source.status, "inactive");
    assert.equal(source.lastError, "public_contract_gone");
    // The space comes back: the source reactivates and its FREE posts return.
    mode = "ok";
    await reconcile();
    assert.ok((await visible()).includes("free-1"));
    assert.equal((await prisma.publicationSource.findFirstOrThrow({ where: { slug: SLUG } })).status, "active");
  });
});
