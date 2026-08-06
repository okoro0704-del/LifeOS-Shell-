import type { LocationPermissionState } from "@lifeos/shared";

/**
 * Location permission abstraction — never silently access device location.
 * Precise coordinates are not stored in command sessions.
 */
export class LocationPermissionService {
  private grants = new Map<string, LocationPermissionState>();

  get(userId: string): LocationPermissionState {
    return this.grants.get(userId) ?? { granted: false, mode: "none", label: null };
  }

  /** Explicit opt-in only — UI must call this after user consent. */
  grant(userId: string, mode: "coarse" | "precise" = "coarse", label?: string) {
    this.grants.set(userId, {
      granted: true,
      mode,
      label: label ?? "Current area",
    });
    return this.get(userId);
  }

  revoke(userId: string) {
    this.grants.delete(userId);
    return this.get(userId);
  }

  /** Soft near-me boost label when permitted; never returns lat/lng. */
  nearMeLabel(userId: string): string | null {
    const g = this.get(userId);
    if (!g.granted) return null;
    return g.label ?? "Near you";
  }
}

export const locationPermissionService = new LocationPermissionService();
