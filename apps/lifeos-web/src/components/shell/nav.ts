import type { ComponentType, SVGProps } from "react";
import {
  IconBook,
  IconExplore,
  IconHome,
  IconActivity,
  IconWallet,
} from "@lifeos/ui";
import type { WorkspaceMode } from "../../context/WorkspaceContext";

export type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type ShellNavItem = {
  to: string;
  end?: boolean;
  label: string;
  Icon: IconComp;
  /** Extra path prefixes that count as active (Personal Home tabs). */
  matchPrefixes?: string[];
};

export type PersonalKernel = "offline" | "main" | "free";

/**
 * Personal bottom tabs: Home · LearnVerse · (+) · Streamify · Space
 */
export const PERSONAL_PRIMARY_NAV: ShellNavItem[] = [
  {
    to: "/app/personal/post",
    label: "Home",
    Icon: IconHome,
    matchPrefixes: [
      "/app/personal/post",
      "/app/personal/reels",
      "/app/personal/connects",
      "/app/personal/communities",
    ],
  },
  { to: "/app/personal/learnverse", label: "LearnVerse", Icon: IconBook },
  { to: "/app/personal/streamify", label: "Streamify", Icon: IconExplore },
];

/**
 * Business space — consume & patronize.
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
  return mode === "PERSONAL" ? "/app/personal/post" : "/app/business";
}

export function personalKernelPath(kernel: PersonalKernel): string {
  if (kernel === "offline") return "/app/personal/offline/post";
  if (kernel === "free") return "/app/personal/free/post";
  return "/app/personal/post";
}

export function personalKernelFromPath(pathname: string): PersonalKernel | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app/personal/offline" || path.startsWith("/app/personal/offline/") || path === "/app/personal/vault") {
    return "offline";
  }
  if (path === "/app/personal/free" || path.startsWith("/app/personal/free/") || path === "/app/personal/discovery") {
    return "free";
  }
  if (
    path === "/app/personal" ||
    path === "/app/personal/main" ||
    path.startsWith("/app/personal/post") ||
    path.startsWith("/app/personal/reels") ||
    path.startsWith("/app/personal/connects") ||
    path.startsWith("/app/personal/communities") ||
    path.startsWith("/app/personal/learnverse") ||
    path.startsWith("/app/personal/streamify") ||
    path.startsWith("/app/personal/plus")
  ) {
    return "main";
  }
  if (path.startsWith("/app/personal/")) return "main";
  return null;
}

export const PERSONAL_KERNEL_ORDER: PersonalKernel[] = ["offline", "main", "free"];
