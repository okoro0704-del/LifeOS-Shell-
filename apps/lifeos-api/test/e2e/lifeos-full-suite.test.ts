/**
 * Phase F — LifeOS full suite: 6-primitive container + FundzMan pass-through.
 */
import assert from "node:assert/strict";
import http from "node:http";
import test, { describe } from "node:test";
import { LIFEOS_PRIMITIVE_IDS } from "@lifeos/shared";
import {
  assertPrimitivesReady,
  registerPrimitives,
} from "../../src/services/register-primitives.js";
import { RemoteFundzManAdapter } from "../../src/services/remote/remote-fundzman-adapter.js";

function startMockFundzMan(): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    const url = req.url ?? "";
    const send = (code: number, body: unknown) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };

    if (url === "/health") {
      return send(200, { ok: true, service: "fundzman-mock" });
    }

    if (req.method === "POST" && url === "/v1/wallet/pay") {
      let raw = "";
      req.on("data", (c) => {
        raw += c;
      });
      req.on("end", () => {
        const payload = JSON.parse(raw || "{}") as {
          amount?: number;
          currency?: string;
          reference?: string;
        };
        // Domain shells pass reference only — FundzMan must not require hotel fields.
        assert.ok(!("roomId" in payload), "FundzMan must stay domain-agnostic");
        send(200, {
          paymentId: "mock_pay_1",
          status: "authorized",
          amount: payload.amount ?? 0,
          currency: payload.currency ?? "NGN",
          receiptId: "mock_rcpt_1",
          message: "mock pass-through",
        });
      });
      return;
    }

    if (req.method === "POST" && url === "/v1/wallet/bill-pass-through") {
      let raw = "";
      req.on("data", (c) => {
        raw += c;
      });
      req.on("end", () => {
        const payload = JSON.parse(raw || "{}");
        send(200, {
          paymentId: "mock_bill_1",
          status: "settled",
          amount: payload.amount ?? 0,
          currency: payload.currency ?? "NGN",
          receiptId: "mock_bill_rcpt_1",
        });
      });
      return;
    }

    if (req.method === "GET" && url.startsWith("/v1/wallet/") && url.endsWith("/summary")) {
      const userId = decodeURIComponent(url.split("/")[3] ?? "unknown");
      return send(200, {
        userId,
        currency: "NGN",
        available: 1000,
        pending: 0,
        formattedAvailable: "₦1,000",
      });
    }

    send(404, { error: "not_found" });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("no addr");
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((r, j) => {
            server.close((err) => (err ? j(err) : r()));
          }),
      });
    });
  });
}

function startMockEngine(service: string): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((req, res) => {
    if ((req.url ?? "") === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("no addr");
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((r, j) => {
            server.close((err) => (err ? j(err) : r()));
          }),
      });
    });
  });
}

describe("lifeos-full-suite (Phase F — 6 primitives)", () => {
  test("local mode registers all 6 bound primitives", async () => {
    const c = registerPrimitives({ PRIMITIVES_MODE: "local" });
    const ready = await assertPrimitivesReady(c);
    assert.equal(ready.count, 6);
    assert.deepEqual(
      [...ready.ids].sort(),
      [...LIFEOS_PRIMITIVE_IDS].sort(),
    );
    for (const key of [
      "trustId",
      "messaging",
      "storage",
      "jobs",
      "distributor",
      "wallet",
    ] as const) {
      assert.equal(c[key].bound, true);
    }

    const pay = await c.wallet.initiatePayment({
      payerTrustId: "TD-TEST",
      payeeId: "merchant_hos",
      amount: 5000,
      currency: "NGN",
      reference: "hos:booking:demo",
    });
    assert.ok(pay.paymentId);
    assert.equal(pay.currency, "NGN");
  });

  test("remote mode initializes all 6 adapters and routes HospitalityOS payment via FundzMan", async () => {
    const trust = await startMockEngine("trustid-mock");
    const elf = await startMockEngine("elfcom-mock");
    const drive = await startMockEngine("drive-mock");
    const jobs = await startMockEngine("jobs-mock");
    const dist = await startMockEngine("distributor-mock");
    const fundz = await startMockFundzMan();

    try {
      const c = registerPrimitives({
        PRIMITIVES_MODE: "remote",
        TRUSTID_URL: trust.url,
        ELFCOM_URL: elf.url,
        SOVEREIGN_DRIVE_URL: drive.url,
        JOBS_ENGINE_URL: jobs.url,
        DISTRIBUTOR_URL: dist.url,
        FUNDZMAN_URL: fundz.url,
      });

      const ready = await assertPrimitivesReady(c);
      assert.equal(ready.count, 6);

      const healthChecks = await Promise.all([
        c.trustId.health(),
        c.messaging.health(),
        c.storage.health(),
        c.jobs.health(),
        c.distributor.health(),
        c.wallet.health(),
      ]);
      assert.equal(healthChecks.filter((h) => h.ok).length, 6);

      assert.ok(c.wallet instanceof RemoteFundzManAdapter);

      // HospitalityOS-shaped request: only opaque reference — no hotel domain coupling.
      const result = await c.wallet.initiatePayment({
        payerTrustId: "TD-GUEST-1",
        payeeId: "sunrise_hotel",
        amount: 25000,
        currency: "NGN",
        reference: "hospitalityos:booking:bk_demo",
        metadata: { shell: "hospitalityos" },
      });

      assert.equal(result.paymentId, "mock_pay_1");
      assert.equal(result.status, "authorized");
      assert.equal(result.amount, 25000);

      const summary = await c.wallet.getWalletSummary("TD-GUEST-1");
      assert.equal(summary.userId, "TD-GUEST-1");
      assert.equal(summary.available, 1000);
    } finally {
      await Promise.all([
        trust.close(),
        elf.close(),
        drive.close(),
        jobs.close(),
        dist.close(),
        fundz.close(),
      ]);
    }
  });
});
