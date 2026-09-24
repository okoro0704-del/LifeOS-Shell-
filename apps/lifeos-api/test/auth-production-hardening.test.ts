import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { isAuthBypassEnabled } from "../src/lib/config.js";

describe("production authentication hardening", () => {
  test("production ignores an explicitly requested bypass", () => {
    assert.equal(isAuthBypassEnabled({ NODE_ENV: "production", LIFEOS_AUTH_BYPASS: "true" }), false);
  });

  test("missing production bypass configuration remains disabled", () => {
    assert.equal(isAuthBypassEnabled({ NODE_ENV: "production" }), false);
  });

  test("development bypass remains explicit", () => {
    assert.equal(isAuthBypassEnabled({ NODE_ENV: "development", LIFEOS_AUTH_BYPASS: "true" }), true);
    assert.equal(isAuthBypassEnabled({ NODE_ENV: "development" }), false);
  });
});
