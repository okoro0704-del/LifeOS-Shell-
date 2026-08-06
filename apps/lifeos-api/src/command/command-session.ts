import { randomUUID } from "node:crypto";
import type { CommandIntent, CommandSessionState, SearchResult } from "@lifeos/shared";

const SESSION_TTL_MS = 1000 * 60 * 20; // 20 minutes
const sessions = new Map<string, CommandSessionState>();

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (new Date(s.expiresAt).getTime() < now || s.userId === "") sessions.delete(id);
  }
}

/**
 * Lightweight CommandSession store — in-memory, user-scoped, expires.
 * Never stores payment credentials or precise location.
 */
export class CommandSessionService {
  create(userId: string, intent: CommandIntent, results: SearchResult[] = []): CommandSessionState {
    prune();
    const now = new Date();
    const session: CommandSessionState = {
      sessionId: randomUUID(),
      userId,
      intent,
      entities: {},
      filters: {
        maxPrice: intent.maxPrice,
        minPrice: intent.minPrice,
        date: intent.date,
        timeAfter: intent.timeAfter,
        category: intent.category,
        sortBy: intent.sortBy,
      },
      results: slimResults(results),
      resultCount: results.length,
      selectedResultId: null,
      pendingActionId: null,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      reason: null,
    };
    sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string, userId: string): CommandSessionState | null {
    prune();
    const s = sessions.get(sessionId);
    if (!s || s.userId !== userId) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) {
      sessions.delete(sessionId);
      return null;
    }
    return s;
  }

  /** Most recent active session for follow-ups. */
  latestForUser(userId: string): CommandSessionState | null {
    prune();
    let best: CommandSessionState | null = null;
    for (const s of sessions.values()) {
      if (s.userId !== userId) continue;
      if (!best || s.createdAt > best.createdAt) best = s;
    }
    return best;
  }

  update(
    sessionId: string,
    userId: string,
    patch: Partial<
      Pick<
        CommandSessionState,
        "intent" | "filters" | "results" | "selectedResultId" | "pendingActionId" | "reason" | "entities"
      >
    >,
  ): CommandSessionState | null {
    const s = this.get(sessionId, userId);
    if (!s) return null;
    const next: CommandSessionState = {
      ...s,
      ...patch,
      results: patch.results ? slimResults(patch.results) : s.results,
      resultCount: patch.results ? patch.results.length : s.resultCount,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    };
    sessions.set(sessionId, next);
    return next;
  }

  clearUser(userId: string) {
    for (const [id, s] of sessions) {
      if (s.userId === userId) sessions.delete(id);
    }
  }
}

function slimResults(results: SearchResult[]): SearchResult[] {
  return results.slice(0, 12).map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle,
    description: r.description,
    icon: r.icon,
    image: r.image,
    metadata: sanitizeMeta(r.metadata),
    actions: r.actions,
    source: r.source,
    score: r.score,
  }));
}

function sanitizeMeta(meta?: Record<string, unknown>) {
  if (!meta) return meta;
  const out = { ...meta };
  delete out.cardNumber;
  delete out.cvv;
  delete out.token;
  delete out.authorizationToken;
  delete out.preciseLat;
  delete out.preciseLng;
  return out;
}

export const commandSessionService = new CommandSessionService();
