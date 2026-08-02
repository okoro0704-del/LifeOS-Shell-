import type { ActivityItem, ExperienceConnectionPublic, ExperienceRecord, LifeOsPreferences, LifeOsUserPublic, NotificationItem, ExperiencePermission, ExperienceSessionPublic } from "@lifeos/shared";
import { api } from "./api";

export const meService = {
  get: () => api<{ user: LifeOsUserPublic; trustIdConnected: boolean }>("/me"),
  status: () =>
    api<{ status: "authenticated" | "unauthenticated" | "session_expired"; authenticated: boolean }>(
      "/auth/status",
    ),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  createSession: (accessToken: string) =>
    api<{ user: LifeOsUserPublic }>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    }),
};

export const walletService = {
  get: () =>
    api<{
      wallet: { address: string; symbol: string };
      balance: { amount: number; symbol: string; formatted: string };
      transactions: Array<{
        id: string;
        kind: string;
        amount: number;
        symbol: string;
        counterparty: string;
        memo?: string;
        createdAt: string;
        status: string;
      }>;
      mock?: boolean;
      notice?: string;
    }>("/wallet"),
  balance: () => api<{ formatted: string; mock?: boolean }>("/wallet/balance"),
  send: (body: { to: string; amount: number; memo?: string }) =>
    api("/wallet/send", { method: "POST", body: JSON.stringify(body) }),
  pay: (body: { merchant: string; amount: number; reference?: string }) =>
    api("/wallet/pay", { method: "POST", body: JSON.stringify(body) }),
};

export const discoverService = {
  get: (opts?: { q?: string; category?: string }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set("q", opts.q);
    if (opts?.category) params.set("category", opts.category);
    const qs = params.toString();
    return api<{
      categories: string[];
      featured: ExperienceRecord[];
      items: (ExperienceRecord & { loadable: boolean; availability?: string })[];
    }>(`/discover${qs ? `?${qs}` : ""}`);
  },
  categories: () => api<{ categories: string[] }>("/discover/categories"),
  search: (q: string) =>
    api<{
      query: string;
      businesses: { id: string; name: string; category: string; location?: string | null; experienceId: string }[];
      experiences: ExperienceRecord[];
    }>(`/search?q=${encodeURIComponent(q)}`),
  getExperience: (id: string) =>
    api<{
      experience: ExperienceRecord & { loadable: boolean };
      connection: {
        id: string;
        status: string;
        grantedPermissions: ExperiencePermission[];
        connectedAt: string;
        disconnectedAt?: string | null;
      } | null;
    }>(`/experiences/${id}`),
  permissions: (id: string) =>
    api<{
      experienceId: string;
      requestable: { id: ExperiencePermission; label: string }[];
      granted: ExperiencePermission[];
      connected: boolean;
    }>(`/experiences/${id}/permissions`),
  connect: (id: string, permissions: ExperiencePermission[]) =>
    api<{
      connectionId: string;
      grantedPermissions: ExperiencePermission[];
      session: ExperienceSessionPublic;
    }>(`/experiences/${id}/connect`, {
      method: "POST",
      body: JSON.stringify({ permissions }),
    }),
  denyPermissions: (id: string, permissions: ExperiencePermission[]) =>
    api<{ ok: boolean }>(`/experiences/${id}/permissions/deny`, {
      method: "POST",
      body: JSON.stringify({ permissions }),
    }),
  session: (id: string) =>
    api<{ session: ExperienceSessionPublic }>(`/experiences/${id}/session`, { method: "POST" }),
};

export const connectionService = {
  list: () => api<{ connections: ExperienceConnectionPublic[] }>("/connections"),
  disconnect: (id: string) =>
    api<{ ok: boolean }>(`/connections/${id}`, { method: "DELETE" }),
};

export const activityService = {
  list: () => api<{ activities: ActivityItem[] }>("/activity"),
};

export const notificationService = {
  list: () =>
    api<{ notifications: NotificationItem[]; unreadCount: number }>("/notifications"),
  markRead: (id: string) =>
    api(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => api("/notifications/read-all", { method: "POST" }),
};

export const profileService = {
  get: () =>
    api<{
      user: LifeOsUserPublic;
      trustId: { connected: boolean; trustId: string; manageUrl: string };
      connectedExperiences: {
        id: string;
        experienceId: string;
        displayName: string;
        osType: string;
        businessName: string;
        permissions: ExperiencePermission[];
      }[];
      about: { version: string; termsUrl: string; privacyUrl: string; supportUrl: string };
    }>("/profile"),
  preferences: () => api<{ preferences: LifeOsPreferences }>("/preferences"),
  patchPreferences: (preferences: Partial<LifeOsPreferences>) =>
    api<{ preferences: LifeOsPreferences; user?: LifeOsUserPublic }>("/preferences", {
      method: "PATCH",
      body: JSON.stringify(preferences),
    }),
  patch: (preferences: Partial<LifeOsPreferences>) =>
    api<{ user: LifeOsUserPublic }>("/profile", {
      method: "PATCH",
      body: JSON.stringify({ preferences }),
    }),
};
