# DUAL-KERNEL DK1 REPORT

Verified locally on 2026-09-24. Scope: executable contract and deterministic media read proof, not production media synchronization or UI rollout.

## Repository state before work

Both repositories were already dirty. LifeOS had 15 tracked modified files, including package manifests/lockfile, AppShell, SpacePresentationContext, broadcastSchedule, offlineKernelRuntime, Space adapter, routes, tests and tsconfig.tsbuildinfo. Existing untracked work included onlineKernel.ts, offlineKernelMapper.ts, experienceMode.ts, capability/trust adapters and their tests. Existing source work was preserved; adapters were extended without replacing their existing functions. The build refreshed the already-modified generated tsconfig.tsbuildinfo.

OS SHELL had existing OS Xperience application, contract, UI and release-script modifications; space-runtime, offline-kernel, space-capability-bridge and space-resolution were untracked packages. No DK1 source changes were made in OS SHELL. The preceding, separate space-resolution request changed only that package's package.json and added test/resolution.test.ts (16 passing tests; typecheck and build passed; src/index.ts unchanged).

The three canonical locations and exports were inspected before edits. Space Runtime README identifies the maintained canonical source and development artifact wiring. Tests exist for all three packages. No package-specific freeze declaration was found in repository docs; the user-requested freeze was enforced explicitly. It is not represented here as a verified historical release freeze.

## Existing abstractions reused

- Existing @lifeos/shared product contract package; no new package or dependency.
- Existing MediaItem domain type and publication projection identity mapping.
- Existing fetchLifeOsPublicationFeed, api, ApiError and online access policy.
- Canonical LastValidStore<MediaItem>, VersionedProjection and MemoryLastValidStore from @digiconomy/offline-kernel.
- Existing immersiveFeedController host presentation module.

Capability Bridge remains the capability availability registry, unchanged. Its AVAILABLE/DEGRADED vocabulary and Space Runtime's SUPPORTED vocabulary do not describe queued work, step-up, conflict or synced completion. OS Shell's CapabilityExecutionResult models device capability execution rather than these generic product outcomes, so it was not repurposed.

## New contracts introduced

packages/shared/src/kernel-contract.ts exports APP/SPACE execution mode, JSON-compatible discriminated ExecutionResult, structured reasons, optional retry/reconciliation metadata, and transport vocabulary: INTERNET, LOCAL_NETWORK, NEARBY, EDGE, RELAY, PRELOADED, NO_ROUTE. No transport is implemented. QUEUED requires an operation ID and cannot carry completed data. Only COMPLETED_LOCAL and COMPLETED_SYNCED carry data. All nine requested result states are represented and serialization-tested.

## Files changed

Modified existing files (relative to LifeOS):

- packages/shared/src/index.ts
- apps/lifeos-web/src/lib/onlineKernel.ts (pre-existing untracked file; extended)
- apps/lifeos-web/src/lib/offlineKernelRuntime.ts
- apps/lifeos-web/src/lib/mybrandPublicFeed.ts
- apps/lifeos-web/src/lib/immersiveFeedController.ts

Added:

- packages/shared/src/kernel-contract.ts
- apps/lifeos-web/src/lib/dualKernelMedia.ts
- apps/lifeos-web/test/dk1-kernel-contract.test.ts
- apps/lifeos-web/test/dk1-media-capability.test.ts
- apps/lifeos-web/test/fixtures/dk1Media.ts
- apps/lifeos-web/tsconfig.dk1.json
- docs/dual-kernel-dk1.md
- docs/dual-kernel-dk1-integrity.json

Generated: shared dist outputs, web dist/PWA outputs, and apps/lifeos-web/tsconfig.tsbuildinfo. No package manifests, lockfile, UI components, frozen package files, identity or trust implementation were changed for DK1.

## Shared media capability

MediaCapability<MediaItem>.resolve({ contentId }) returns an execution result containing the same canonical content ID, existing product metadata, availability and source semantics. createDualKernelMedia composes the two adapters and selects the provider by execution mode. It is not a second registry or Capability Bridge.

## Online adapter

createOnlineMediaCapability defaults to the existing publication reader/API, including the existing eco:application:publication identity mapping and pagination. An opt-in throwOnError parameter exposes API failures to the capability; existing feed callers retain empty-on-error behavior. Reads distinguish route loss, denial, step-up, content absence and general failure. COMPLETED_SYNCED denotes completion of the online metadata read, not a download or offline caching guarantee. Existing access-policy functions are unchanged.

## Offline adapter

createOfflineMediaCapability reads only the caller-supplied canonical local projection store. DK1 accepts self-contained base64 image/audio/video data; a remote URL, ownership/watched flag, missing asset or revoked blob URL cannot establish local availability. Projection identity, version and timestamp are checked. A miss with NO_ROUTE returns AWAITING_ROUTE; with an available route it returns ONLINE_REQUIRED without fetching. Store failures return FAILED. Existing station, TV/Radio, broadcast and catalog behavior is unchanged.

## Executable proof

The fixture uses one existing MediaItem with ID content:test-media-001 and actual embedded 1x1 PNG bytes. The same item is returned via an instrumented online reader using the existing api client and preloaded into a real canonical MemoryLastValidStore with a version/timestamp. APP returns COMPLETED_SYNCED; SPACE returns COMPLETED_LOCAL. Both preserve the exact same canonical identity and metadata. The test-only /__test__/dk1/media path is mocked, not an added or claimed production endpoint. A separate integration test exercises the default existing /v1/publications/feed path and its actual identity mapper.

## Network-disabled proof

The mandatory A-D test first verifies the APP network request. It then disables connectivity, makes fetch reject, and traps XMLHttpRequest.open. SPACE still returns the embedded PNG and its decoded PNG byte signature is asserted. content:not-synchronized returns AWAITING_ROUTE with no data. SPACE makes zero fetch, XHR or online-reader calls. APP with NO_ROUTE also fails truthfully. Additional tests prove that an actual fetch rejection becomes route failure and that SPACE never falls through to APP even when internet is available.

## Presentation/execution independence proof

Eight executable tests cover both APP and SPACE with each of FEED, WATCH, CINEMA and TV. Presentation is not an input to capability resolution. Host-only policy selects PHONE -> FEED, TABLET -> WATCH, DESKTOP -> CINEMA and TV -> TV. Input/display descriptors are supported as host context; a wide desktop remains CINEMA, while a small explicit TV remains TV. No screen-width TV detection or UI changes were introduced. Existing ExperienceMode presentation/opt-in behavior is untouched; this foundation does not silently wire UI toggles to new behavior.

## Frozen-package integrity evidence

docs/dual-kernel-dk1-integrity.json records before/after SHA256 for every file in all three frozen packages, including source, tests, manifests and dist. All 23 files are identical; the before/after path sets were also compared to detect additions/deletions.

LifeOS installed offline-kernel/dist/index.js matches canonical SHA256 5063112E3786919ED3EAF591EC6C10BA5ACBD04F7B854AE36153DC46122A95A1. Its installed space-capability-bridge/dist/index.js matches canonical SHA256 F5A338CB12C4EEF714133FEB346EB026604C66FC2B97E7CAD053E136289F188D. LifeOS resolves Space Runtime directly to the canonical OS SHELL/packages/space-runtime/dist/index.js through its existing dependency. No artifacts were rebuilt in the frozen packages.

## Tests run

From LifeOS:

```powershell
npm run build -w @lifeos/shared
npm test -w @lifeos/web -- test/dk1-kernel-contract.test.ts test/dk1-media-capability.test.ts test/offline-kernel-adapter.test.ts test/online-kernel.test.ts test/capability-bridge.test.ts test/space-contract-components.test.tsx
npx tsc -p apps/lifeos-web/tsconfig.dk1.json --noEmit
npm test -w @lifeos/web
npm run build -w @lifeos/web
npm run typecheck -w @lifeos/api
git diff --check
```

From OS SHELL:

```powershell
node --import tsx --test packages/offline-kernel/test/*.test.ts packages/space-runtime/test/*.test.ts packages/space-capability-bridge/test/*.test.ts
```

## Exact test results

| Check | Result |
| --- | --- |
| New contract/presentation tests | 11/11 passed |
| New media capability/network tests | 14/14 passed |
| Focused LifeOS run including new tests | 45/45 passed; 6 files |
| Full LifeOS web regression including new tests | 151/151 passed; 26 files |
| Canonical Offline Kernel | 5/5 passed |
| Canonical Space Runtime V1 | 1/1 passed |
| Canonical Capability Bridge | 27/27 passed |
| Canonical combined run | 33/33 passed |
| DK1 + web source TypeScript, including negative type assertions | Passed; exit 0 |
| LifeOS API TypeScript | Passed; exit 0 |
| Shared build | Passed; exit 0 |
| LifeOS web TypeScript/Vite/PWA build | Passed; exit 0 |
| git diff --check | Passed; exit 0 |
| Frozen file hashes/path sets | 23/23 unchanged |

Counts overlap: focused and new tests are included in the full 151-test run. No failures or skipped tests occurred in the executed suites. The earlier independent space-resolution request passed 16/16 tests and its TypeScript/build commands.

## Environment blockers

None for DK1. Vitest emitted non-failing Node --localstorage-file warnings. Git emitted line-ending notices. Database-backed API integration/e2e suites were not run; no PostgreSQL or live backend availability is claimed. Default API behavior was exercised with a mocked HTTP boundary. No live deployment/browser verification was requested or claimed.

## Git diff summary

Relative to the captured pre-DK1 working files, the five extended files have 107 added and 1 removed line. Six new implementation/test/config files and two report/evidence files were added. The web build refreshed existing generated build metadata. Git's whole-repository diff includes substantial pre-existing user work and does not represent the DK1-only delta; untracked onlineKernel.ts was compared against its saved pre-edit copy. All existing tests and frozen package files remain unchanged. Nothing was committed, pushed or deployed.

## Remaining work

No required DK1 work remains. This verifies a deterministic, preloaded local media read and the shared adapter contract. A durable media cache, Saved Media migration, synchronization, reconciliation, mutation queues, new transport implementations, playback continuity and UI adoption remain outside this phase. No durable offline playback or production-wide availability is inferred from the in-memory proof.

DUAL-KERNEL DK1 — VERIFIED
