import { Link } from "react-router-dom";

export type WorkspacePlaceholderProps = {
  title: string;
  detail: string;
  ctaHref?: string;
  ctaLabel?: string;
};

/** Lightweight Phase 1 placeholder for workspace-scoped routes. */
export function WorkspacePlaceholder({
  title,
  detail,
  ctaHref,
  ctaLabel,
}: WorkspacePlaceholderProps) {
  return (
    <div className="page">
      <header className="page-header">
        <h1>{title}</h1>
        <p className="muted">{detail}</p>
      </header>
      {ctaHref && ctaLabel ? (
        <p>
          <Link to={ctaHref} className="los-btn los-btn--soft los-btn--sm">
            {ctaLabel}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export function PersonalHomePage() {
  return (
    <WorkspacePlaceholder
      title="Personal space"
      detail="Consume content and patronize businesses. Vault kernels live in Digiconomy."
      ctaHref="/app/personal"
      ctaLabel="Open personal home"
    />
  );
}

export function PersonalVaultPage() {
  return (
    <WorkspacePlaceholder
      title="Activity"
      detail="Vault moved to Digiconomy. Activity lives at /app/activity."
      ctaHref="/app/activity"
      ctaLabel="Open activity"
    />
  );
}

export function PersonalDiscoveryPage() {
  return (
    <WorkspacePlaceholder
      title="Finance"
      detail="Discovery slot is now Finance in the consumer shell."
      ctaHref="/app/personal/finance"
      ctaLabel="Open finance"
    />
  );
}

export function PersonalFinancePage() {
  return (
    <WorkspacePlaceholder
      title="Finance"
      detail="Your money view in the consumer space."
      ctaHref="/app/personal/finance"
      ctaLabel="Open finance"
    />
  );
}

export function BusinessHomePage() {
  return (
    <WorkspacePlaceholder
      title="Business space"
      detail="Operational home for clients, modules, and provisioned verticals."
      ctaHref="/app/business/modules"
      ctaLabel="View modules"
    />
  );
}

export function BusinessModulesPage() {
  return (
    <WorkspacePlaceholder
      title="Business modules"
      detail="ServiceOS, RealEstateOS, and other Portal-provisioned verticals appear in the Apps launcher."
      ctaHref="/app/serviceos/catalog"
      ctaLabel="Open ServiceOS"
    />
  );
}
