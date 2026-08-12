import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LifeOsPreferences, LifeOsUserPublic } from "@lifeos/shared";
import { LIFEOS_VERSION } from "@lifeos/shared";
import {
  Avatar,
  Button,
  ProfileRow,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from "@lifeos/ui";
import { authGatewayWeb } from "../lib/api";
import { connectionService, profileService, walletService } from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { StatusBanner } from "../components/StatusBanner";

/** Compress image to a small JPEG data URL for preference storage. */
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image failed"));
      img.onload = () => {
        const max = 512;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function ProfilePage() {
  const { logout, setUser } = useAuth();
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setLocalUser] = useState<LifeOsUserPublic | null>(null);
  const [prefs, setPrefs] = useState<LifeOsPreferences | null>(null);
  const [about, setAbout] = useState<{ version: string } | null>(null);
  const [connCount, setConnCount] = useState(0);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

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
      } catch {
        setError("We couldn't load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function patch(partial: Partial<LifeOsPreferences>) {
    const res = await profileService.patchPreferences(partial);
    setPrefs(res.preferences);
    if (partial.theme) setTheme(partial.theme);
    const nextUser = res.user
      ? res.user
      : user
        ? { ...user, preferences: { ...user.preferences, ...res.preferences } }
        : null;
    if (nextUser) {
      setLocalUser(nextUser);
      setUser(nextUser);
    }
  }

  async function onPhotoSelected(file: File | null) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file (JPG or PNG).");
      return;
    }
    setPhotoBusy(true);
    setError(null);
    try {
      const avatarUrl = await fileToAvatarDataUrl(file);
      await patch({ avatarUrl });
      if (user) {
        const { saveReturningIdentity } = await import("../lib/returningIdentity");
        saveReturningIdentity(
          { ...user, preferences: { ...user.preferences, avatarUrl } },
          {},
        );
      }
    } catch {
      setError("Couldn't upload that photo. Try a smaller image.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const avatarSrc = prefs?.avatarUrl ?? user?.preferences?.avatarUrl ?? null;

  return (
    <div className="page">
      {error ? <StatusBanner title={error} /> : null}
      {loading ? <Skeleton height={88} label="Loading profile" /> : null}

      {user ? (
        <div className="profile-hero">
          <div className="profile-hero__photo">
            <Avatar name={user.displayName} size="lg" src={avatarSrc} />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onPhotoSelected(e.target.files?.[0] ?? null)}
            />
            <Button
              size="sm"
              variant="soft"
              disabled={photoBusy}
              onClick={() => fileRef.current?.click()}
            >
              {photoBusy ? "Uploading…" : avatarSrc ? "Change photo" : "Upload photo"}
            </Button>
            {avatarSrc ? (
              <button
                type="button"
                className="text-link"
                disabled={photoBusy}
                onClick={() => void patch({ avatarUrl: null })}
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <div>
            <h1 className="profile-name">{user.displayName}</h1>
            <StatusBadge label="Identity protected" tone="ok" />
          </div>
        </div>
      ) : null}

      <section className="profile-stack">
        <SectionHeader title="Trust & security" />
        <ProfileRow
          label="LifeOS Gateway"
          subtitle="Manage identity & recovery"
          onClick={() => window.open(authGatewayWeb, "_blank", "noopener,noreferrer")}
        />
        <ProfileRow
          label="Connected devices"
          subtitle="Managed in LifeOS Gateway"
          onClick={() => window.open(authGatewayWeb, "_blank", "noopener,noreferrer")}
        />
        <ProfileRow
          label="Security"
          subtitle="Sessions and credentials"
          onClick={() => window.open(authGatewayWeb, "_blank", "noopener,noreferrer")}
        />
      </section>

      <section className="profile-stack">
        <SectionHeader title="LifeOS" />
        <ProfileRow
          label="Connected experiences"
          subtitle={`${connCount} connected`}
          onClick={() => navigate("/app/connections")}
        />
        <ProfileRow
          label="Finance"
          subtitle={balance ?? "Open Finance"}
          onClick={() => navigate("/app/wallet")}
        />
        <ProfileRow label="Notifications" onClick={() => navigate("/app/notifications")} />
      </section>

      <section className="profile-stack">
        <SectionHeader title="Preferences" />
        <ProfileRow
          label="Appearance"
          subtitle={prefs ? prefs.theme : "System"}
          onClick={() => setShowPrefs((v) => !v)}
        />
        {showPrefs && prefs ? (
          <div className="prefs surface-block padded">
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

      <section className="profile-stack">
        <SectionHeader title="About" />
        <div className="muted small padded-inline">LifeOS {about?.version ?? LIFEOS_VERSION}</div>
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
        Sign out
      </Button>
    </div>
  );
}
