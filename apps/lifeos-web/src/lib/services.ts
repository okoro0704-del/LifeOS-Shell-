import type {
  ActivityItem,
  ActionPreviewResponse,
  ActionResult,
  AiSuggestion,
  AvailabilityResponse,
  ClassifiedIntent,
  CommandHistoryEntry,
  CommandOutcome,
  DiscoverableBusiness,
  DiscoverableOffering,
  ExperienceConnectionPublic,
  ExperienceRecord,
  LifeOsPreferences,
  LifeOsUserPublic,
  NotificationItem,
  ExperiencePermission,
  ExperienceSessionPublic,
  OrchestratedAction,
  PlanItem,
  QuickAccessItem,
  SavedOfferingPublic,
  SearchResult,
  SlotPickerConfig,
} from "@lifeos/shared";
import { api } from "./api";

export const meService = {
  get: () => api<{ user: LifeOsUserPublic; trustIdConnected: boolean }>("/me"),
  status: () =>
    api<{ status: "authenticated" | "unauthenticated" | "session_expired"; authenticated: boolean }>(
      "/auth/status",
    ),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  createSession: (accessToken: string) =>
    api<{ user: LifeOsUserPublic; sessionToken?: string; expiresAt?: string }>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ accessToken }),
    }),
};

type TokenTx = {
  id: string;
  kind: string;
  amount: number;
  symbol: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: string;
};

type FiatTx = {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  counterparty: string;
  memo?: string;
  createdAt: string;
  status: string;
  rail?: "fiat";
};

export const walletService = {
  get: () =>
    api<{
      fiat?: {
        currency: string;
        currencyName: string;
        label: string;
        accountMask: string;
        balance: { amount: number; currency: string; formatted: string };
        transactions: FiatTx[];
        preview?: boolean;
        notice?: string;
      };
      token?: {
        wallet: { address: string; symbol: string };
        balance: { amount: number; symbol: string; formatted: string };
        transactions: TokenTx[];
      };
      // Back-compat
      wallet: { address: string; symbol: string };
      balance: { amount: number; symbol: string; formatted: string };
      transactions: TokenTx[];
      mock?: boolean;
      notice?: string;
    }>("/wallet"),
  balance: () =>
    api<{
      formatted: string;
      amount?: number;
      symbol?: string;
      fiat?: { amount: number; currency: string; formatted: string };
      mock?: boolean;
    }>("/wallet/balance"),
  send: (body: { to: string; amount: number; memo?: string; rail?: "fiat" | "token" }) =>
    api("/wallet/send", { method: "POST", body: JSON.stringify(body) }),
  pay: (body: { merchant: string; amount: number; reference?: string; rail?: "fiat" | "token" }) =>
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
      offerings?: DiscoverableOffering[];
      featuredOfferings?: DiscoverableOffering[];
      offeringCategories?: string[];
      mode?: string;
    }>(`/discover${qs ? `?${qs}` : ""}`);
  },
  categories: () =>
    api<{ categories: string[]; offeringCategories?: string[] }>("/discover/categories"),
  offerings: (opts?: {
    q?: string;
    category?: string;
    type?: string;
    business?: string;
    sort?: string;
  }) => {
    const params = new URLSearchParams();
    if (opts?.q) params.set("q", opts.q);
    if (opts?.category) params.set("category", opts.category);
    if (opts?.type) params.set("type", opts.type);
    if (opts?.business) params.set("business", opts.business);
    if (opts?.sort) params.set("sort", opts.sort);
    const qs = params.toString();
    return api<{ offerings: DiscoverableOffering[]; count: number }>(
      `/discover/offerings${qs ? `?${qs}` : ""}`,
    );
  },
  getOffering: (id: string) =>
    api<{
      offering: DiscoverableOffering;
      business: DiscoverableBusiness | null;
      moreFromBusiness: DiscoverableOffering[];
      availability?: AvailabilityResponse;
      slotPicker?: SlotPickerConfig;
      saved?: boolean;
      capabilities?: string[];
    }>(`/discover/offerings/${id}`),
  offeringAvailability: (id: string, opts?: { date?: string; quantity?: number }) => {
    const params = new URLSearchParams();
    if (opts?.date) params.set("date", opts.date);
    if (opts?.quantity) params.set("quantity", String(opts.quantity));
    const qs = params.toString();
    return api<{ availability: AvailabilityResponse; slotPicker: SlotPickerConfig | null }>(
      `/discover/offerings/${id}/availability${qs ? `?${qs}` : ""}`,
    );
  },
  getBusiness: (id: string) =>
    api<{
      business: DiscoverableBusiness;
      offerings: DiscoverableOffering[];
      experience?: ExperienceRecord | null;
    }>(`/discover/businesses/${id}`),
  search: (q: string) =>
    api<{
      query: string;
      results?: SearchResult[];
      groups?: Record<string, SearchResult[]>;
      businesses: { id: string; name: string; category: string; location?: string | null; experienceId: string }[];
      experiences: ExperienceRecord[];
    }>(`/search?q=${encodeURIComponent(q)}`),
  getExperience: (id: string) =>
    api<{
      experience: ExperienceRecord & { loadable: boolean };
      offerings?: DiscoverableOffering[];
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

export const commandService = {
  search: (q: string, type?: string) => {
    const params = new URLSearchParams({ q });
    if (type) params.set("type", type);
    return api<{
      query: string;
      results: SearchResult[];
      groups: Record<string, SearchResult[]>;
      businesses: { id: string; name: string; category: string; location?: string | null; experienceId: string }[];
      experiences: ExperienceRecord[];
    }>(`/search?${params}`);
  },
  run: (text: string, source?: "text" | "voice" | "touch" | "deeplink" | "notification") =>
    api<CommandOutcome & { intent: ClassifiedIntent }>("/commands", {
      method: "POST",
      body: JSON.stringify({ text, source: source ?? "text" }),
    }),
  recent: () => api<{ items: CommandHistoryEntry[] }>("/commands/recent"),
  clearRecent: () => api<{ ok: boolean }>("/commands/recent", { method: "DELETE" }),
  quickAccess: () => api<{ items: QuickAccessItem[] }>("/quick-access"),
  pin: (id: string) =>
    api<{ items: QuickAccessItem[] }>("/quick-access/pin", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  unpin: (id: string) =>
    api<{ items: QuickAccessItem[] }>("/quick-access/unpin", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  reorder: (order: string[]) =>
    api<{ items: QuickAccessItem[] }>("/quick-access/reorder", {
      method: "POST",
      body: JSON.stringify({ order }),
    }),
  suggestions: (q?: string) =>
    api<{
      suggestions: AiSuggestion[];
      recent: CommandHistoryEntry[];
      quickAccess: QuickAccessItem[];
    }>(`/suggestions${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  intent: (text: string) =>
    api<{ intent: ClassifiedIntent }>("/ai/intent", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  executeAction: (actionId: string, params?: Record<string, unknown>, confirmed = false) =>
    api<CommandOutcome>("/actions/execute", {
      method: "POST",
      body: JSON.stringify({ actionId, params, confirmed }),
    }),
};

export const actionService = {
  forOffering: (offeringId: string) =>
    api<{
      offeringId: string;
      capabilities: string[];
      actions: OrchestratedAction[];
      slotPicker: SlotPickerConfig;
      cancellationPolicy?: string | null;
    }>(`/actions/for-offering?offeringId=${encodeURIComponent(offeringId)}`),
  preview: (body: {
    action: OrchestratedAction;
    offeringId: string;
    slotId?: string;
    quantity?: number;
    partySize?: number;
    expectedTotal?: number;
  }) =>
    api<{ preview: ActionPreviewResponse }>("/actions/preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  confirm: (body: {
    action: OrchestratedAction;
    offeringId: string;
    slotId?: string;
    quantity?: number;
    partySize?: number;
    confirmed: true;
    expectedTotal?: number;
    authorizationToken?: string;
  }) =>
    api<{ result: ActionResult }>("/actions/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  history: (filter?: string) =>
    api<{ items: Array<Record<string, unknown>> }>(
      `/actions/history${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`,
    ),
  plans: () =>
    api<{
      today: PlanItem[];
      tomorrow: PlanItem[];
      thisWeek: PlanItem[];
      upcoming: PlanItem[];
      completed: PlanItem[];
      saved: SavedOfferingPublic[];
      timeline: import("@lifeos/shared").TimelineEntry[];
      continueItems: import("@lifeos/shared").ContinueItem[];
      attention: import("@lifeos/shared").AttentionItem[];
      recommendations: import("@lifeos/shared").RecommendationItem[];
      planGroups: import("@lifeos/shared").PersonalPlanGroup[];
      wallet: import("@lifeos/shared").WalletContextSummary | null;
      providerErrors: string[];
      life: {
        today: import("@lifeos/shared").LifePlanItem[];
        tomorrow: import("@lifeos/shared").LifePlanItem[];
        thisWeek: import("@lifeos/shared").LifePlanItem[];
        upcoming: import("@lifeos/shared").LifePlanItem[];
        completed: import("@lifeos/shared").LifePlanItem[];
      };
    }>("/plans"),
  context: () =>
    api<{ context: import("@lifeos/shared").PersonalContextSnapshot }>("/context"),
  createPlanGroup: (title: string, items: import("@lifeos/shared").LifePlanItem[]) =>
    api<{ group: import("@lifeos/shared").PersonalPlanGroup }>("/plans/groups", {
      method: "POST",
      body: JSON.stringify({ title, items }),
    }),
  saved: () => api<{ items: SavedOfferingPublic[] }>("/saved"),
  save: (offeringId: string) =>
    api<{ ok: boolean; saved: boolean }>(`/offerings/${offeringId}/save`, { method: "POST" }),
  unsave: (offeringId: string) =>
    api<{ ok: boolean; saved: boolean }>(`/offerings/${offeringId}/save`, { method: "DELETE" }),
};
