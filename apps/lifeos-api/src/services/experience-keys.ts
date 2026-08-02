import { createPrivateKey, createPublicKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { exportJWK, importJWK, type JWK, type KeyLike } from "jose";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ExperienceKeyPair = {
  kid: string;
  privateKey: KeyLike;
  publicKey: KeyLike;
  publicJwk: JWK;
};

export interface ExperienceSigningKeyProvider {
  getActiveSigningKey(): Promise<ExperienceKeyPair>;
  getPublicKeys(): Promise<{ kid: string; publicJwk: JWK }[]>;
}

const DEV_KID = "lifeos-key-2026-01";

function repoKeysPath() {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "../../../../.keys/experience-ed25519.json");
}

async function fromPem(privatePem: string, publicPem: string, kid: string): Promise<ExperienceKeyPair> {
  const privateKey = createPrivateKey(privatePem);
  const publicKey = createPublicKey(publicPem);
  const publicJwk = await exportJWK(publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = "EdDSA";
  publicJwk.use = "sig";
  return { kid, privateKey, publicKey, publicJwk };
}

async function generateAndPersist(path: string): Promise<ExperienceKeyPair> {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({ kid: DEV_KID, privatePem, publicPem }, null, 2),
    { mode: 0o600 },
  );
  return fromPem(privatePem, publicPem, DEV_KID);
}

/**
 * Loads Ed25519 keys from env or generates a local development keypair.
 * Private keys are never exposed via API.
 */
export class EnvExperienceSigningKeyProvider implements ExperienceSigningKeyProvider {
  private cached: ExperienceKeyPair | null = null;

  async getActiveSigningKey(): Promise<ExperienceKeyPair> {
    if (this.cached) return this.cached;

    const privatePem = process.env.EXPERIENCE_TOKEN_PRIVATE_KEY;
    const publicPem = process.env.EXPERIENCE_TOKEN_PUBLIC_KEY;
    const kid = process.env.EXPERIENCE_TOKEN_KID ?? DEV_KID;

    if (privatePem && publicPem) {
      this.cached = await fromPem(
        privatePem.replace(/\\n/g, "\n"),
        publicPem.replace(/\\n/g, "\n"),
        kid,
      );
      return this.cached;
    }

    const path = repoKeysPath();
    if (existsSync(path)) {
      const raw = JSON.parse(readFileSync(path, "utf8")) as {
        kid: string;
        privatePem: string;
        publicPem: string;
      };
      this.cached = await fromPem(raw.privatePem, raw.publicPem, raw.kid || DEV_KID);
      return this.cached;
    }

    this.cached = await generateAndPersist(path);
    return this.cached;
  }

  async getPublicKeys() {
    const active = await this.getActiveSigningKey();
    return [{ kid: active.kid, publicJwk: active.publicJwk }];
  }
}

let provider: ExperienceSigningKeyProvider | null = null;

export function getSigningKeyProvider(): ExperienceSigningKeyProvider {
  if (!provider) provider = new EnvExperienceSigningKeyProvider();
  return provider;
}

/** Test helper — inject a key provider. */
export function setSigningKeyProvider(next: ExperienceSigningKeyProvider | null) {
  provider = next;
}

export async function importPublicJwk(jwk: JWK): Promise<KeyLike> {
  return importJWK(jwk, jwk.alg ?? "EdDSA");
}

export type { KeyObject };
