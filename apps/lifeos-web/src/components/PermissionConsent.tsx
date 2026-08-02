import { useState } from "react";
import type { ExperiencePermission, ExperienceRecord } from "@lifeos/shared";
import { Button, Sheet } from "@lifeos/ui";
import { discoverService } from "../lib/services";
import { userFacingMessage } from "../lib/api";

type Props = {
  experience: ExperienceRecord;
  requestable: { id: ExperiencePermission; label: string }[];
  onCancel: () => void;
  onConnected: (session: Awaited<ReturnType<typeof discoverService.connect>>["session"]) => void;
};

export function PermissionConsent({ experience, requestable, onCancel, onConnected }: Props) {
  const [selected, setSelected] = useState<ExperiencePermission[]>(
    requestable.map((p) => p.id),
  );
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
      const result = await discoverService.connect(experience.id, selected);
      onConnected(result.session);
    } catch (err) {
      setError(userFacingMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title="Experience permissions" onClose={onCancel}>
      <p className="lead" style={{ marginTop: 0 }}>
        <strong>{experience.displayName}</strong> wants access to:
      </p>
      <ul className="perm-list">
        {requestable.map((p) => (
          <li key={p.id}>
            <label className="perm-row">
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span>{p.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="muted small">
        LifeOS will not share TrustID credentials. Only the scopes you allow are passed to this
        business experience.
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions">
        <Button onClick={() => void allow()} disabled={busy || selected.length === 0}>
          Allow
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Deny
        </Button>
      </div>
    </Sheet>
  );
}
