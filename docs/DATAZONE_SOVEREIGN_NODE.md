# DataZone Sovereign Storage Node — Architecture Spec

**Status:** Ready for active development  
**Port:** `IDataZoneStorageProvider` (`apps/lifeos-api/src/ports/datazone.ts`)  
**Shell today:** Unbound — `GET /storage/status` reports `module_unbound`; `POST /storage/objects` returns 503 until bound.

LifeOS is a **gateway**, not a storage engine. DataZone is an independent sovereign node that owns ciphertext-at-rest. LifeOS talks to it only through the DI port.

---

## 1. Placement in the ecosystem

```text
???????????????????????????????????????????????????????????????
? TrustID (IdP)                                               ?
?  Zero-PII ZK claims · Tier1 vault · Tier2 X3DH / guardians  ?
???????????????????????????????????????????????????????????????
                            ? OAuth + ZK session handshake
                            ?
???????????????????????????????????????????????????????????????
? LifeOS Shell (Gateway)                                      ?
?  container.bindDataZone(adapter)                            ?
?  /storage/*  ?  IDataZoneStorageProvider                    ?
?  Experiences / FinProv / ElfCom remain separate ports       ?
???????????????????????????????????????????????????????????????
                            ? mTLS or signed node JWT
                            ? namespace-scoped object API
                            ?
???????????????????????????????????????????????????????????????
? DataZone Sovereign Node                                     ?
?  Object store · namespace ACLs · optional client E2E seal   ?
?  No PII index · No TrustID private keys · No LifeOS DB blobs?
???????????????????????????????????????????????????????????????
```

**Hard rules**

1. LifeOS never embeds S3/MinIO/FS drivers — only the adapter.
2. Object **namespaces** are keyed by LifeOS `userId` / experience scope — never by email or phone.
3. Prefer **client-sealed** payloads (Tier 1 vault / X3DH) when content is sensitive; DataZone stores opaque bytes.
4. TrustID does not host DataZone data. Secondary-device vault metadata may use TrustID X3DH blind relay; durable blobs go to DataZone.

---

## 2. Port contract (canonical)

```ts
export type DataZoneObjectRef = {
  namespace: string;
  key: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
};

export interface IDataZoneStorageProvider {
  readonly nodeId: "datazone";
  readonly bound: boolean; // must be true for real adapters
  put(input: {
    namespace: string;
    key: string;
    body: Uint8Array | string;
    contentType?: string;
  }): Promise<DataZoneObjectRef>;
  get(input: {
    namespace: string;
    key: string;
  }): Promise<{ body: Uint8Array; contentType?: string } | null>;
  delete(input: { namespace: string; key: string }): Promise<void>;
  exists(input: { namespace: string; key: string }): Promise<boolean>;
}
```

### Suggested V1 extensions (additive — do not break the port)

Keep the interface stable for LifeOS; put richer ops on the **node HTTP API**, then optionally widen the port later:

| Node API (internal) | Purpose |
|---------------------|---------|
| `HEAD /v1/objects/...` | Exists + etag without body |
| `GET /v1/objects?...prefix=` | List keys in namespace |
| `POST /v1/multipart/*` | Large uploads |
| `POST /v1/grants` | Time-boxed capability tokens for experiences |

---

## 3. Data exchange contracts

### 3.1 Namespace grammar

```
namespace = "u:" <lifeosUserId>
          | "xp:" <experienceId> ":" <lifeosUserId>
          | "sys:" <component>            // LifeOS system only
key       = path-like, max 512 chars, no ".." segments
```

Examples:

- `u:clx…/preferences.json` — shell prefs backup
- `xp:hospitality:clx…/bookings/2026-08.json` — experience-scoped
- `sys:lifeos/registry-snapshot.json` — operator only

### 3.2 LifeOS ? adapter (in-process)

Current HTTP:

| Method | Path | Behavior |
|--------|------|----------|
| `GET` | `/storage/status` | `{ module, bound, status, message }` |
| `POST` | `/storage/objects` | body `{ namespace, key, body, contentType? }` ? `{ object: DataZoneObjectRef }` |

**V1 route expansion (LifeOS, still via port):**

| Method | Path | Port call |
|--------|------|-----------|
| `GET` | `/storage/objects?namespace&key` | `get` |
| `DELETE` | `/storage/objects?namespace&key` | `delete` |
| `HEAD` | `/storage/objects?namespace&key` | `exists` (+ optional etag header) |

All routes: `requireSession`. Authorize: namespace must match `req.auth.userId` unless admin/`sys:` with operator role.

### 3.3 Adapter ? DataZone node (out-of-process)

Recommended wire protocol: HTTPS JSON + raw body for blobs.

```
PUT  /v1/ns/{namespace}/objects/{key}
     Headers: Authorization: Bearer <node-jwt>
              Content-Type: <contentType>
              X-TrustID-Nullifier: <optional, for audit>
     Body: raw bytes
     ? 200 { namespace, key, sizeBytes, etag, contentType }

GET  /v1/ns/{namespace}/objects/{key}
     ? 200 raw bytes + Content-Type / ETag
     ? 404

DELETE /v1/ns/{namespace}/objects/{key}
     ? 204

HEAD /v1/ns/{namespace}/objects/{key}
     ? 200 / 404
```

**Node JWT claims (minted by LifeOS signing key or shared HMAC for V1):**

```json
{
  "iss": "lifeos",
  "aud": "datazone",
  "sub": "<lifeosUserId>",
  "ns": ["u:<lifeosUserId>"],
  "scp": ["object:read", "object:write", "object:delete"],
  "exp": 1710000000
}
```

DataZone verifies `aud`, `exp`, and that requested `namespace` ? `ns`.

### 3.4 Object metadata (node-local DB)

| Field | Notes |
|-------|-------|
| `namespace`, `key` | PK |
| `content_type` | Optional |
| `size_bytes` | |
| `etag` | Content hash (SHA-256 hex) |
| `ciphertext_hint` | `none` \| `client_sealed` \| `node_sealed` |
| `created_at` / `updated_at` | |
| `owner_sub` | From JWT `sub` — not email |

Plaintext search indexes are **out of scope** for V1.

---

## 4. Security model

| Layer | Responsibility |
|-------|----------------|
| TrustID | Identity / ZK / device trust — no blob storage |
| LifeOS | Session auth, namespace ACL, port binding |
| DataZone | AuthZ on capability JWT, durable bytes, optional server-side AES if configured |
| Client | Tier 1 seal before `put` when content is sensitive |

- At-rest encryption: node disk volume encryption **required**; optional per-object AES-GCM with DEK in node KMS/`SEAL_KEY`.
- Transport: TLS; prefer mTLS between LifeOS and DataZone in production.
- Audit: node logs `{ sub, ns, key, op, etag }` — never body bytes.
- Wipe: honor LifeOS account wipe by deleting `u:{userId}/**` (call from LifeOS wipe hook).

---

## 5. Proposed repo layout

```
LifeOS/
  packages/
    datazone-contract/     # shared types mirroring IDataZoneStorageProvider + wire DTOs
  apps/
    datazone-node/         # sovereign Fastify service + Prisma/SQLite|Postgres + blob FS/S3
    lifeos-api/
      src/
        adapters/
          datazone-http.ts # implements IDataZoneStorageProvider ? node HTTP
        ports/datazone.ts  # unchanged contract
```

Alternatively a separate `DataZone` monorepo that publishes `@lifeos/datazone-adapter` — same port, different deploy unit.

---

## 6. Initialization / bootstrap sequence

### Phase A — Local in-process (day 1)

Fastest path to green `/storage/*` without a second process:

1. Implement `LocalFsDataZoneProvider` (`bound: true`) writing under `DATAZONE_ROOT/{namespace}/{key}`.
2. In `apps/lifeos-api/src/index.ts` **before** `container.boot()`:

```ts
import { container } from "./container.js";
import { LocalFsDataZoneProvider } from "./adapters/datazone-local-fs.js";

if (process.env.DATAZONE_MODE === "local") {
  container.bindDataZone(
    new LocalFsDataZoneProvider(process.env.DATAZONE_ROOT ?? ".datazone"),
  );
}
container.boot();
```

3. Expand `storage.ts` with GET/DELETE/HEAD.
4. Update `sovereign-ports.test.ts` for optional bound mode.
5. Smoke: session ? `POST /storage/objects` ? `GET` ? `DELETE`.

### Phase B — Sovereign node process

1. Scaffold `apps/datazone-node` (Fastify + Prisma + local blob dir).
2. Implement wire API §3.3 + JWT verify.
3. Implement `HttpDataZoneProvider` in LifeOS (`DATAZONE_MODE=http`, `DATAZONE_BASE_URL`, `DATAZONE_NODE_SECRET`).
4. `container.bindDataZone(new HttpDataZoneProvider(...))`.
5. Deploy DataZone as its own Railway/Fly service; LifeOS only holds URL + secret.

### Phase C — Production hardening

1. mTLS or SPIFFE between LifeOS ? DataZone.
2. Multipart + size quotas per namespace.
3. Experience-scoped grants (`xp:…`) issued at experience handoff.
4. Hook account wipe ? namespace purge.
5. Optional: client-sealed object convention documented for TrustID vault backups.

---

## 7. Boot checklist (definition of done for V1)

- [ ] `IDataZoneStorageProvider` adapter with `bound: true`
- [ ] `container.bindDataZone` called when `DATAZONE_MODE` set
- [ ] `/health.modules` shows `datazone: bound`
- [ ] Session-gated put/get/delete/exists
- [ ] Namespace ACL enforces `u:{session.userId}`
- [ ] No email/phone in metadata
- [ ] Unbound path still returns 503 when mode unset
- [ ] Tests: unbound default + bound happy path

---

## 8. Explicit non-goals (V1)

- CDN / public object URLs
- Full-text search over blobs
- Cross-tenant object sharing UI
- Replacing TrustID Tier 1 on-device vault
- Storing WebAuthn private keys or Shamir master secrets server-side

---

## 9. Integration touchpoints

| System | Touch |
|--------|--------|
| LifeOS container | `bindDataZone` |
| LifeOS storage routes | Already stubbed |
| LifeOS wipe | Add namespace delete |
| TrustID | None required for V1; later vault-backup object format |
| Experience SDK | Optional Phase C grants — not required to bind the port |

**Start here:** Phase A `LocalFsDataZoneProvider` + widen `storage.ts`, then extract the node.
