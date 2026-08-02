import { useState } from "react";
import type { ExperiencePermission, ExperienceRecord } from "@lifeos/shared";
import { PERMISSION_LABELS } from "@lifeos/shared";
import { Button, Sheet } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import { userFacingMessage } from "../lib/api";

type Props = {
  experience: ExperienceRecord;
  /** Newly requested scopes (not already granted). */
  requested: ExperiencePermission[];
  /** Already granted scopes — kept when approving the request. */
  alreadyGranted: ExperiencePermission[];
  onCancel: () => void;
  onResolved: (session: Awaited<ReturnType<typeof discoverService.connect>>["session"] | null) => void;
};

/**
 * Sprint 3: consent UI when a business OS requests additional permissions
 * via the experience bridge. Never auto-grants.
 */
export function PermissionRequestSheet({
  experience,
  requested,
  alreadyGranted,
  onCancel,
  onResolved,
}: Props) {
  const [selected, setSelected] = useState<ExperiencePermission[]>(requested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: ExperiencePermission) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function allow() {
    setBusy(true);
    setError(null);
    try {
      const merged = Array.from(new Set([...alreadyGranted, ...selected]));
      const result = await discoverService.connect(experience.id, merged);
      onResolved(result.session);
    } catch (err) {
      setError(userFacingMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deny() {
    setBusy(true);
    setError(null);
    try {
      await discoverService.denyPermissions(experience.id, requested);
      onResolved(null);
      onCancel();
    } catch (err) {
      setError(userFacingMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Additional permission request" onClose={() => void deny()}>
      <p className="lead" style={{ marginTop: 0 }}>
        <strong>{experience.displayName}</strong> is requesting additional access:
      </p>
      <ul className="perm-list">
        {requested.map((id) => (
          <li key={id}>
            <label className="perm-row">
              <input
                type="checkbox"
                checked={selected.includes(id)}
                onChange={() => toggle(id)}
              />
              <span>{PERMISSION_LABELS[id] ?? id}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Approving updates the experience connection. New scopes apply to the next
        experience session — they are never granted silently.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions">
        <Button onClick={() => void allow()} disabled={busy || selected.length === 0}>
          Grant
        </Button>
        <Button variant="ghost" onClick={() => void deny()} disabled={busy}>
          Deny
        </Button>
      </div>
    </Sheet>
  );
}
