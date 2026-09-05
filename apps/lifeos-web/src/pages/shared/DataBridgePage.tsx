import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { sharedService } from "../../lib/services";
import { StatusBanner } from "../../components/StatusBanner";

export function DataBridgePage() {
  const { activeBusinessId, setActiveBusinessId } = useWorkspace();
  const [data, setData] = useState<Awaited<ReturnType<typeof sharedService.bridge>> | null>(null);
  const [vaultId, setVaultId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [module, setModule] = useState("financeos");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await sharedService.bridge();
      setData(res);
      setError(null);
      setVaultId((prev) => prev || res.vaultItems[0]?.id || "");
      setBusinessId((prev) => {
        if (prev) return prev;
        if (activeBusinessId && res.businesses.some((b) => b.id === activeBusinessId)) {
          return activeBusinessId;
        }
        return res.businesses[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bridge");
    }
  }, [activeBusinessId]);

  useEffect(() => {
    void load();
  }, [load]);

  const transfer = async () => {
    if (!vaultId || !businessId) {
      setError("Select a vault item and business.");
      return;
    }
    setBusy(true);
    setOk(null);
    try {
      const res = await sharedService.transferBridge({
        personalVaultItemId: vaultId,
        targetBusinessId: businessId,
        targetModule: module,
      });
      setActiveBusinessId(businessId);
      setOk(`Bridged at ${new Date(res.bridgedAt).toLocaleString()} → ${res.targetModule}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bridge failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Cross-space bridge</h1>
        <p className="muted">
          Reference personal vault artifacts into Business modules without duplicating encrypted
          files.
        </p>
      </header>

      {error ? <StatusBanner title="Bridge error" detail={error} /> : null}
      {ok ? <StatusBanner title="Bridge created" detail={ok} /> : null}

      {!data ? (
        <p className="muted">Loading bridge manager…</p>
      ) : (
        <>
          <section className="shared-card">
            <h2>Share vault item</h2>
            {data.vaultItems.length === 0 || data.businesses.length === 0 ? (
              <p className="muted">
                {data.vaultItems.length === 0
                  ? "Add a Personal Vault item first."
                  : "Join a Business membership before bridging."}
              </p>
            ) : (
              <div className="shared-bridge-form">
                <label>
                  Vault item
                  <select value={vaultId} onChange={(e) => setVaultId(e.target.value)}>
                    {data.vaultItems.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} ({v.kind})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Target business
                  <select
                    value={businessId}
                    onChange={(e) => {
                      setBusinessId(e.target.value);
                      setActiveBusinessId(e.target.value);
                    }}
                  >
                    {data.businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.role})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Module
                  <select value={module} onChange={(e) => setModule(e.target.value)}>
                    <option value="financeos">FinanceOS / expenses</option>
                    <option value="serviceos">ServiceOS</option>
                    <option value="hospitalityos">HospitalityOS</option>
                    <option value="docs">Business docs</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="los-btn los-btn--primary los-btn--sm"
                  disabled={busy}
                  onClick={() => void transfer()}
                >
                  {busy ? "Bridging…" : "Bridge to business"}
                </button>
              </div>
            )}
          </section>

          <section className="shared-card">
            <h2>Audit log</h2>
            {data.audit.length === 0 ? (
              <p className="muted">No cross-space links yet.</p>
            ) : (
              <ul className="personal-list">
                {data.audit.map((a) => (
                  <li key={a.id} className="personal-list__static">
                    <span className="personal-list__kind">{a.targetModule}</span>
                    <span className="personal-list__title">
                      {a.vaultTitle} → {a.businessName}
                    </span>
                    <span className="muted small">{new Date(a.bridgedAt).toLocaleString()}</span>
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
