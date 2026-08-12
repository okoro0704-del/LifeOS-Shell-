import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { container } from "../src/container.js";

describe("sovereign node container", () => {
  test("boots with unbound DataZone, FinProv, and ElfCom slots", () => {
    const statuses = container.boot();
    assert.equal(statuses.length, 3);
    for (const s of statuses) {
      assert.equal(s.bound, false);
      assert.equal(s.status, "unbound");
      assert.match(s.message, /Module Unbound \/ Awaiting Sovereign Node/);
    }
    assert.equal(container.getDataZone().bound, false);
    assert.equal(container.getFinProvLedger().bound, false);
    assert.equal(container.getElfCom().bound, false);
  });
});
