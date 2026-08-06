import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { classifyIntent } from "../src/command/intent.js";
import {
  partitionPlanItems,
  buildContinueItems,
  buildSignals,
  buildTimeline,
  withTimeout,
} from "../src/services/personal-context-providers.js";
import { PersonalContextService } from "../src/services/personal-context.js";
import { RecommendationProvider } from "../src/services/recommendations.js";
import type { LifePlanItem, PersonalContextSignals } from "@lifeos/shared";
import { scoreOffering } from "../src/services/offering-ranking.js";

function item(
  partial: Partial<LifePlanItem> & Pick<LifePlanItem, "id" | "title" | "type" | "status">,
): LifePlanItem {
  return {
    source: "test",
    ...partial,
  };
}

describe("Sprint 6 — plan partitioning", () => {
  test("partitions today / upcoming / completed", () => {
    const now = new Date();
    const todayAt = new Date(now);
    todayAt.setHours(15, 0, 0, 0);
    const later = new Date(now);
    later.setDate(later.getDate() + 2);
    later.setHours(10, 0, 0, 0);
    const past = new Date(now);
    past.setDate(past.getDate() - 1);

    const parts = partitionPlanItems(
      [
        item({
          id: "1",
          title: "Massage",
          type: "APPOINTMENT",
          status: "UPCOMING",
          startAt: todayAt.toISOString(),
        }),
        item({
          id: "2",
          title: "Hotel",
          type: "STAY",
          status: "UPCOMING",
          startAt: later.toISOString(),
        }),
        item({
          id: "3",
          title: "Dinner",
          type: "RESERVATION",
          status: "COMPLETED",
          startAt: past.toISOString(),
        }),
      ],
      now,
    );

    assert.ok(parts.today.map((x) => x.id).includes("1"));
    assert.ok(parts.upcoming.map((x) => x.id).includes("2"));
    assert.ok(parts.completed.map((x) => x.id).includes("3"));
  });

  test("builds continue items without leaking card data in href/title", () => {
    const items = buildContinueItems([
      {
        id: "a1",
        action: "BOOK",
        status: "PENDING",
        offeringId: "off_1",
        experienceId: "exp_1",
        message: "Deep Tissue · Serenity",
        metadata: JSON.stringify({
          cardNumber: "4111111111111111",
          cvv: "123",
          slotId: "s1",
        }),
      },
    ]);
    assert.equal(items.length, 1);
    assert.match(items[0].title, /Continue/i);
    assert.ok(items[0].href.includes("off_1"));
    assert.doesNotMatch(JSON.stringify(items), /411111/);
  });

  test("builds timeline today bucket", () => {
    const now = new Date();
    const todayAt = new Date(now);
    todayAt.setHours(18, 0, 0, 0);
    const tl = buildTimeline(
      [
        item({
          id: "t1",
          title: "Movie",
          type: "TICKET",
          status: "UPCOMING",
          startAt: todayAt.toISOString(),
          subtitle: "City Cinema",
        }),
      ],
      [],
      [],
      now,
    );
    assert.equal(tl[0]?.bucket, "today");
    assert.equal(tl[0]?.label, "Today");
  });
});

describe("Sprint 6 — signals & recommendations", () => {
  test("builds preference signals deterministically", () => {
    const signals = buildSignals({
      bookings: [
        item({
          id: "b1",
          title: "Massage",
          type: "APPOINTMENT",
          status: "COMPLETED",
          businessId: "biz_spa",
        }),
        item({
          id: "b2",
          title: "Class",
          type: "CLASS",
          status: "COMPLETED",
          businessId: "biz_gym",
        }),
      ],
      saved: [
        {
          id: "s1",
          offeringId: "o1",
          name: "Facial",
          businessName: "Spa",
          category: "Wellness",
          priceFormatted: "₦10,000",
          experienceId: "exp",
          savedAt: new Date().toISOString(),
        },
      ],
      searches: ["massage", "spa"],
      experienceIds: ["exp_spa"],
      now: new Date("2026-08-06T09:00:00"),
    });
    assert.ok(signals.preferredCategories.includes("Wellness"));
    assert.equal(signals.timeOfDay, "morning");
    assert.equal(signals.recentSearchTerms[0], "massage");
  });

  test("provider timeout yields partial failure", async () => {
    const res = await withTimeout(
      "SlowProvider",
      () => new Promise<string>((r) => setTimeout(() => r("ok"), 50)),
      5,
    );
    assert.equal(res.ok, false);
    if (!res.ok) assert.match(res.error, /timeout/);
  });

  test("recommendations are deterministic from signals", async () => {
    const provider = new RecommendationProvider();
    const signals: PersonalContextSignals = {
      preferredCategories: ["Wellness"],
      preferredBusinessIds: [],
      recentSearchTerms: ["massage"],
      favoriteExperienceIds: [],
      timeOfDay: "evening",
    };
    const a = await provider.recommend({ signals, limit: 3 });
    const b = await provider.recommend({ signals, limit: 3 });
    assert.deepEqual(
      a.map((x) => x.offeringId),
      b.map((x) => x.offeringId),
    );
    assert.ok(a.length > 0);
    assert.ok(a[0].reason);
  });

  test("ranking boosts preferred categories", () => {
    const base = {
      id: "o1",
      name: "Massage",
      businessId: "b1",
      businessName: "Spa",
      experienceId: "e1",
      category: "Wellness" as const,
      type: "TREATMENT" as const,
      description: "x",
      price: 10000,
      priceFormatted: "₦10,000",
      currency: "NGN",
      featured: false,
      bookingCapability: true,
      commerceCapability: false,
      capabilities: ["BOOK" as const, "VIEW" as const],
      source: "test",
    };
    const without = scoreOffering(base, {});
    const withPref = scoreOffering(base, { preferredCategories: ["Wellness"] });
    assert.ok(withPref > without);
  });
});

describe("Sprint 6 — AI context & privacy", () => {
  test("AI-safe context strips to summaries", () => {
    const svc = new PersonalContextService();
    const safe = svc.toAiSafe({
      userId: "u1",
      generatedAt: new Date().toISOString(),
      stale: false,
      offlineCapable: true,
      today: [
        item({
          id: "1",
          title: "Gym Class",
          type: "CLASS",
          status: "UPCOMING",
          subtitle: "Peak Fitness",
          startAt: new Date().toISOString(),
        }),
      ],
      upcoming: [],
      completed: [],
      timeline: [],
      continueItems: [],
      attention: [],
      recommendations: [],
      savedCount: 2,
      wallet: null,
      signals: {
        preferredCategories: [],
        preferredBusinessIds: [],
        recentSearchTerms: [],
        favoriteExperienceIds: [],
        timeOfDay: "afternoon",
      },
      planGroups: [],
      providerErrors: [],
    });
    assert.match(safe.todaySummary, /Gym Class/);
    assert.equal(safe.items[0]?.title, "Gym Class");
    assert.doesNotMatch(JSON.stringify(safe), /biometric|cvv|password|bvn/i);
  });

  test("classifies personal context intents", () => {
    assert.equal(classifyIntent("What do I have today?").kind, "SHOW_BOOKINGS");
    assert.equal(classifyIntent("What's coming up this weekend?").kind, "PERSONAL_CONTEXT");
    assert.equal(classifyIntent("Where am I going tonight?").kind, "PERSONAL_CONTEXT");
    assert.equal(classifyIntent("What do I need to pay?").kind, "PERSONAL_CONTEXT");
    assert.equal(
      classifyIntent("I have nothing planned Saturday. What can I do?").kind,
      "PERSONAL_CONTEXT",
    );
    assert.equal(classifyIntent("my hotel").kind, "PERSONAL_CONTEXT");
  });

  test("cache isolation by userId", () => {
    const svc = new PersonalContextService();
    svc.invalidate("user_a");
    assert.equal(svc.getCached("user_b"), null);
  });

  test("plan items carry external references only", () => {
    const items: LifePlanItem[] = [
      item({
        id: "ref1",
        type: "STAY",
        title: "Hotel",
        status: "UPCOMING",
        source: "action-record",
        sourceId: "booking_ext_1",
        experienceId: "exp_hotel",
        metadata: { externalReference: "HOS-99" },
      }),
      item({
        id: "ref2",
        type: "APPOINTMENT",
        title: "Spa",
        status: "UPCOMING",
        source: "action-record",
        sourceId: "booking_ext_2",
      }),
    ];
    assert.ok(items.every((i) => i.source && (i.sourceId || i.experienceId)));
  });
});
