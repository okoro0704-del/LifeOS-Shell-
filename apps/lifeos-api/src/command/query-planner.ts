import type {
  CommandIntent,
  CommandIntentType,
  CommandInputType,
  QueryPlan,
} from "@lifeos/shared";
import { classifyIntent } from "./intent.js";

function parsePrice(q: string): { maxPrice?: number; minPrice?: number; currency?: string } {
  const under = q.match(/\b(?:under|below|max|less than)\s*₦?\s*([\d,]+)/i);
  const above = q.match(/\b(?:over|above|at least|more than)\s*₦?\s*([\d,]+)/i);
  const naira = q.match(/₦\s*([\d,]+)/);
  const maxPrice = under
    ? Number(under[1].replace(/,/g, ""))
    : naira && /\b(under|below|max|cheapest|budget)/i.test(q)
      ? Number(naira[1].replace(/,/g, ""))
      : undefined;
  const minPrice = above ? Number(above[1].replace(/,/g, "")) : undefined;
  if (maxPrice != null || minPrice != null || /₦|ngn|naira/i.test(q)) {
    return { maxPrice, minPrice, currency: "NGN" };
  }
  return {};
}

function parseTime(q: string): {
  date?: string;
  time?: string;
  timeAfter?: string;
  timeBefore?: string;
} {
  let date: string | undefined;
  if (/\btomorrow\b/i.test(q)) date = "tomorrow";
  else if (/\btoday\b/i.test(q)) date = "today";
  else if (/\bthis weekend\b/i.test(q)) date = "weekend";
  else if (/\bsaturday\b/i.test(q)) date = "saturday";
  else if (/\bsunday\b/i.test(q)) date = "sunday";

  const around = q.match(/\baround\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const after = q.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  const before = q.match(/\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  const to24 = (h: string, m: string | undefined, ap?: string) => {
    let hour = Number(h);
    const min = m ?? "00";
    const suffix = (ap ?? "").toLowerCase();
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
    if (!suffix && hour <= 7) hour += 12; // "after 5" → evening default
    return `${String(hour).padStart(2, "0")}:${min}`;
  };

  let time: string | undefined;
  let timeAfter: string | undefined;
  let timeBefore: string | undefined;
  if (around) time = to24(around[1], around[2], around[3]);
  if (after) timeAfter = to24(after[1], after[2], after[3]);
  if (before) timeBefore = to24(before[1], before[2], before[3]);
  if (/\bafter work\b|\bevening\b/i.test(q)) timeAfter = timeAfter ?? "17:00";
  if (/\btonight\b/i.test(q)) {
    date = date ?? "today";
    timeAfter = timeAfter ?? "17:00";
  }
  if (/\bafternoon\b/i.test(q)) timeAfter = timeAfter ?? "12:00";

  return { date, time, timeAfter, timeBefore };
}

function parseCategory(q: string): { category?: string; offeringType?: string } {
  if (/\bmassage|spa|facial|wellness|relax/i.test(q)) {
    return { category: "Wellness", offeringType: "MASSAGE" };
  }
  if (/\bgym|fitness|class|training/i.test(q)) {
    return { category: "Fitness", offeringType: "CLASS" };
  }
  if (/\bhotel|room|stay|suite/i.test(q)) {
    return { category: "Stay", offeringType: "ROOM" };
  }
  if (/\bcinema|movie|ticket|showtime/i.test(q)) {
    return { category: "Cinema", offeringType: "TICKET" };
  }
  if (/\brestaurant|dinner|lunch|table|eat|food/i.test(q)) {
    return { category: "Eat", offeringType: "MEAL" };
  }
  if (/\bevent|concert/i.test(q)) {
    return { category: "Events", offeringType: "EVENT" };
  }
  return {};
}

function parseLocation(q: string): CommandIntent["locationMode"] {
  if (/\bnear me\b|\bnearby\b|\bclose by\b/i.test(q)) return "near_me";
  if (/\bnear (the )?hotel\b/i.test(q)) return "near_hotel";
  if (/\bnear (the )?cinema\b/i.test(q)) return "near_cinema";
  if (/\bnear (the )?gym\b/i.test(q)) return "near_gym";
  return "none";
}

function mapLegacyToType(kind: string): CommandIntentType {
  switch (kind) {
    case "DISCOVER":
      return "DISCOVER";
    case "SEARCH":
      return "SEARCH";
    case "BOOK":
      return "BOOK";
    case "PAY":
      return "PAY";
    case "PERSONAL_CONTEXT":
    case "SHOW_BOOKINGS":
    case "SHOW_ACTIVITY":
      return "PERSONAL_CONTEXT";
    case "SHOW_WALLET":
    case "WALLET_QUERY":
      return "VIEW";
    case "NAVIGATE":
      return "NAVIGATE";
    case "COMPARE":
      return "COMPARE";
    case "PLAN":
      return "PLAN";
    case "RECOMMEND":
      return "RECOMMEND";
    case "RESERVE":
      return "RESERVE";
    case "BUY":
      return "BUY";
    case "CANCEL":
      return "CANCEL";
    default:
      return "UNKNOWN";
  }
}

/**
 * QueryPlanner — deterministic structured understanding.
 * Does NOT execute actions. Does NOT invent preferences.
 */
export function planQuery(
  raw: string,
  opts?: { inputType?: CommandInputType; prior?: CommandIntent | null },
): QueryPlan {
  const query = raw.replace(/\s+/g, " ").trim().slice(0, 200);
  const inputType = opts?.inputType ?? "TEXT";
  const legacy = classifyIntent(query);
  const price = parsePrice(query);
  const when = parseTime(query);
  const cat = parseCategory(query);
  const locationMode = parseLocation(query);

  let type = mapLegacyToType(legacy.kind);

  if (/\bcompare\b|\bwhich is (cheaper|closest|best)\b|\bcheapest\b|\bclosest\b/i.test(query)) {
    type = "COMPARE";
  } else if (/\bsurprise me\b|\bsomething (fun|relaxing)\b|\bfree this afternoon\b|\bi have .* free\b/i.test(query)) {
    type = "RECOMMEND";
  } else if (/\bbook again\b/i.test(query)) {
    type = "BOOK";
  } else if (/\breserve\b/i.test(query)) {
    type = "RESERVE";
  } else if (/\bbuy\b|\bpurchase\b/i.test(query)) {
    type = "BUY";
  } else if (/\bcancel\b/i.test(query)) {
    type = "CANCEL";
  }

  // Ambiguity: consequential book without enough entity
  let needsClarification = false;
  let clarificationPrompt: string | null = null;
  if (
    (type === "BOOK" || type === "RESERVE") &&
    !cat.category &&
    !/\b(massage|spa|hotel|table|dinner|gym|ticket|cinema)\b/i.test(query) &&
    !opts?.prior?.category
  ) {
    needsClarification = true;
    clarificationPrompt =
      type === "RESERVE" || /dinner|table|eat/i.test(query)
        ? "Where would you like to eat?"
        : "What would you like to book?";
  }

  // Merge follow-up filters onto prior intent
  const prior = opts?.prior;
  const intent: CommandIntent = {
    type: prior && isFollowUpFilter(query) ? prior.type : type,
    rawQuery: query,
    inputType,
    category: cat.category ?? prior?.category ?? null,
    offeringType: cat.offeringType ?? prior?.offeringType ?? null,
    date: when.date ?? prior?.date ?? null,
    time: when.time ?? prior?.time ?? null,
    timeAfter: when.timeAfter ?? prior?.timeAfter ?? null,
    timeBefore: when.timeBefore ?? prior?.timeBefore ?? null,
    maxPrice: price.maxPrice ?? prior?.maxPrice ?? null,
    minPrice: price.minPrice ?? prior?.minPrice ?? null,
    currency: price.currency ?? prior?.currency ?? null,
    locationMode: locationMode !== "none" ? locationMode : prior?.locationMode ?? "none",
    personalFocus: detectPersonalFocus(query),
    sortBy: detectSort(query) ?? prior?.sortBy ?? "relevance",
    needsClarification,
    clarificationPrompt,
    actionCapability:
      type === "BOOK" || type === "RESERVE"
        ? "BOOK"
        : type === "BUY"
          ? "BUY"
          : type === "PAY"
            ? "PAY"
            : type === "VIEW" || type === "PERSONAL_CONTEXT" || type === "NAVIGATE"
              ? "VIEW"
              : "NONE",
    confidence: legacy.confidence,
    slots: { ...legacy.slots },
    suggestedActionId: legacy.suggestedActionId as CommandIntent["suggestedActionId"],
    legacyKind: legacy.kind,
  };

  if (/\bcheapest\b/i.test(query)) intent.sortBy = "price_asc";
  if (/\bclosest\b/i.test(query)) intent.sortBy = "distance";
  if (/\bearliest\b/i.test(query)) intent.sortBy = "availability";

  const searchQuery = buildSearchQuery(intent, query);
  const followUp = Boolean(prior && isFollowUpFilter(query));

  return {
    intent,
    searchQuery,
    applyFilters: true,
    usePersonalContext: intent.type === "PERSONAL_CONTEXT" || Boolean(intent.personalFocus),
    useRecommendations: intent.type === "RECOMMEND" || /surprise|something (fun|relaxing)/i.test(query),
    compareMode: intent.type === "COMPARE" || /\bcompare\b|\bwhich is\b|\bcheapest\b|\bclosest\b/i.test(query),
    followUp,
  };
}

function isFollowUpFilter(q: string): boolean {
  return /^(cheapest|closest|earliest|after\s+\d|before\s+\d|under\s+|book it|that one|compare|the \W?\d)/i.test(
    q.trim(),
  ) || /^(after 5|after 5pm|under )/i.test(q.trim());
}

function detectPersonalFocus(q: string): string | null {
  if (/\btoday\b|happening today|doing today/i.test(q)) return "today";
  if (/\btomorrow\b/i.test(q) && /\b(have|doing|book)/i.test(q)) return "tomorrow";
  if (/\battention\b|\bwaiting\b/i.test(q)) return "attention";
  if (/\bsaved\b/i.test(q)) return "saved";
  if (/\bpayment|spent|spend/i.test(q)) return "payments";
  if (/\bticket/i.test(q)) return "tickets";
  if (/\bhotel\b/i.test(q) && /\bmy\b/i.test(q)) return "hotel";
  if (/\bbooking|booked\b/i.test(q)) return "bookings";
  return null;
}

function detectSort(q: string): CommandIntent["sortBy"] | undefined {
  if (/\bcheaper|cheapest|lowest price\b/i.test(q)) return "price_asc";
  if (/\bmost expensive|highest price\b/i.test(q)) return "price_desc";
  if (/\bclosest|nearest\b/i.test(q)) return "distance";
  if (/\bearliest|soonest|availability\b/i.test(q)) return "availability";
  if (/\bcancellation\b/i.test(q)) return "cancellation";
  return undefined;
}

function buildSearchQuery(intent: CommandIntent, raw: string): string {
  if (intent.category && /massage|spa|gym|hotel|cinema|restaurant|dinner/i.test(raw)) {
    const parts = [intent.offeringType === "MASSAGE" ? "massage" : intent.category];
    return parts.join(" ");
  }
  return raw
    .replace(/\b(find me|find|show me|show|book me|book a|book|under ₦?[\d,]+|tomorrow|today|tonight|around \d+|after \d+|before \d+|am|pm)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim() || raw;
}

export function toLegacyClassified(intent: CommandIntent) {
  return classifyIntent(intent.rawQuery);
}
