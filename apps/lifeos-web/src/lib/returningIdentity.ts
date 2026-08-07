import type { LifeOsUserPublic } from "@lifeos/shared";

const STORAGE_KEY = "lifeos.returning.identity";

export type ReturningIdentity = {
  trustId: string;
  displayName: string;
  firstName: string;
  email?: string | null;
  phone?: string | null;
  deviceName?: string | null;
  avatarUrl?: string | null;
  lastSignedInAt: string;
};

function defaultDeviceName(): string {
  try {
    const ua = navigator.userAgent;
    if (/iPhone|iPad/i.test(ua)) return "iPhone";
    if (/Android/i.test(ua)) return "Android phone";
    if (/Mac/i.test(ua)) return "Mac";
    if (/Windows/i.test(ua)) return "Windows PC";
    return "This device";
  } catch {
    return "This device";
  }
}

export function getReturningIdentity(): ReturningIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReturningIdentity;
    if (!parsed?.trustId || !parsed?.displayName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearReturningIdentity() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveReturningIdentity(
  user: LifeOsUserPublic,
  extras?: { phone?: string | null; deviceName?: string | null },
) {
  const existing = getReturningIdentity();
  const firstName =
    user.firstName?.trim() ||
    user.displayName.split(/\s+/)[0] ||
    user.displayName;
  const next: ReturningIdentity = {
    trustId: user.trustId,
    displayName: user.displayName,
    firstName,
    email: user.email ?? existing?.email ?? null,
    phone: extras?.phone ?? existing?.phone ?? null,
    deviceName: extras?.deviceName ?? existing?.deviceName ?? defaultDeviceName(),
    avatarUrl: user.preferences?.avatarUrl ?? existing?.avatarUrl ?? null,
    lastSignedInAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export { defaultDeviceName };
