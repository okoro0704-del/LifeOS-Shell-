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
      detail="Your vault, discovery, and personal finance live here. Digiconomy modules will land in later phases."
      ctaHref="/app/personal/vault"
      ctaLabel="Open vault"
    />
  );
}

export function PersonalVaultPage() {
  return (
    <WorkspacePlaceholder
      title="Vault"
      detail="Offline-capable personal library (Digiconomy Kernel 1) — coming next."
    />
  );
}

export function PersonalDiscoveryPage() {
  return (
    <WorkspacePlaceholder
      title="Discovery"
      detail="Free content discovery feed — ported from Digiconomy Kernel 2 in a later phase."
    />
  );
}

export function PersonalFinancePage() {
  return (
    <WorkspacePlaceholder
      title="Personal finance"
      detail="Personal money view. Shared TrustID wallet remains available under Finance in Business space."
      ctaHref="/app/wallet"
      ctaLabel="Open shared wallet"
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
