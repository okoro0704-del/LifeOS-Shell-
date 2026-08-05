import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LifeOsPreferences, LifeOsUserPublic } from "@lifeos/shared";
import { LIFEOS_VERSION } from "@lifeos/shared";
import { Avatar, Badge, Button, SectionHeader, Skeleton, StatusDot } from "@lifeos/ui";
import { trustIdWeb, userFacingMessage } from "../lib/api";
import { connectionService, profileService, walletService } from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { StatusBanner } from "../components/StatusBanner";

export function ProfilePage() {
  const { logout, setUser } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setLocalUser] = useState<LifeOsUserPublic | null>(null);
  const [prefs, setPrefs] = useState<LifeOsPreferences | null>(null);
  const [about, setAbout] = useState<{ version: string } | null>(null);
  const [connCount, setConnCount] = useState(0);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [data, conns, bal] = await Promise.all([
          profileService.get(),
          connectionService.list().catch(() => ({ connections: [] })),
          walletService.balance().catch(() => null),
        ]);
        setLocalUser(data.user);
        setPrefs(data.user.preferences);
        setAbout(data.about);
        setConnCount(conns.connections.filter((c) => c.status === "connected").length);
        if (bal) setBalance(bal.formatted);
      } catch (e) {
        setError(userFacingMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function patch(partial: Partial<LifeOsPreferences>) {
    const res = await profileService.patchPreferences(partial);
    setPrefs(res.preferences);
    if (partial.theme) setTheme(partial.theme);
    if (res.user) {
      setLocalUser(res.user);
      setUser(res.user);
    }
  }

  return (
    <div className="page">
      <SectionHeader title="Profile" subtitle="Identity, trust, and LifeOS preferences" />
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={96} label="Loading profile" /> : null}

      {user ? (
        <div className="profile-hero">
          <Avatar name={user.displayName} size="lg" />
          <div>
            <h1 className="profile-name">{user.displayName}</h1>
            <div className="mono muted small">TrustID · {user.trustId}</div>
            {user.email ? <div className="muted small">{user.email}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="trust-card">
        <div className="trust-card-head">
          <StatusDot label="TrustID connected" />
          <Badge variant="success">Verified session</Badge>
        </div>
        <p className="muted small">
          Identity credentials, recovery, and device trust live in TrustID. LifeOS never stores
          passwords. Future verification badges will appear here without leaving the shell.
        </p>
        <a className="los-btn los-btn--soft los-btn--sm" href={trustIdWeb} target="_blank" rel="noreferrer">
          Open TrustID
        </a>
      </div>

      <section>
        <SectionHeader title="Trust & security" subtitle="Ready for future identity verification" />
        <div className="settings-stack">
          <div className="settings-row static">
            <div>
              <strong>Trusted devices</strong>
              <div className="muted small">Managed in TrustID · coming soon in-shell</div>
            </div>
            <Badge>TrustID</Badge>
          </div>
          <div className="settings-row static">
            <div>
              <strong>Identity verification</strong>
              <div className="muted small">Placeholder for government ID / biometrics later</div>
            </div>
            <Badge>Soon</Badge>
          </div>
          <a className="settings-row" href={trustIdWeb} target="_blank" rel="noreferrer">
            <div>
              <strong>Security settings</strong>
              <div className="muted small">Sessions, credentials, wipe & recovery</div>
            </div>
            <span className="chevron" aria-hidden>
              →
            </span>
          </a>
        </div>
      </section>

      <section>
        <SectionHeader title="Wallet" />
        <Link to="/app/wallet" className="settings-row">
          <div>
            <strong>Mock balance</strong>
            <div className="muted small">{balance ?? "Open wallet"}</div>
          </div>
          <span className="chevron" aria-hidden>
            →
          </span>
        </Link>
      </section>

      <section>
        <SectionHeader title="Connected experiences" />
        <Link to="/app/connections" className="settings-row">
          <div>
            <strong>
              {connCount} connected experience{connCount === 1 ? "" : "s"}
            </strong>
            <div className="muted small">Permissions and disconnect controls</div>
          </div>
          <span className="chevron" aria-hidden>
            →
          </span>
        </Link>
        <Link to="/app/notifications" className="settings-row">
          Notifications
        </Link>
      </section>

      <section>
        <SectionHeader title="Preferences" subtitle="LifeOS-only settings" />
        {prefs ? (
          <div className="prefs">
            <label className="toggle-row">
              <span>Notifications</span>
              <input
                type="checkbox"
                checked={prefs.notificationsEnabled}
                onChange={() =>
                  void patch({ notificationsEnabled: !prefs.notificationsEnabled })
                }
              />
            </label>
            <label className="toggle-row">
              <span>Marketing tips</span>
              <input
                type="checkbox"
                checked={prefs.marketingTips}
                onChange={() => void patch({ marketingTips: !prefs.marketingTips })}
              />
            </label>
            <label className="toggle-row">
              <span>Theme</span>
              <select
                value={prefs.theme}
                onChange={(e) =>
                  void patch({ theme: e.target.value as LifeOsPreferences["theme"] })
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>Language</span>
              <select
                value={prefs.language}
                onChange={(e) => void patch({ language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
            </label>
            <label className="toggle-row">
              <span>Open experiences</span>
              <select
                value={prefs.openExperiencesIn}
                onChange={(e) =>
                  void patch({
                    openExperiencesIn: e.target.value as LifeOsPreferences["openExperiencesIn"],
                  })
                }
              >
                <option value="embed">Inside LifeOS</option>
                <option value="external">External tab</option>
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section>
        <SectionHeader title="Privacy" subtitle="What LifeOS stores vs TrustID" />
        <div className="privacy-note">
          <p className="muted small">
            LifeOS keeps shell preferences, connection grants, and mock wallet state. Passwords,
            recovery keys, and identity proofs stay in TrustID. Business OSs own their own sessions
            after you launch an experience.
          </p>
        </div>
      </section>

      <section>
        <SectionHeader title="About" />
        <div className="muted small">LifeOS {about?.version ?? LIFEOS_VERSION}</div>
        <div className="about-links">
          <a href="#">Terms</a>
          <a href="#">Privacy</a>
          <a href="#">Support</a>
        </div>
      </section>

      <Button
        variant="danger"
        className="logout-btn"
        onClick={async () => {
          await logout();
          navigate("/");
        }}
      >
        Sign out of LifeOS
      </Button>
    </div>
  );
}
