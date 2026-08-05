import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, authClient, userFacingMessage } from "../lib/api";
import { meService } from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";

export function CallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Prevent React Strict Mode / remount from consuming PKCE twice
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(
        oauthError === "access_denied"
          ? "Authorization was denied."
          : "TrustID authorization was revoked or denied.",
      );
      return;
    }
    if (!code || !state) {
      setError("Missing authorization response.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const tokens = await authClient.exchangeCode(code, state);
        const data = await meService.createSession(tokens.access_token);
        if (cancelled) return;
        setUser(data.user);
        navigate("/app", { replace: true });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "authorization_revoked") {
          setError("TrustID authorization was revoked. Continue with TrustID to reconnect.");
        } else {
          setError(userFacingMessage(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate, setUser]);

  return (
    <div className="welcome">
      <div className="welcome-inner">
        <p className="brand-hero">LifeOS</p>
        {error ? (
          <>
            <h1>Could not connect</h1>
            <StatusBanner title={error} />
            <button className="los-btn los-btn--primary" onClick={() => navigate("/")}>
              Try again
            </button>
          </>
        ) : (
          <>
            <h1>Connecting…</h1>
            <p className="lead">Validating TrustID authorization and loading your LifeOS profile.</p>
          </>
        )}
      </div>
    </div>
  );
}
