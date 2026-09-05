import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { sharedService } from "../../lib/services";
import { StatusBanner } from "../../components/StatusBanner";

export function IdentityPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof sharedService.identity>> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  useEffect(() => {
    void sharedService
      .identity()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load identity"));
  }, []);

  const copyDid = async () => {
    if (!data?.did) return;
    try {
      await navigator.clipboard.writeText(data.did);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const exportBackup = async () => {
    try {
      const res = await sharedService.exportBackup();
      const blob = new Blob([JSON.stringify(res.backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lifeos-trustid-backup-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg("Encrypted session key backup downloaded.");
    } catch (err) {
      setBackupMsg(err instanceof Error ? err.message : "Backup failed");
    }
  };

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>TrustID identity</h1>
        <p className="muted">
          Decentralized identifier and zero-PII session controls shared by Personal and Business
          spaces.
        </p>
      </header>

      {error ? <StatusBanner title="Identity unavailable" detail={error} /> : null}

      {!data ? (
        <p className="muted">Loading TrustID…</p>
      ) : (
        <>
          <section className="shared-card">
            <h2>DID</h2>
            <p className="mono shared-did">{data.did}</p>
            <div className="row-actions">
              <button type="button" className="los-btn los-btn--soft los-btn--sm" onClick={() => void copyDid()}>
                {copied ? "Copied" : "Copy DID"}
              </button>
              <button type="button" className="los-btn los-btn--ghost los-btn--sm" onClick={() => void exportBackup()}>
                Export encrypted backup
              </button>
            </div>
            {backupMsg ? <p className="muted small">{backupMsg}</p> : null}
          </section>

          <section className="shared-card">
            <h2>Session</h2>
            <dl className="personal-meta">
              <div>
                <dt>Trust ID</dt>
                <dd className="mono">{data.trustId}</dd>
              </div>
              <div>
                <dt>Zero-PII</dt>
                <dd>{data.zeroPii ? "Enforced" : "Off"}</dd>
              </div>
              <div>
                <dt>ZK verified</dt>
                <dd>{data.zkVerified ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Trust tier</dt>
                <dd>{data.trustTier ?? "—"}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{data.identityStatus ?? data.sessionStatus}</dd>
              </div>
              <div>
                <dt>Display</dt>
                <dd>{data.displayName || user?.displayName}</dd>
              </div>
            </dl>
          </section>

          <section className="shared-card">
            <h2>Public verification keys</h2>
            <ul className="personal-list">
              {data.publicVerificationKeys.map((k) => (
                <li key={k.id} className="personal-list__static">
                  <span className="personal-list__kind">{k.type}</span>
                  <span className="personal-list__title mono small">{k.publicKeyMultibase}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="shared-card">
            <h2>Business memberships</h2>
            {data.memberships.length === 0 ? (
              <p className="muted">No BusinessMember records linked yet.</p>
            ) : (
              <ul className="personal-list">
                {data.memberships.map((m) => (
                  <li key={m.id} className="personal-list__static">
                    <span className="personal-list__kind">{m.role}</span>
                    <span className="personal-list__title">{m.businessName}</span>
                    <span className="mono muted small">{m.businessId}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
