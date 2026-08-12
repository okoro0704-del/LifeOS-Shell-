import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthClientError } from "@lifeos/auth-client";
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
  const [detail, setDetail] = useState("Validating LifeOS Gateway authorization…");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");

    if (oauthError) {
      setError(
        oauthError === "access_denied"
          ? "Authorization was denied."
          : "LifeOS Gateway authorization was revoked or denied.",
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

        setDetail("Collecting zero-knowledge identity claims…");
        const handshake = await authClient.buildSessionHandshake(tokens.access_token);

        setDetail("Creating your LifeOS session…");
        // Contacts/names (if any) stay client-ephemeral for returning UX — never sent as persisted PII.
        // Optional RAM-only presentation on the API is omitted by default (zero-PII).
        const data = await meService.createSession(tokens.access_token, {
          zkClaims: handshake.zkClaims,
        });
        if (!data.sessionToken) {
          throw new ApiError("Session token missing from LifeOS response.", 502, "lifeos_unavailable");
        }
        storeSessionToken(data.sessionToken);
        saveReturningIdentity(data.user);
        setUser(data.user);
        navigate("/app", { replace: true });
      } catch (err) {
        if (err instanceof AuthClientError) {
          setError(err.message);
        } else if (err instanceof ApiError && err.code === "authorization_revoked") {
          setError("Authorization was revoked. Log into LifeOS again to reconnect.");
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
