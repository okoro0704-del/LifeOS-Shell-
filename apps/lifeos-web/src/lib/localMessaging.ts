/** Local business messaging store — works when ElfCom node is unbound. */

export type LocalThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
};

export type LocalMessage = {
  id: string;
  threadId: string;
  body: string;
  sender: "you" | "them";
  createdAt: string;
};

const THREADS_KEY = "lifeos.messages.threads";
const MSGS_KEY = "lifeos.messages.byThread";

const DEMO_THREADS: LocalThread[] = [
  {
    id: "biz-harbour",
    title: "Harbour Cafe",
    preview: "Your table is ready at 7:00.",
    updatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    unreadCount: 1,
  },
  {
    id: "biz-nova",
    title: "Nova Salon",
    preview: "Confirming your 3pm cut.",
    updatedAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    unreadCount: 0,
  },
  {
    id: "biz-fix",
    title: "City Fix Lab",
    preview: "Phone repair is finished — ready for pickup.",
    updatedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    unreadCount: 2,
  },
  {
    id: "biz-pulse",
    title: "Pulse Gym",
    preview: "Class waitlist opened for tomorrow.",
    updatedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    unreadCount: 0,
  },
];

const DEMO_MSGS: Record<string, LocalMessage[]> = {
  "biz-harbour": [
    {
      id: "m1",
      threadId: "biz-harbour",
      body: "Hi — booking for two tonight.",
      sender: "you",
      createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
    },
    {
      id: "m2",
      threadId: "biz-harbour",
      body: "Your table is ready at 7:00.",
      sender: "them",
      createdAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    },
  ],
  "biz-nova": [
    {
      id: "m3",
      threadId: "biz-nova",
      body: "Confirming your 3pm cut.",
      sender: "them",
      createdAt: new Date(Date.now() - 55 * 60_000).toISOString(),
    },
  ],
  "biz-fix": [
    {
      id: "m4",
      threadId: "biz-fix",
      body: "Screen glass cracked — can you fix today?",
      sender: "you",
      createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    },
    {
      id: "m5",
      threadId: "biz-fix",
      body: "Phone repair is finished — ready for pickup.",
      sender: "them",
      createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    },
  ],
  "biz-pulse": [
    {
      id: "m6",
      threadId: "biz-pulse",
      body: "Class waitlist opened for tomorrow.",
      sender: "them",
      createdAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    },
  ],
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* */
  }
}

export function listLocalThreads(): LocalThread[] {
  const stored = readJson<LocalThread[] | null>(THREADS_KEY, null);
  if (stored?.length) return stored;
  writeJson(THREADS_KEY, DEMO_THREADS);
  writeJson(MSGS_KEY, DEMO_MSGS);
  return DEMO_THREADS;
}

export function listLocalMessages(threadId: string): LocalMessage[] {
  const map = readJson<Record<string, LocalMessage[]>>(MSGS_KEY, DEMO_MSGS);
  return map[threadId] ?? [];
}

export function sendLocalMessage(threadId: string, body: string): LocalMessage[] {
  const text = body.trim();
  if (!text) return listLocalMessages(threadId);
  const map = readJson<Record<string, LocalMessage[]>>(MSGS_KEY, DEMO_MSGS);
  const msg: LocalMessage = {
    id: `local-${Date.now()}`,
    threadId,
    body: text,
    sender: "you",
    createdAt: new Date().toISOString(),
  };
  const list = [...(map[threadId] ?? []), msg];
  map[threadId] = list;
  writeJson(MSGS_KEY, map);

  const threads = listLocalThreads().map((t) =>
    t.id === threadId
      ? { ...t, preview: text, updatedAt: msg.createdAt, unreadCount: 0 }
      : t,
  );
  writeJson(THREADS_KEY, threads);
  return list;
}

export function markThreadRead(threadId: string) {
  const threads = listLocalThreads().map((t) =>
    t.id === threadId ? { ...t, unreadCount: 0 } : t,
  );
  writeJson(THREADS_KEY, threads);
}
