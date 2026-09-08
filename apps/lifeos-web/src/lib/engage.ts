/** Local engage state for love / comments / reuse / share. */

const LOVE_KEY = "lifeos.engage.loves";
const COMMENT_KEY = "lifeos.engage.comments";
const REUSE_KEY = "lifeos.engage.reuses";

type Comment = { id: string; text: string; at: string };

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

export function isLoved(id: string): boolean {
  const map = readJson<Record<string, boolean>>(LOVE_KEY, {});
  return Boolean(map[id]);
}

export function toggleLove(id: string): boolean {
  const map = readJson<Record<string, boolean>>(LOVE_KEY, {});
  const next = !map[id];
  if (next) map[id] = true;
  else delete map[id];
  writeJson(LOVE_KEY, map);
  return next;
}

export function listComments(id: string): Comment[] {
  const map = readJson<Record<string, Comment[]>>(COMMENT_KEY, {});
  return map[id] ?? [];
}

export function addComment(id: string, text: string): Comment[] {
  const map = readJson<Record<string, Comment[]>>(COMMENT_KEY, {});
  const entry: Comment = {
    id: `${Date.now()}`,
    text: text.trim(),
    at: new Date().toISOString(),
  };
  const list = [...(map[id] ?? []), entry];
  map[id] = list;
  writeJson(COMMENT_KEY, map);
  return list;
}

export function getReuseCount(id: string): number {
  const map = readJson<Record<string, number>>(REUSE_KEY, {});
  return map[id] ?? 0;
}

export function markReused(id: string): number {
  const map = readJson<Record<string, number>>(REUSE_KEY, {});
  map[id] = (map[id] ?? 0) + 1;
  writeJson(REUSE_KEY, map);
  return map[id]!;
}

export async function shareItem(input: {
  title: string;
  text: string;
  url?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const url =
    input.url ||
    (typeof window !== "undefined" ? `${window.location.origin}/app/personal/post` : "");
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: input.title, text: input.text, url });
      return "shared";
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(`${input.title}\n${input.text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
