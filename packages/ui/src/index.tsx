import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import {
  IconActivity,
  IconEat,
  IconExplore,
  IconPay,
  IconProfile,
  IconReceive,
  IconSearch,
  IconSend,
  IconShield,
  IconStay,
  IconTicket,
  IconWallet,
} from "./icons.js";

export * from "./icons.js";

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <button
      className={`los-btn los-btn--${variant} los-btn--${size} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="los-section-header">
      <div>
        <h2 className="los-section-title">{title}</h2>
        {subtitle ? <p className="los-section-sub">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="los-empty" role="status">
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
      {action ? <div className="los-empty-action">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" className={`los-card ${className}`.trim()} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={`los-card ${className}`.trim()}>{children}</div>;
}

export function ListRow({
  title,
  subtitle,
  meta,
  onClick,
  trailing,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  return (
    <li
      className={`list-row${onClick ? " clickable" : ""}`}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div>
        <strong>{title}</strong>
        {subtitle ? <div className="muted small">{subtitle}</div> : null}
        {meta ? <div className="muted small">{meta}</div> : null}
      </div>
      {trailing}
    </li>
  );
}

export function Skeleton({
  height = 56,
  className = "",
  label = "Loading",
}: {
  height?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`los-skeleton ${className}`.trim()}
      style={{ height }}
      role="status"
      aria-label={label}
    />
  );
}

export function Avatar({
  name,
  size = "md",
  src,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  src?: string | null;
}) {
  const initial = (name || "?").slice(0, 1).toUpperCase();
  if (src) {
    return <img className={`avatar avatar--${size}`} src={src} alt="" aria-hidden />;
  }
  return (
    <div className={`avatar avatar--${size}`} aria-hidden>
      {initial}
    </div>
  );
}

export function StatusDot({ label }: { label: string }) {
  return (
    <div className="status-pill">
      <span className="status-dot" aria-hidden />
      {label}
    </div>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass = tone === "neutral" ? "" : ` los-status-badge--${tone}`;
  return (
    <span className={`los-status-badge${toneClass}`}>
      <span className="los-status-badge__dot" aria-hidden />
      {label}
    </span>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "accent" | "success" | "warning";
}) {
  const mod = variant === "default" ? "" : ` los-badge--${variant}`;
  return <span className={`los-badge${mod}`}>{children}</span>;
}

export function Chip({
  children,
  active = false,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`los-chip${active ? " active" : ""}`}
      aria-pressed={active}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="los-progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div className="los-progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SearchBar({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <label className={`los-search ${className}`.trim()}>
      <span className="los-search__icon" aria-hidden>
        <IconSearch size={18} />
      </span>
      <input className="los-search__input" type="search" {...rest} />
    </label>
  );
}

export function QuickAction({
  icon,
  label,
  href,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <span className="los-quick__icon" aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <a className="los-quick" href={href} onClick={onClick}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className="los-quick" onClick={onClick}>
      {inner}
    </button>
  );
}

export function WalletCard({
  balance,
  label = "Wallet",
  subtitle = "LifeOS Wallet",
  mask,
  locked,
  lockedMessage,
  actions,
  loading,
  variant = "accent",
}: {
  balance?: string;
  label?: string;
  subtitle?: string;
  mask?: string;
  locked?: boolean;
  lockedMessage?: string;
  actions?: ReactNode;
  loading?: boolean;
  variant?: "accent" | "fiat" | "token";
}) {
  return (
    <div
      className={`los-wallet los-wallet--${variant}${locked ? " los-wallet--locked" : ""}`}
      aria-live="polite"
    >
      <p className="los-wallet__label">{label}</p>
      {loading ? (
        <div className="los-skeleton" style={{ height: 40, margin: "0.5rem 0", opacity: 0.35 }} />
      ) : locked ? (
        <div className="los-wallet__balance">{lockedMessage ?? "Connect to continue"}</div>
      ) : (
        <div className="los-wallet__balance">{balance ?? "—"}</div>
      )}
      {!locked ? (
        <div className="los-wallet__meta">
          <span>{subtitle}</span>
          {mask ? <span className="mono">{mask}</span> : null}
        </div>
      ) : null}
      {actions ? <div className="los-wallet__actions">{actions}</div> : null}
    </div>
  );
}

const CATEGORY_THEME: Record<string, string> = {
  Hotels: "stay",
  Apartments: "stay",
  "Real Estate": "stay",
  Restaurants: "eat",
  Services: "wellness",
  Transport: "travel",
  Finance: "finance",
  Shopping: "shop",
  Other: "other",
};

function categoryTone(category?: string) {
  if (!category) return "other";
  return CATEGORY_THEME[category] ?? "other";
}

export function ExperienceCard({
  name,
  category,
  location,
  availability,
  initial,
  connected,
  onClick,
  href,
}: {
  name: string;
  category?: string;
  location?: string | null;
  availability?: string;
  initial?: string;
  connected?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const meta = [category, location].filter(Boolean).join(" · ");
  const tone = categoryTone(category);
  const letter = (initial || name).slice(0, 1).toUpperCase();
  const CategoryIcon =
    tone === "eat" ? IconEat : tone === "stay" ? IconStay : tone === "wellness" ? IconShield : IconExplore;

  const body = (
    <>
      <div className={`los-exp__media los-exp__media--${tone}`} aria-hidden>
        <div className="los-exp__media-glow" />
        <div className="los-exp__media-mark">
          <CategoryIcon size={22} />
          <span>{letter}</span>
        </div>
      </div>
      <div className="los-exp__body">
        <div className="los-exp__top">
          <p className="los-exp__name">{name}</p>
          {connected ? <span className="los-exp__connected">Connected</span> : null}
        </div>
        {meta ? <p className="los-exp__meta">{meta}</p> : null}
        {availability ? <p className="los-exp__avail">{availability}</p> : null}
        <span className="los-exp__cta">View experience →</span>
      </div>
    </>
  );
  if (href) {
    return (
      <a className="los-exp" href={href} onClick={onClick}>
        {body}
      </a>
    );
  }
  return (
    <button type="button" className="los-exp" onClick={onClick}>
      {body}
    </button>
  );
}

export function OfferingCard({
  name,
  businessName,
  category,
  price,
  priceUnit,
  duration,
  location,
  availability,
  badge,
  rating,
  image,
  reason,
  onClick,
}: {
  name: string;
  businessName: string;
  category?: string;
  price?: string;
  priceUnit?: string | null;
  duration?: string | null;
  location?: string | null;
  availability?: string | null;
  badge?: string | null;
  rating?: number | null;
  image?: string | null;
  reason?: string | null;
  onClick?: () => void;
}) {
  const tone = categoryTone(
    category === "Stay"
      ? "Hotels"
      : category === "Eat"
        ? "Restaurants"
        : category === "Wellness" || category === "Fitness"
          ? "Services"
          : category,
  );
  const metaBits = [duration, price && priceUnit ? `${price} / ${priceUnit}` : price, location].filter(
    Boolean,
  );
  const CategoryIcon =
    tone === "eat" ? IconEat : tone === "stay" ? IconStay : tone === "wellness" ? IconShield : IconExplore;
  const mark = businessName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <button type="button" className="los-offering" onClick={onClick}>
      <div
        className={`los-offering__media los-exp__media--${tone}${image ? " los-offering__media--photo" : ""}`}
        aria-hidden
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      >
        <div className="los-exp__media-glow" />
        {!image ? (
          <div className="los-offering__media-mark">
            <span className="los-offering__initials">{mark}</span>
            <CategoryIcon size={16} />
          </div>
        ) : (
          <div className="los-offering__media-mark los-offering__media-mark--soft">
            <CategoryIcon size={18} />
          </div>
        )}
        {badge ? <span className="los-offering__badge">{badge}</span> : null}
      </div>
      <div className="los-offering__body">
        <p className="los-offering__name">{name}</p>
        <p className="los-offering__business">{businessName}</p>
        {reason ? <p className="los-offering__reason">{reason}</p> : null}
        {metaBits.length ? <p className="los-offering__meta">{metaBits.join(" · ")}</p> : null}
        <div className="los-offering__foot">
          {rating != null ? <span className="los-offering__rating">★ {rating.toFixed(1)}</span> : <span />}
          {availability ? <span className="los-offering__avail">{availability}</span> : null}
        </div>
        <span className="los-offering__cta">View</span>
      </div>
    </button>
  );
}

const ACTIVITY_ICONS: Record<string, ReactNode> = {
  hotel_booking: <IconStay size={18} />,
  payment: <IconPay size={18} />,
  restaurant_order: <IconEat size={18} />,
  wallet_transfer: <IconWallet size={18} />,
  account: <IconProfile size={18} />,
  experience: <IconExplore size={18} />,
  security: <IconShield size={18} />,
};

export function ActivityRow({
  title,
  detail,
  time,
  amount,
  kind,
  onClick,
}: {
  title: string;
  detail?: string;
  time?: string;
  amount?: string;
  kind?: string;
  onClick?: () => void;
}) {
  const icon = (kind && ACTIVITY_ICONS[kind]) || <IconTicket size={18} />;
  const body = (
    <>
      <span className="los-activity__icon" aria-hidden>
        {icon}
      </span>
      <div className="los-activity__body">
        <p className="los-activity__title">{title}</p>
        {detail ? <p className="los-activity__detail">{detail}</p> : null}
      </div>
      <div className="los-activity__meta">
        {time ? <span>{time}</span> : null}
        {amount ? <span className="los-activity__amount">{amount}</span> : null}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="los-activity" onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className="los-activity">{body}</div>;
}

export function ProfileRow({
  label,
  subtitle,
  href,
  onClick,
  trailing,
}: {
  label: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <span className="los-profile-row__label">
        <span>{label}</span>
        {subtitle ? <span className="los-profile-row__sub">{subtitle}</span> : null}
      </span>
      {trailing ?? (
        <span className="los-profile-row__chevron" aria-hidden>
          →
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <a className="los-profile-row" href={href} onClick={onClick}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className="los-profile-row" onClick={onClick}>
      {content}
    </button>
  );
}

export function SecurityCard({
  eyebrow = "Identity",
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="los-security">
      <p className="los-security__eyebrow">{eyebrow}</p>
      <h2 className="los-security__title">{title}</h2>
      {detail ? <p className="los-security__detail">{detail}</p> : null}
      {action}
    </div>
  );
}

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const container = panelRef.current;
    const focusables = () =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    focusables()[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const nodes = focusables();
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="los-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="los-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="los-sheet" ref={panelRef}>
        <div className="los-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="los-sheet-body">{children}</div>
      </div>
    </div>
  );
}
