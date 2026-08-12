function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

/** Cookie SameSite: "lax" for same-site (/api proxy), "none" for cross-site Netlify→Railway. */
const cookieSameSiteEnv = (process.env.COOKIE_SAMESITE ?? "").toLowerCase();
const cookieSameSite: "lax" | "none" | "strict" =
  cookieSameSiteEnv === "none" || cookieSameSiteEnv === "lax" || cookieSameSiteEnv === "strict"
    ? cookieSameSiteEnv
    : (process.env.NODE_ENV ?? "development") === "production"
      ? "none"
      : "lax";

export const config = {
  port: Number(process.env.PORT ?? 8790),
  host: process.env.HOST ?? "0.0.0.0",
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: (process.env.NODE_ENV ?? "development") !== "production",
  cookieSecret: required("COOKIE_SECRET", "lifeos-dev-cookie-secret"),
  /** Inactivity window — each authenticated request slides this forward. Default 24h. */
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 24),
  trustIdApi: required("TRUSTID_API", "http://localhost:8787"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5174,http://localhost:5180")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  tokenNetworkProvider: (process.env.TOKEN_NETWORK_PROVIDER ?? "mock") as "mock" | "real",
  sessionCookieName: "lifeos_session",
  sessionHeaderName: "x-lifeos-session",
  cookieSameSite,
  /** Secure cookies whenever not in local HTTP dev. */
  cookieSecure: (process.env.COOKIE_SECURE ?? "").toLowerCase() === "true"
    ? true
    : (process.env.COOKIE_SECURE ?? "").toLowerCase() === "false"
      ? false
      : (process.env.NODE_ENV ?? "development") === "production",
  experienceTokenTtlSeconds: Number(process.env.EXPERIENCE_TOKEN_TTL_SECONDS ?? 300),
  /**
   * ZK verification strategy:
   * - hybrid (default): TrustID /zk/verify then local snarkjs
   * - remote: TrustID only
   * - local: snarkjs + TrustID verification key only
   */
  zkVerifyMode: (process.env.ZK_VERIFY_MODE ?? "hybrid") as "hybrid" | "remote" | "local",
  /** Require zkClaims on POST /auth/session when gateway advertises zk.available */
  zkRequireClaims: (process.env.ZK_REQUIRE_CLAIMS ?? "").toLowerCase() === "true",
  /**
   * Dev/staging: accept structurally valid claims when TrustID circuits are not deployed.
   * Never enable in production.
   */
  zkDevRelaxed:
    (process.env.ZK_DEV_RELAXED ?? "").toLowerCase() === "true" ||
    ((process.env.NODE_ENV ?? "development") !== "production" &&
      (process.env.ZK_DEV_RELAXED ?? "true").toLowerCase() !== "false"),
  /** OAuth client id used as ZK audience. */
  trustIdClientId: process.env.TRUSTID_CLIENT_ID ?? "lifeos_mock_public",
};
