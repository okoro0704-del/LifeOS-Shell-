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

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="los-empty">
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
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
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`los-card ${className}`.trim()}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
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
              if (e.key === "Enter" || e.key === " ") onClick();
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

export function Skeleton({ height = 56, className = "" }: { height?: number; className?: string }) {
  return (
    <div
      className={`los-skeleton ${className}`.trim()}
      style={{ height }}
      aria-hidden
    />
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <div className="avatar" aria-hidden>
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

export function StatusDot({ label }: { label: string }) {
  return (
    <div className="status-pill">
      <span className="status-dot" />
      {label}
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
          <h2>{title}</h2>
          <button type="button" className="text-link" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="los-sheet-body">{children}</div>
      </div>
    </div>
  );
}
