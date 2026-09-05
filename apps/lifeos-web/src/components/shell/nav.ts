import type { ComponentType, SVGProps } from "react";
import {
  IconActivity,
  IconBook,
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

/** Primary tabs for Personal space. */
export const PERSONAL_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/personal", end: true, label: "Home", Icon: IconHome },
  { to: "/app/personal/vault", label: "Vault", Icon: IconBook },
  { to: "/app/personal/discovery", label: "Discovery", Icon: IconExplore },
  { to: "/app/personal/finance", label: "Finance", Icon: IconWallet },
];

/** Primary tabs for Business space. */
export const BUSINESS_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/business", end: true, label: "Home", Icon: IconHome },
  { to: "/app/discover", label: "Explore", Icon: IconExplore },
  { to: "/app/wallet", label: "Finance", Icon: IconWallet },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
];

export function primaryNavForMode(mode: WorkspaceMode): ShellNavItem[] {
  return mode === "PERSONAL" ? PERSONAL_PRIMARY_NAV : BUSINESS_PRIMARY_NAV;
}

export function workspaceHomePath(mode: WorkspaceMode): string {
  return mode === "PERSONAL" ? "/app/personal" : "/app/business";
}
