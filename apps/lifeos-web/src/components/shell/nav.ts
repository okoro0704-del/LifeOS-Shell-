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
  matchPrefixes?: string[];
};

export type PersonalKernel = "offline" | "main" | "free";

export function personalNavBase(kernel: PersonalKernel): string {
  if (kernel === "free") return "/app/personal/free";
  if (kernel === "offline") return "/app/personal/offline";
  return "/app/personal";
}

/** Bottom tabs scoped to the active Personal kernel. */
export function personalPrimaryNav(kernel: PersonalKernel): ShellNavItem[] {
  const base = personalNavBase(kernel);
  return [
    {
      to: `${base}/post`,
      label: "Home",
      Icon: IconHome,
      matchPrefixes: [
        `${base}/post`,
        `${base}/reels`,
        `${base}/products`,
        `${base}/communities`,
        `${base}/search`,
      ],
    },
    { to: `${base}/learnverse`, label: "LearnVerse", Icon: IconBook, matchPrefixes: [`${base}/learnverse`] },
    { to: `${base}/streamify`, label: "Streamify", Icon: IconExplore, matchPrefixes: [`${base}/streamify`] },
  ];
}

export const BUSINESS_PRIMARY_NAV: ShellNavItem[] = [
  { to: "/app/business", end: true, label: "Home", Icon: IconHome },
  { to: "/app/activity", label: "Activity", Icon: IconActivity },
  { to: "/app/wallet", label: "Finance", Icon: IconWallet },
];

export function primaryNavForMode(mode: WorkspaceMode, kernel: PersonalKernel = "main"): ShellNavItem[] {
  return mode === "PERSONAL" ? personalPrimaryNav(kernel) : BUSINESS_PRIMARY_NAV;
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
  if (path.startsWith("/app/personal/")) return "main";
  return null;
}

export const PERSONAL_KERNEL_ORDER: PersonalKernel[] = ["offline", "main", "free"];
