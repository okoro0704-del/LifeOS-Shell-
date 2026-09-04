import type { InstalledAppManifest } from "@lifeos/shared";
import {
  resolveLauncherBadge,
  resolveLauncherGlyph,
} from "@lifeos/shell-core";

export type UniversalAppLauncherProps = {
  apps: InstalledAppManifest[];
  activeAppId?: string | null;
  loading?: boolean;
  onLaunch: (app: InstalledAppManifest) => void;
  emptyLabel?: string;
};

/** Universal App Launcher Bar — installed verticals from Portal bootstrap. */
export function UniversalAppLauncher({
  apps,
  activeAppId,
  loading,
  onLaunch,
  emptyLabel = "No apps installed yet",
}: UniversalAppLauncherProps) {
  const active = apps.filter((a) => a.status === "active");

  if (loading) {
    return (
      <div className="los-ual" aria-busy="true">
        <span className="los-ual__label">Apps</span>
        <span className="los-ual__loading">Syncing…</span>
      </div>
    );
  }

  if (!active.length) {
    return (
      <div className="los-ual los-ual--empty" aria-label="Installed apps">
        <span className="los-ual__label">Apps</span>
        <span className="los-ual__empty">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <nav className="los-ual" aria-label="Installed LifeOS apps">
      <span className="los-ual__label">Apps</span>
      <ul className="los-ual__list">
        {active.map((app) => {
          const isActive = activeAppId === app.appId || activeAppId === app.id;
          const glyph = resolveLauncherGlyph(app);
          const badge = resolveLauncherBadge(app);
          const count = app.badgeCount ?? 0;
          return (
            <li key={app.id}>
              <button
                type="button"
                className={`los-ual__tab${isActive ? " is-active" : ""}`}
                onClick={() => onLaunch(app)}
                title={`${app.displayName} · ${app.routes.shellDeepLink}`}
              >
                {glyph.kind === "image" ? (
                  <img src={glyph.value} alt="" className="los-ual__icon" />
                ) : (
                  <span
                    className={`los-ual__glyph${glyph.kind === "emoji" ? " los-ual__glyph--emoji" : ""}`}
                    aria-hidden
                  >
                    {glyph.value}
                  </span>
                )}
                <span className="los-ual__meta">
                  <span className="los-ual__name">{app.displayName}</span>
                  {badge ? (
                    <span className="los-ual__pill" data-preset={app.preset ?? badge.toLowerCase()}>
                      {badge}
                    </span>
                  ) : null}
                </span>
                {count > 0 ? (
                  <span className="los-ual__badge" aria-label={`${count} alerts`}>
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
