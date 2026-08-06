import type { ClassifiedIntent, IntentKind } from "@lifeos/shared";

type Rule = {
  kind: IntentKind;
  suggestedActionId?: string;
  patterns: RegExp[];
  slotExtractors?: Array<(q: string) => Record<string, string>>;
};

const RULES: Rule[] = [
  {
    kind: "SHOW_WALLET",
    suggestedActionId: "OPEN_WALLET",
    patterns: [
      /\b(open|show|view)\s+(my\s+)?wallet\b/i,
      /\bwallet\s+balance\b/i,
      /\bhow much.*(have|spend|spent|balance)\b/i,
      /\bcash\s+wallet\b/i,
    ],
  },
  {
    kind: "WALLET_QUERY",
    suggestedActionId: "OPEN_WALLET",
    patterns: [
      /\b(spend|spent|spending|balance|transactions?)\b.*\b(month|week|today)\b/i,
      /\bhow much did i spend\b/i,
    ],
  },
  {
    kind: "PERSONAL_CONTEXT",
    suggestedActionId: "VIEW_BOOKINGS",
    patterns: [
      /\bwhat('s| is) coming up\b/i,
      /\bwhat('s| is) (on )?this weekend\b/i,
      /\bwhat did i book\b/i,
      /\bshow my saved\b/i,
      /\bmy saved (spas?|massages?|offerings?)\b/i,
      /\bwhere am i going (tonight|today)\b/i,
      /\bwhat do i need to pay\b/i,
      /\bwhat did i do yesterday\b/i,
      /\bwhat am i doing (tonight|today|this weekend)\b/i,
      /\bi have nothing planned\b/i,
      /\bnothing planned\b/i,
      /^(my (hotel|tickets?|appointments?|plans?))\b/i,
    ],
  },
  {
    kind: "PAY",
    suggestedActionId: "PAY_INVOICE",
    patterns: [/\bpay\b.+/i, /\b(hotel|spa|gym)\s+bill\b/i, /\binvoice\b/i],
    slotExtractors: [
      (q) => {
        const m = q.match(/\bpay\s+(.+)/i);
        return m ? { merchant: m[1].trim() } : ({} as Record<string, string>);
      },
    ],
  },
  {
    kind: "BOOK",
    suggestedActionId: "BOOK_SERVICE",
    patterns: [/\bbook\b.+/i, /\breserve\b.+/i, /\bmake\s+an?\s+appointment\b/i],
    slotExtractors: [
      (q) => {
        const m = q.match(/\bbook\s+(?:a\s+|an\s+)?(.+)/i);
        return m ? { service: m[1].trim() } : ({} as Record<string, string>);
      },
    ],
  },
  {
    kind: "SHOW_BOOKINGS",
    suggestedActionId: "VIEW_BOOKINGS",
    patterns: [
      /\b(show|view|my)\s+bookings?\b/i,
      /\breservations?\b/i,
      /\bwhat do i have (today|tomorrow)\b/i,
    ],
  },
  {
    kind: "SHOW_ACTIVITY",
    suggestedActionId: "VIEW_ACTIVITY",
    patterns: [/\b(show|view|my)\s+activity\b/i, /\brecent\s+activity\b/i],
  },
  {
    kind: "DISCOVER",
    suggestedActionId: "DISCOVER_BUSINESSES",
    patterns: [
      /\bfind\s+(me\s+)?(a\s+|an\s+)?/i,
      /\bdiscover\b/i,
      /\bnear\s+me\b/i,
      /\b(find|show|search).*\b(restaurants?|gym|spa|cinema|hotels?)\b/i,
    ],
    slotExtractors: [
      (q) => {
        const m = q.match(/\bfind\s+(?:me\s+)?(?:a\s+|an\s+)?(.+)/i);
        return m ? { topic: m[1].trim() } : ({} as Record<string, string>);
      },
    ],
  },
  {
    kind: "NAVIGATE",
    suggestedActionId: "VIEW_PROFILE",
    patterns: [/\b(open|go to|show)\s+(my\s+)?profile\b/i],
  },
  {
    kind: "NAVIGATE",
    suggestedActionId: "VIEW_NOTIFICATIONS",
    patterns: [/\b(open|show|view)\s+(my\s+)?notifications?\b/i],
  },
  {
    kind: "NAVIGATE",
    suggestedActionId: "VIEW_TICKETS",
    patterns: [/\b(show|view|my)\s+(cinema\s+)?tickets?\b/i],
  },
  {
    kind: "NAVIGATE",
    suggestedActionId: "SHOW_CONNECTIONS",
    patterns: [/\b(show|open)\s+(my\s+)?connections?\b/i],
  },
  {
    kind: "ASK",
    patterns: [/\b(what|how|why|when|where|who)\b.+\?/i, /\bexplain\b/i, /\bhelp\b/i],
  },
];

function sanitizeQuery(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 200);
}

/**
 * Deterministic intent classifier — rules foundation for a future LLM adapter.
 */
export function classifyIntent(raw: string): ClassifiedIntent {
  const query = sanitizeQuery(raw);
  if (!query) {
    return { kind: "UNKNOWN", confidence: 0, query, slots: {} };
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(query))) {
      const slots: Record<string, string> = {};
      for (const extract of rule.slotExtractors ?? []) {
        Object.assign(slots, extract(query));
      }
      return {
        kind: rule.kind,
        confidence: 0.82,
        query,
        slots,
        suggestedActionId: rule.suggestedActionId,
      };
    }
  }

  // Bare entity-like search (short proper noun / business name)
  if (query.split(" ").length <= 4 && !/[?]/.test(query)) {
    return {
      kind: "SEARCH",
      confidence: 0.7,
      query,
      slots: {},
      suggestedActionId: "SEARCH_EXPERIENCES",
    };
  }

  return {
    kind: "SEARCH",
    confidence: 0.55,
    query,
    slots: {},
    suggestedActionId: "SEARCH_EXPERIENCES",
  };
}
