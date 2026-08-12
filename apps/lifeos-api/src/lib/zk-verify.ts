import type { ZkClaimBundle, ZkVerifyErrorCode } from "@lifeos/shared";
import { config } from "./config.js";

export type ZkVerifyResult =
  | { ok: true; mode: "local" | "remote" | "relaxed"; claimType: string }
  | { ok: false; code: ZkVerifyErrorCode; message: string; claimType?: string };

const groth16ProofSchema = {
  hasShape(proof: ZkClaimBundle["proof"]): boolean {
    return (
      Array.isArray(proof?.pi_a) &&
      proof.pi_a.length >= 2 &&
      Array.isArray(proof?.pi_b) &&
      proof.pi_b.length >= 2 &&
      Array.isArray(proof?.pi_c) &&
      proof.pi_c.length >= 2
    );
  },
};

let cachedVkey: { value: unknown; fetchedAt: number } | null = null;
const VKEY_TTL_MS = 15 * 60_000;

export async function fetchTrustIdVerificationKey(): Promise<unknown> {
  if (cachedVkey && Date.now() - cachedVkey.fetchedAt < VKEY_TTL_MS) {
    return cachedVkey.value;
  }
  const res = await fetch(`${config.trustIdApi}/zk/verification-key`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw Object.assign(new Error("ZK verification key unavailable"), {
      code: "zk_unavailable" as const,
    });
  }
  const value = await res.json();
  cachedVkey = { value, fetchedAt: Date.now() };
  return value;
}

function structuralCheck(claim: ZkClaimBundle, audience?: string): ZkVerifyResult | null {
  if (!claim.claimType || !groth16ProofSchema.hasShape(claim.proof)) {
    return {
      ok: false,
      code: "zk_invalid",
      message: "Malformed Groth16 proof payload.",
      claimType: claim.claimType,
    };
  }
  if (!Array.isArray(claim.publicSignals) || claim.publicSignals.length === 0) {
    return {
      ok: false,
      code: "zk_invalid",
      message: "Missing public signals.",
      claimType: claim.claimType,
    };
  }
  if (claim.issuedAt) {
    const age = Date.now() - new Date(claim.issuedAt).getTime();
    if (Number.isFinite(age) && age > 15 * 60_000) {
      return {
        ok: false,
        code: "zk_expired",
        message: "ZK claim has expired.",
        claimType: claim.claimType,
      };
    }
  }
  if (audience && claim.audience && claim.audience !== audience) {
    return {
      ok: false,
      code: "zk_audience_mismatch",
      message: "ZK claim audience mismatch.",
      claimType: claim.claimType,
    };
  }
  return null;
}

async function verifyRemote(claim: ZkClaimBundle): Promise<ZkVerifyResult> {
  try {
    const res = await fetch(`${config.trustIdApi}/zk/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(claim),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) {
      return {
        ok: false,
        code: "zk_unavailable",
        message: "TrustID ZK verify endpoint unavailable.",
        claimType: claim.claimType,
      };
    }
    const data = (await res.json().catch(() => ({}))) as {
      valid?: boolean;
      ok?: boolean;
      error?: string;
      code?: ZkVerifyErrorCode;
      message?: string;
    };
    if (!res.ok || !(data.valid ?? data.ok)) {
      return {
        ok: false,
        code: data.code ?? "zk_invalid",
        message: data.message || data.error || "ZK proof rejected by TrustID.",
        claimType: claim.claimType,
      };
    }
    return { ok: true, mode: "remote", claimType: claim.claimType };
  } catch {
    return {
      ok: false,
      code: "zk_unavailable",
      message: "Could not reach TrustID ZK verify.",
      claimType: claim.claimType,
    };
  }
}

async function verifyLocal(claim: ZkClaimBundle): Promise<ZkVerifyResult> {
  try {
    const vkey = await fetchTrustIdVerificationKey();
    // Dynamic import keeps cold start lighter when ZK is unused.
    const snarkjs = (await import("snarkjs")) as {
      groth16: { verify: (vkey: unknown, signals: string[], proof: unknown) => Promise<boolean> };
    };
    const valid = await snarkjs.groth16.verify(vkey, claim.publicSignals, claim.proof);
    if (!valid) {
      return {
        ok: false,
        code: "zk_invalid",
        message: "Local Groth16 verification failed.",
        claimType: claim.claimType,
      };
    }
    return { ok: true, mode: "local", claimType: claim.claimType };
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? ((err as { code: ZkVerifyErrorCode }).code ?? "zk_unavailable")
        : "zk_unavailable";
    return {
      ok: false,
      code,
      message: err instanceof Error ? err.message : "Local ZK verification failed.",
      claimType: claim.claimType,
    };
  }
}

/**
 * Hybrid Groth16 verification: prefer TrustID remote verify, fall back to local snarkjs,
 * optionally relax in development when circuits are not yet deployed.
 */
export async function verifyZkClaim(
  claim: ZkClaimBundle,
  opts?: { audience?: string },
): Promise<ZkVerifyResult> {
  const structural = structuralCheck(claim, opts?.audience);
  if (structural) return structural;

  const mode = config.zkVerifyMode;

  if (mode === "remote" || mode === "hybrid") {
    const remote = await verifyRemote(claim);
    if (remote.ok) return remote;
    if (mode === "remote") {
      if (config.zkDevRelaxed && remote.code === "zk_unavailable") {
        return { ok: true, mode: "relaxed", claimType: claim.claimType };
      }
      return remote;
    }
  }

  if (mode === "local" || mode === "hybrid") {
    const local = await verifyLocal(claim);
    if (local.ok) return local;
    if (config.zkDevRelaxed && (local.code === "zk_unavailable" || local.code === "zk_invalid")) {
      // Only relax when shape already passed structural checks.
      return { ok: true, mode: "relaxed", claimType: claim.claimType };
    }
    return local;
  }

  if (config.zkDevRelaxed) {
    return { ok: true, mode: "relaxed", claimType: claim.claimType };
  }

  return {
    ok: false,
    code: "zk_unavailable",
    message: "No ZK verification mode configured.",
    claimType: claim.claimType,
  };
}

export async function verifyZkClaims(
  claims: ZkClaimBundle[],
  opts?: { audience?: string; required?: boolean },
): Promise<
  | { ok: true; results: ZkVerifyResult[] }
  | { ok: false; error: Extract<ZkVerifyResult, { ok: false }> }
> {
  if (!claims.length) {
    if (opts?.required) {
      return {
        ok: false,
        error: {
          ok: false,
          code: "zk_required",
          message: "ZK claims are required for this session handshake.",
        },
      };
    }
    return { ok: true, results: [] };
  }

  const results: ZkVerifyResult[] = [];
  for (const claim of claims) {
    const result = await verifyZkClaim(claim, opts);
    results.push(result);
    if (!result.ok) return { ok: false, error: result };
  }
  return { ok: true, results };
}
