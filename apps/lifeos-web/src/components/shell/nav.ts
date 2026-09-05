import type { ComponentType, SVGProps } from "react";
import {
  IconActivity,
  IconExplore,
  IconHome,
  IconWallet,
} from "@lifeos/ui";
import type { WorkspaceMode } from "../../context/WorkspaceContext";

export type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type ShellNavItem = {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComp;
};

/**
 * Consumer space (PERSONAL mode in this shell):
 * Home · Activity · Finance — Space switch is separate.
 * Vault lives in the Digiconomy personal app (offline / main / free kernels), not here.
 */
export const PERSONAL_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/personal", end: true, label: "Home", Icon: IconHome },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
  { to: "/app/personal/finance", label: "Finance", Icon: IconWallet },
];

/**
 * Business workspace: Home · Explore · Finance — Space switch is separate.
 * Ask LifeOS stays in shared nav for both spaces.
 */
export const BUSINESS_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/business", end: true, label: "Home", Icon: IconHome },
  { to: "/app/discover", label: "Explore", Icon: IconExplore },
  { to: "/app/wallet", label: "Finance", Icon: IconWallet },
];

export function primaryNavForMode(mode: WorkspaceMode): ShellNavItem[] {
  return mode === "PERSONAL" ? PERSONAL_PRIMARY_NAV : BUSINESS_PRIMARY_NAV;
}

export function workspaceHomePath(mode: WorkspaceMode): string {
  return mode === "PERSONAL" ? "/app/personal" : "/app/business";
}
