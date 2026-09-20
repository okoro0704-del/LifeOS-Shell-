/**
 * Isolated Personal Space DEMO activity fixtures for interaction acceptance.
 * Never written to production messaging / notification / live databases.
 *
 * Activation (explicit only):
 * - VITE_LIFEOS_PERSONAL_DEMO=true
 * - or DEV with localStorage key lifeos.personalDemo = "1"
 *
 * Production without the flag → zero demo activity.
 */
export const PERSONAL_DEMO_SOURCE = "lifeos-personal-demo-fixture" as const;

export type PersonalDemoKind = "notification" | "message" | "live";

export type PersonalDemoEvent = {
  id: string;
  kind: PersonalDemoKind;
  title: string;
  body: string;
  to: string;
  /** Always DEMO — never production. */
  source: typeof PERSONAL_DEMO_SOURCE;
  fixture: true;
  /** Delay from demo session start (ms). */
  atMs: number;
};

const DEMO_LS_KEY = "lifeos.personalDemo";

export function isLifeOsPersonalDemoEnabled(): boolean {
  const envOn = (import.meta.env.VITE_LIFEOS_PERSONAL_DEMO ?? "").toLowerCase() === "true";
  if (envOn) return true;
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(DEMO_LS_KEY) === "1";
  } catch {
    return false;
  }
}

export function enablePersonalDemoLocally(): void {
  if (!import.meta.env.DEV) return;
  try {
    localStorage.setItem(DEMO_LS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function disablePersonalDemoLocally(): void {
  try {
    localStorage.removeItem(DEMO_LS_KEY);
  } catch {
    /* ignore */
  }
}

/** Deterministic arrival sequence for watching interaction. */
export function personalDemoSequence(): PersonalDemoEvent[] {
  return [
    {
      id: "demo-notif-01",
      kind: "notification",
      title: "Demo notification",
      body: "Fixture alert — not a real LifeOS notification.",
      to: "/app/notifications",
      source: PERSONAL_DEMO_SOURCE,
      fixture: true,
      atMs: 2000,
    },
    {
      id: "demo-msg-01",
      kind: "message",
      title: "Demo Messenger",
      body: "Hey — checking in from your demo conversation.",
      to: "/app/messages",
      source: PERSONAL_DEMO_SOURCE,
      fixture: true,
      atMs: 5000,
    },
    {
      id: "demo-live-01",
      kind: "live",
      title: "Demo Live",
      body: "Fixture LIVE_STARTED — no real broadcast.",
      to: "/app/live",
      source: PERSONAL_DEMO_SOURCE,
      fixture: true,
      atMs: 8000,
    },
  ];
}

/** Demo-only badge contribution while fixtures are active / unread in session. */
export function personalDemoUnreadCount(seenIds: Set<string>): number {
  if (!isLifeOsPersonalDemoEnabled()) return 0;
  return personalDemoSequence().filter((e) => e.kind !== "live" && !seenIds.has(e.id)).length;
}
