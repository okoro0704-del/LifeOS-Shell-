import type { ComponentType, SVGProps } from "react";
import {
  IconActivity,
  IconExplore,
  IconHome,
  IconShield,
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

export type PersonalKernel = "offline" | "main" | "free";

/** Personal space — three kernels: Offline · Main · Free */
export const PERSONAL_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/personal/offline", label: "Offline", Icon: IconShield },
  { to: "/app/personal", end: true, label: "Main", Icon: IconHome },
  { to: "/app/personal/free", label: "Free", Icon: IconExplore },
];

/**
 * Business space — consume & patronize (was mislabeled Personal).
 * Home · Activity · Finance — Space switch is separate.
 */
export const BUSINESS_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/business", end: true, label: "Home", Icon: IconHome },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
  { to: "/app/wallet", label: "Finance", Icon: IconWallet },
];

export function primaryNavForMode(mode: WorkspaceMode): ShellNavItem[] {
  return mode === "PERSONAL" ? PERSONAL_PRIMARY_NAV : BUSINESS_PRIMARY_NAV;
}

export function workspaceHomePath(mode: WorkspaceMode): string {
  return mode === "PERSONAL" ? "/app/personal" : "/app/business";
}

export function personalKernelPath(kernel: PersonalKernel): string {
  if (kernel === "offline") return "/app/personal/offline";
  if (kernel === "free") return "/app/personal/free";
  return "/app/personal";
}

export function personalKernelFromPath(pathname: string): PersonalKernel | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app/personal/offline" || path === "/app/personal/vault") return "offline";
  if (path === "/app/personal/free" || path === "/app/personal/discovery") return "free";
  if (path === "/app/personal" || path === "/app/personal/main") return "main";
  return null;
}

export const PERSONAL_KERNEL_ORDER: PersonalKernel[] = ["offline", "main", "free"];
