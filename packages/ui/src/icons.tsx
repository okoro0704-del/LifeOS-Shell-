import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </Svg>
  );
}

export function IconExplore(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1z" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconActivity(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12h4l2.5-6 3 12L16 12h4" />
    </Svg>
  );
}

export function IconProfile(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3.2 4-4.8 7-4.8s5.5 1.6 7 4.8" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </Svg>
  );
}

export function IconBell(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 17h11" />
      <path d="M7 17a5 5 0 0 1-1-3V10a6 6 0 1 1 12 0v4a5 5 0 0 1-1 3" />
      <path d="M10 17a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconLink(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3.2-3.2a3.5 3.5 0 0 1 5 0" />
      <path d="M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-3.2 3.2a3.5 3.5 0 0 1-5 0" />
      <path d="m9 15 6-6" />
    </Svg>
  );
}

export function IconPay(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 15h3" />
    </Svg>
  );
}

export function IconSend(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 19V5" />
      <path d="m7 10 5-5 5 5" />
    </Svg>
  );
}

export function IconReceive(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="m7 14 5 5 5-5" />
    </Svg>
  );
}

export function IconBook(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
}

export function IconTicket(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9a2 2 0 0 0 0 4v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4a2 2 0 0 0 0-4V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2z" />
      <path d="M12 7v10" strokeDasharray="2 3" />
    </Svg>
  );
}

export function IconStay(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-6h6v6" />
    </Svg>
  );
}

export function IconEat(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" />
      <path d="M10 13v8" />
      <path d="M16 3v18" />
      <path d="M16 8h3a2 2 0 0 1 0 4h-3" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 5 6v5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </Svg>
  );
}

export function IconMessage(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5z" />
    </Svg>
  );
}

export const NAV_ICONS = {
  home: IconHome,
  explore: IconExplore,
  wallet: IconWallet,
  activity: IconActivity,
  profile: IconProfile,
  search: IconSearch,
  bell: IconBell,
  link: IconLink,
  message: IconMessage,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
