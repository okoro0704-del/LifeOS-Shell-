import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { lifeosDiscoverUrl } from "../lib/lifeos";
import {
  clearLocalSession,
  createLocalSession,
  exchangeHandoff,
  rejectQueryAuth,
} from "../lib/session";

export function LifeOsAuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handoff = params.get("handoff");
    const experienceId = params.get("experience_id") ?? "exp_sunrise_hotel";
    const returnPath = params.get("return_path") || "/";
    const returnUrl = params.get("returnUrl") ?? lifeosDiscoverUrl();

    if (rejectQueryAuth() && !handoff) {
      setError("Query-parameter authentication is not allowed.");
      return;
    }

    if (!handoff) {
      setError("Missing secure handoff. Open this experience from LifeOS.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        clearLocalSession();
        const { claims, token } = await exchangeHandoff(handoff, experienceId);
        if (cancelled) return;
        createLocalSession(claims, returnUrl, token);
        navigate(returnPath, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "We couldn't securely connect to this experience.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="hos">
      <div className="hos-os">HospitalityOS</div>
      {error ? (
        <>
          <h1>Secure connection failed</h1>
          <p className="error">{error}</p>
          <a className="hos-back" href={lifeosDiscoverUrl()}>
            ← Return to LifeOS
          </a>
        </>
      ) : (
        <>
          <h1>Connecting securely…</h1>
          <p className="muted">Verifying LifeOS experience session. TrustID credentials are never received.</p>
        </>
      )}
    </div>
  );
}
