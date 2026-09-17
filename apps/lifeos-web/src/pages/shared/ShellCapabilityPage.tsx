import { useState } from "react";
import { Link } from "react-router-dom";
import { useOsShell } from "../../os-shell/OsShellParticipant";

/**
 * Thin Shell capability demonstration.
 * Trust ID and FundzMan stay in LifeOS. The Shell never receives credentials.
 */
export function ShellCapabilityPage() {
  const shell = useOsShell();
  const [identityPolicy, setIdentityPolicy] = useState("not requested");
  const [identityExecution, setIdentityExecution] = useState("not started");
  const [commercePolicy, setCommercePolicy] = useState("not requested");
  const [commerceExecution, setCommerceExecution] = useState("not started");
  const [busy, setBusy] = useState<string | null>(null);

  async function requestIdentity() {
    setBusy("identity");
    try {
      const policy = await shell.requestShellCapability("identity");
      setIdentityPolicy(policy.status === "granted" ? "granted" : `${policy.status}${policy.reason ? ` (${policy.reason})` : ""}`);
      if (policy.status !== "granted") {
        setIdentityExecution("not_authorized");
        return;
      }
      setIdentityExecution("handoff to Trust ID");
      shell.reportShellExecution("identity", true, "authentication_required");
    } finally {
      setBusy(null);
    }
  }

  async function requestCommerce() {
    setBusy("commerce");
    try {
      const policy = await shell.requestShellCapability("commerce");
      setCommercePolicy(policy.status === "granted" ? "granted" : `${policy.status}${policy.reason ? ` (${policy.reason})` : ""}`);
      if (policy.status !== "granted") {
        setCommerceExecution("not_authorized");
        return;
      }
      setCommerceExecution("handoff to FundzMan");
      shell.reportShellExecution("commerce", true, "payments_unavailable");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="page personal-page">
      <header className="page-header">
        <h1>Shell capabilities</h1>
        <p className="muted">
          The Shell mediates permission. LifeOS executes identity and commerce. Trust ID and FundzMan stay outside the Shell.
        </p>
      </header>
      <p className="muted small">{shell.connected ? `Connected to ${shell.shellOrigin}` : "Not hosted in OS Shell."}</p>

      <section className="shared-card">
        <h2>Identity</h2>
        <p className="muted small">Granted means LifeOS may start Trust ID. It does not mean the user is authenticated.</p>
        <p>Shell permission: {identityPolicy}</p>
        <p>Execution: {identityExecution}</p>
        <div className="row-actions">
          <button type="button" className="los-btn los-btn--primary" disabled={busy !== null} onClick={() => void requestIdentity()}>
            Request identity
          </button>
          <Link className="los-btn los-btn--soft" to="/app/shared/identity">
            Open Trust ID
          </Link>
        </div>
      </section>

      <section className="shared-card">
        <h2>Commerce</h2>
        <p className="muted small">Granted means LifeOS may start checkout. FundzMan remains the money boundary.</p>
        <p>Shell permission: {commercePolicy}</p>
        <p>Execution: {commerceExecution}</p>
        <div className="row-actions">
          <button type="button" className="los-btn los-btn--primary" disabled={busy !== null} onClick={() => void requestCommerce()}>
            Request commerce
          </button>
          <Link className="los-btn los-btn--soft" to="/app/wallet">
            Open wallet
          </Link>
        </div>
      </section>
    </div>
  );
}
