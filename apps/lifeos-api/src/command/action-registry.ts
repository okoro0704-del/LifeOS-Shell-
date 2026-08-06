import type { ActionDefinition, ActionId } from "@lifeos/shared";

/**
 * Central Action Registry — bridge between AI/search/Quick Access and LifeOS.
 * Consequential actions always requireConfirmation: true.
 */
export const ACTION_REGISTRY: Record<ActionId, ActionDefinition> = {
  OPEN_WALLET: {
    id: "OPEN_WALLET",
    name: "Open wallet",
    description: "Open your Cash and Token wallets",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "wallet",
    navigateTo: "/app/wallet",
  },
  VIEW_BOOKINGS: {
    id: "VIEW_BOOKINGS",
    name: "View bookings",
    description: "Show bookings and reservations",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/plans",
  },
  VIEW_ACTIVITY: {
    id: "VIEW_ACTIVITY",
    name: "View activity",
    description: "Open your LifeOS activity feed",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/activity",
  },
  SEARCH_EXPERIENCES: {
    id: "SEARCH_EXPERIENCES",
    name: "Search experiences",
    description: "Search across connected ecosystem experiences",
    requiredPermissions: [],
    parameters: ["q"],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/search",
  },
  OPEN_EXPERIENCE: {
    id: "OPEN_EXPERIENCE",
    name: "Open experience",
    description: "Launch a connected business experience",
    requiredPermissions: ["experience.connected"],
    parameters: ["experienceId"],
    requiresConfirmation: false,
    source: "experience",
  },
  BOOK_SERVICE: {
    id: "BOOK_SERVICE",
    name: "Book service",
    description: "Prepare a booking — requires confirmation",
    requiredPermissions: [],
    parameters: ["experienceId", "service", "when"],
    requiresConfirmation: true,
    source: "experience",
  },
  PAY_INVOICE: {
    id: "PAY_INVOICE",
    name: "Pay invoice",
    description: "Prepare a payment — requires confirmation",
    requiredPermissions: ["wallet.pay"],
    parameters: ["merchant", "amount", "reference"],
    requiresConfirmation: true,
    source: "wallet",
  },
  VIEW_TICKETS: {
    id: "VIEW_TICKETS",
    name: "View tickets",
    description: "Show tickets and passes",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/activity?filter=tickets",
  },
  VIEW_NOTIFICATIONS: {
    id: "VIEW_NOTIFICATIONS",
    name: "View notifications",
    description: "Open notifications",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/notifications",
  },
  VIEW_PROFILE: {
    id: "VIEW_PROFILE",
    name: "View profile",
    description: "Open your LifeOS profile",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/profile",
  },
  DISCOVER_BUSINESSES: {
    id: "DISCOVER_BUSINESSES",
    name: "Discover",
    description: "Browse the ecosystem",
    requiredPermissions: [],
    parameters: ["category"],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/discover",
  },
  SHOW_CONNECTIONS: {
    id: "SHOW_CONNECTIONS",
    name: "Connections",
    description: "Show connected experiences",
    requiredPermissions: [],
    parameters: [],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/connections",
  },
  CHECK_IN: {
    id: "CHECK_IN",
    name: "Check in",
    description: "Check in to a booking — requires confirmation",
    requiredPermissions: ["experience.connected"],
    parameters: ["experienceId", "bookingId"],
    requiresConfirmation: true,
    source: "experience",
  },
  VIEW_APPOINTMENT: {
    id: "VIEW_APPOINTMENT",
    name: "View appointment",
    description: "Open an upcoming appointment",
    requiredPermissions: [],
    parameters: ["activityId"],
    requiresConfirmation: false,
    source: "lifeos",
    navigateTo: "/app/activity",
  },
};

export function getAction(id: string): ActionDefinition | undefined {
  return ACTION_REGISTRY[id as ActionId];
}

export function listActions(): ActionDefinition[] {
  return Object.values(ACTION_REGISTRY);
}

export function actionRequiresConfirmation(id: string): boolean {
  return getAction(id)?.requiresConfirmation === true;
}
