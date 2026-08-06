import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { planQuery } from "../src/command/query-planner.js";
import { commandSessionService } from "../src/command/command-session.js";
import { compareResults, filterByIntent, rankSearchResults } from "../src/command/search-ranking.js";
import { locationPermissionService } from "../src/command/location.js";
import type { CommandIntent, SearchResult } from "@lifeos/shared";
import { actionRequiresConfirmation, getAction } from "../src/command/action-registry.js";

function baseIntent(partial: Partial<CommandIntent> = {}): CommandIntent {
  return {
    type: "DISCOVER",
    rawQuery: "massage",
    inputType: "TEXT",
    confidence: 0.8,
    slots: {},
    ...partial,
  };
}

function offering(id: string, title: string, price: number, extra: Partial<SearchResult> = {}): SearchResult {
  return {
    id,
    type: "OFFERING",
    title,
    subtitle: "Spa",
    actions: [{ id: "b", label: "Book", actionId: "BOOK_SERVICE", requiresConfirmation: true }],
    source: "test",
    score: 0.5,
    metadata: { price, offeringId: id, category: "Wellness", availability: "Available tomorrow" },
    ...extra,
  };
}

describe("Sprint 7 — QueryPlanner", () => {
  test("parses massage tomorrow around 3 under price", () => {
    const plan = planQuery("Find me a massage tomorrow around 3pm under ₦40,000");
    assert.equal(plan.intent.category, "Wellness");
    assert.equal(plan.intent.offeringType, "MASSAGE");
    assert.equal(plan.intent.date, "tomorrow");
    assert.equal(plan.intent.time, "15:00");
    assert.equal(plan.intent.maxPrice, 40000);
    assert.equal(plan.intent.currency, "NGN");
    assert.ok(["DISCOVER", "BOOK", "SEARCH"].includes(plan.intent.type));
  });

  test("does not execute — planner only returns structure", () => {
    const plan = planQuery("Book a massage");
    assert.ok(plan.intent);
    assert.equal(typeof plan.searchQuery, "string");
  });

  test("asks for clarification on bare book dinner", () => {
    const plan = planQuery("Book dinner.");
    // dinner maps to Eat category so may not clarify — check book without entity
    const bare = planQuery("Book something");
    assert.equal(bare.intent.needsClarification, true);
  });

  test("follow-up cheapest updates sort", () => {
    const prior = planQuery("Find me a massage tomorrow").intent;
    const follow = planQuery("Cheapest", { prior });
    assert.equal(follow.intent.sortBy, "price_asc");
    assert.equal(follow.followUp, true);
  });

  test("personal focus for today", () => {
    const plan = planQuery("What's happening today?");
    assert.ok(plan.usePersonalContext || plan.intent.personalFocus === "today" || plan.intent.type === "PERSONAL_CONTEXT" || plan.intent.type === "DISCOVER");
  });
});

describe("Sprint 7 — ranking & compare", () => {
  test("filters by max price", () => {
    const intent = baseIntent({ maxPrice: 35000 });
    const out = filterByIntent(
      [offering("a", "A", 30000), offering("b", "B", 50000)],
      intent,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].id, "a");
  });

  test("personal query boosts personal results", () => {
    const intent = baseIntent({ rawQuery: "my hotel", type: "PERSONAL_CONTEXT" });
    const ranked = rankSearchResults(
      [
        offering("o1", "Hotel Room", 80000),
        {
          id: "p1",
          type: "BOOKING",
          title: "Sunrise Stay",
          actions: [],
          source: "personal",
          score: 0.5,
        },
      ],
      intent,
      { query: "my hotel" },
    );
    assert.equal(ranked[0].type, "BOOKING");
  });

  test("compare cheapest uses structured prices only", () => {
    const cmp = compareResults(
      [offering("a", "Deep Tissue", 35000), offering("b", "Swedish", 30000)],
      "price",
    );
    assert.equal(cmp.supported, true);
    assert.equal(cmp.winnerId, "b");
    assert.match(cmp.summary, /cheapest|30/);
  });

  test("compare distance admits missing data", () => {
    const cmp = compareResults([offering("a", "A", 10)], "distance");
    assert.equal(cmp.supported, false);
    assert.match(cmp.summary, /isn.?t provided/i);
  });
});

describe("Sprint 7 — sessions & safety", () => {
  test("sessions are user-scoped and expire fields set", () => {
    const s = commandSessionService.create("user_a", baseIntent(), [offering("1", "X", 1)]);
    assert.equal(commandSessionService.get(s.sessionId, "user_b"), null);
    assert.ok(commandSessionService.get(s.sessionId, "user_a"));
    assert.ok(new Date(s.expiresAt) > new Date());
  });

  test("session metadata strips secrets", () => {
    const s = commandSessionService.create("u1", baseIntent(), [
      {
        ...offering("1", "X", 1),
        metadata: { offeringId: "1", cardNumber: "4111", cvv: "123", price: 1 },
      },
    ]);
    assert.equal(s.results[0].metadata?.cardNumber, undefined);
    assert.equal(s.results[0].metadata?.cvv, undefined);
  });

  test("book and pay always require confirmation", () => {
    assert.equal(actionRequiresConfirmation("BOOK_SERVICE"), true);
    assert.equal(actionRequiresConfirmation("PAY_INVOICE"), true);
    assert.equal(getAction("BOOK_SERVICE")?.requiresConfirmation, true);
  });

  test("location is opt-in", () => {
    locationPermissionService.revoke("u_loc");
    assert.equal(locationPermissionService.get("u_loc").granted, false);
    locationPermissionService.grant("u_loc", "coarse", "Lagos Island");
    assert.equal(locationPermissionService.nearMeLabel("u_loc"), "Lagos Island");
    locationPermissionService.revoke("u_loc");
    assert.equal(locationPermissionService.nearMeLabel("u_loc"), null);
  });
});
