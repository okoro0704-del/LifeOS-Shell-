import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { classifyIntent } from "../src/command/intent.js";
import {
  actionRequiresConfirmation,
  getAction,
  listActions,
} from "../src/command/action-registry.js";
import { MockAIProvider, setAIProvider, getAIProvider } from "../src/command/ai-provider.js";
import { scoreQuickAccessItem } from "../src/command/quick-access.js";
import { scoreMatch } from "../src/command/search/types.js";
import { buildActionPreview } from "../src/command/command-service.js";
import type { WalletProvider } from "../src/command/wallet-provider.js";

describe("intent classification", () => {
  test("open wallet → SHOW_WALLET", () => {
    const i = classifyIntent("Open my wallet");
    assert.equal(i.kind, "SHOW_WALLET");
    assert.equal(i.suggestedActionId, "OPEN_WALLET");
  });

  test("show bookings → SHOW_BOOKINGS", () => {
    const i = classifyIntent("Show my bookings");
    assert.equal(i.kind, "SHOW_BOOKINGS");
  });

  test("find spa → DISCOVER", () => {
    const i = classifyIntent("Find me a spa tomorrow afternoon");
    assert.equal(i.kind, "DISCOVER");
  });

  test("book massage → BOOK", () => {
    const i = classifyIntent("Book a massage");
    assert.equal(i.kind, "BOOK");
    assert.equal(i.suggestedActionId, "BOOK_SERVICE");
  });

  test("pay hotel bill → PAY", () => {
    const i = classifyIntent("Pay my hotel bill");
    assert.equal(i.kind, "PAY");
  });

  test("entity search → SEARCH", () => {
    const i = classifyIntent("Sunrise Hotel");
    assert.equal(i.kind, "SEARCH");
  });

  test("spend query → WALLET_QUERY", () => {
    const i = classifyIntent("How much did I spend this month?");
    assert.ok(i.kind === "WALLET_QUERY" || i.kind === "SHOW_WALLET");
  });
});

describe("action registry", () => {
  test("lists registered actions", () => {
    assert.ok(listActions().length >= 10);
  });

  test("consequential actions require confirmation", () => {
    assert.equal(actionRequiresConfirmation("BOOK_SERVICE"), true);
    assert.equal(actionRequiresConfirmation("PAY_INVOICE"), true);
    assert.equal(actionRequiresConfirmation("CHECK_IN"), true);
    assert.equal(actionRequiresConfirmation("OPEN_WALLET"), false);
  });

  test("unknown action is undefined", () => {
    assert.equal(getAction("NOT_REAL"), undefined);
  });
});

describe("mock AI provider", () => {
  test("works without external credentials", async () => {
    setAIProvider(new MockAIProvider());
    const ai = getAIProvider();
    const intent = await ai.classifyIntent("Find a gym");
    const message = await ai.generateResponse({ intent, results: [] });
    const plan = await ai.plan({ intent });
    assert.ok(message.length > 0);
    assert.ok(plan.some((s) => s.id === "search"));
    setAIProvider(null);
  });
});

describe("quick access scoring", () => {
  test("pins outrank unpinned", () => {
    const pinned = scoreQuickAccessItem({
      frequency: 1,
      recencyMs: 86400000,
      upcoming: false,
      pinned: true,
      contextual: false,
    });
    const plain = scoreQuickAccessItem({
      frequency: 1,
      recencyMs: 86400000,
      upcoming: false,
      pinned: false,
      contextual: false,
    });
    assert.ok(pinned > plain);
  });
});

describe("search scoring", () => {
  test("exact match scores highest", () => {
    assert.ok(scoreMatch("Sunrise Hotel", "Sunrise Hotel") > scoreMatch("Sunrise Hotel", "Hotel"));
  });
});

describe("action preview + safety", () => {
  test("book preview is structured", () => {
    const preview = buildActionPreview("BOOK_SERVICE", {
      service: "Deep Tissue",
      experienceId: "exp_spa",
      when: "Tomorrow 2pm",
    });
    assert.equal(preview.actionId, "BOOK_SERVICE");
    assert.ok(preview.lines.length >= 2);
    assert.match(preview.confirmLabel, /confirm/i);
  });
});

describe("wallet provider interface", () => {
  test("adapter contract shape", async () => {
    const mock: WalletProvider = {
      async getBalance() {
        return { fiatFormatted: "₦1", tokenFormatted: "10 TOK" };
      },
      async getTransactions() {
        return [];
      },
      async preparePayment(input) {
        return { ...input, currency: "NGN", status: "prepared" };
      },
      async requestPayment(input) {
        assert.equal(input.confirmed, true);
        return { ok: true, message: "ok" };
      },
    };
    const bal = await mock.getBalance("TD");
    assert.ok(bal.fiatFormatted);
    const denied = await mock.requestPayment({
      trustId: "TD",
      merchant: "X",
      amount: 1,
      confirmed: true,
    });
    assert.equal(denied.ok, true);
  });
});
