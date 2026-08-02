import type { ReactNode } from "react";

export function StatusBanner({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="status-banner" role="alert">
      <strong>{title}</strong>
      {detail ? <p>{detail}</p> : null}
      {action ? <div className="status-banner-action">{action}</div> : null}
    </div>
  );
}
