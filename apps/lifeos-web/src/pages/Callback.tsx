import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, authClient, storeSessionToken, userFacingMessage } from "../lib/api";
import { meService } from "../lib/services";
import { useAuth } from "../hooks/useAuth";
import { StatusBanner } from "../components/StatusBanner";
import { saveReturningIdentity } from "../lib/returningIdentity";

export function CallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState("Validating TrustID authorization…");
  const started = useRef(false);

  useEffect(() => {
    // Run the exchange only once (Strict Mode remounts must not abort a successful flow)
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

    (async () => {
      try {
        setDetail("Exchanging authorization code…");
        const tokens = await authClient.exchangeCode(code, state);
        setDetail("Creating your LifeOS session…");
        let phone: string | null = null;
        try {
          const info = await authClient.fetchUserInfo(tokens.access_token);
          phone =
            info.contacts?.find((c) => c.type === "phone" || c.type === "tel")?.value ?? null;
        } catch {
          /* optional enrichment */
        }
        const data = await meService.createSession(tokens.access_token);
        if (!data.sessionToken) {
          throw new ApiError("Session token missing from LifeOS response.", 502, "lifeos_unavailable");
        }
        storeSessionToken(data.sessionToken);
        saveReturningIdentity(data.user, { phone });
        setUser(data.user);
        navigate("/app", { replace: true });
      } catch (err) {
        if (err instanceof ApiError && err.code === "authorization_revoked") {
          setError("TrustID authorization was revoked. Continue with TrustID to reconnect.");
        } else {
          setError(userFacingMessage(err));
        }
      }
    })();
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
            <p className="lead">{detail}</p>
          </>
        )}
      </div>
    </div>
  );
}
