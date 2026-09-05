import type { ComponentType, SVGProps } from "react";
import {
  IconActivity,
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

export type PersonalKernel = "offline" | "main" | "free";

/**
 * Personal space bottom tabs (kernels are body gestures, not tabs):
 * Home · Activity · Finance — Space switch is separate.
 */
export const PERSONAL_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/personal", end: true, label: "Home", Icon: IconHome },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
  { to: "/app/personal/finance", label: "Finance", Icon: IconWallet },
];

/**
 * Business space — consume & patronize.
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
  if (path.startsWith("/app/personal/")) return "main";
  return null;
}

export const PERSONAL_KERNEL_ORDER: PersonalKernel[] = ["offline", "main", "free"];
