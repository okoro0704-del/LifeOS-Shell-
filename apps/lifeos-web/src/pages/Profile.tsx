import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LifeOsPreferences, LifeOsUserPublic } from "@lifeos/shared";
import { LIFEOS_VERSION } from "@lifeos/shared";
import { Avatar, Button, SectionHeader, Skeleton, StatusDot } from "@lifeos/ui";
import { trustIdWeb, userFacingMessage } from "../lib/api";
import { profileService } from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";

export function ProfilePage() {
  const { logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [user, setLocalUser] = useState<LifeOsUserPublic | null>(null);
  const [prefs, setPrefs] = useState<LifeOsPreferences | null>(null);
  const [about, setAbout] = useState<{ version: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void profileService
      .get()
      .then((data) => {
        setLocalUser(data.user);
        setPrefs(data.user.preferences);
        setAbout(data.about);
      })
      .catch((e) => setError(userFacingMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  async function patch(partial: Partial<LifeOsPreferences>) {
    const res = await profileService.patchPreferences(partial);
    setPrefs(res.preferences);
    if (res.user) {
      setLocalUser(res.user);
      setUser(res.user);
    }
  }

  return (
    <div className="page">
      <SectionHeader title="Profile" />
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={96} /> : null}

      {user ? (
        <div className="profile-hero">
          <Avatar name={user.displayName} />
          <div>
            <h1 className="profile-name">{user.displayName}</h1>
            <div className="mono">TrustID: {user.trustId}</div>
          </div>
        </div>
      ) : null}

      <StatusDot label="TrustID Connected ✓" />

      <section>
        <SectionHeader title="Account" />
        <Link to="/app/connections" className="settings-row">
          Connected experiences
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
        <SectionHeader
          title="Security"
          subtitle="Devices, credentials, and trust permissions live in TrustID"
        />
        <a className="los-btn los-btn--ghost" href={trustIdWeb} target="_blank" rel="noreferrer">
          Manage identity & security
        </a>
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
