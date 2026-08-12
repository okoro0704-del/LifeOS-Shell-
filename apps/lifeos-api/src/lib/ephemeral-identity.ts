/**
 * Session-scoped RAM-only identity presentation.
 * Never write contacts/names from the gateway to disk or Postgres.
 */

export type EphemeralPresentation = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

type Entry = {
  presentation: EphemeralPresentation;
  expiresAt: number;
};

const store = new Map<string, Entry>();
const DEFAULT_TTL_MS = 30 * 60_000;

function sweep(now = Date.now()) {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}

export function putEphemeralPresentation(
  sessionId: string,
  presentation: EphemeralPresentation,
  ttlMs = DEFAULT_TTL_MS,
) {
  sweep();
  const cleaned: EphemeralPresentation = {};
  if (presentation.email?.trim()) cleaned.email = presentation.email.trim();
  if (presentation.phone?.trim()) cleaned.phone = presentation.phone.trim();
  if (presentation.firstName?.trim()) cleaned.firstName = presentation.firstName.trim();
  if (presentation.lastName?.trim()) cleaned.lastName = presentation.lastName.trim();
  if (!Object.keys(cleaned).length) return;
  store.set(sessionId, { presentation: cleaned, expiresAt: Date.now() + ttlMs });
}

export function getEphemeralPresentation(sessionId: string): EphemeralPresentation | null {
  sweep();
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(sessionId);
    return null;
  }
  return entry.presentation;
}

export function clearEphemeralPresentation(sessionId: string) {
  store.delete(sessionId);
}

/** Test helper — wipe all RAM entries. */
export function __resetEphemeralIdentityForTests() {
  store.clear();
}
