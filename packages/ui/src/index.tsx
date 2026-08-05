import type { ButtonHTMLAttributes, ReactNode } from "react";

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
  as: _as,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: "div" | "button";
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
    return (
      <img
        className={`avatar avatar--${size}`}
        src={src}
        alt=""
        aria-hidden
      />
    );
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

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "accent" | "success";
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

export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="los-sheet-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="los-sheet-backdrop" aria-label="Close" onClick={onClose} />
      <div className="los-sheet">
        <div className="los-sheet-head">
          <h2 id="los-sheet-title">{title}</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="los-sheet-body">{children}</div>
      </div>
    </div>
  );
}
