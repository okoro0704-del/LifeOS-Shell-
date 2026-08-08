/** LifeOS shell origin for return links and postMessage. */
export function lifeosWebOrigin(): string {
  const fromEnv = import.meta.env.VITE_LIFEOS_WEB?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5174";
}

export function lifeosDiscoverUrl(): string {
  return `${lifeosWebOrigin()}/app/discover`;
}
