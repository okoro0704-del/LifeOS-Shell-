import { timingSafeEqual } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { config } from "../lib/config.js";

const MYBRANDOS_RAILWAY_ORIGIN =
  (process.env.MYBRANDOS_API_URL ?? "https://mybrandos-production.up.railway.app").replace(/\/$/, "");
const PUBLIC_ROOT_DOMAIN = (process.env.LIFEOS_PUBLIC_ROOT_DOMAIN ?? "getlifeos.app").replace(/^\./, "");

export type ReconcileCounts = {
  applicationsDiscovered: number;
  eligiblePublicationApps: number;
  canonicalPublicationsScanned: number;
  eligiblePublic: number;
  alreadyInLifeOs: number;
  missing: number;
  ineligible: number;
  brokenMedia: number;
  errors: number;
  created: number;
  updated: number;
  hidden: number;
  skippedExisting: number;
  failed: number;
  byApplication: Array<{
    applicationId: string;
    tenantId: string;
    slug: string;
    publicDestination: string;
    canonical: number;
    eligible: number;
    alreadyProjected: number;
    recovered: number;
    hidden: number;
    brokenMedia: number;
    errors: number;
    /** Publications owned by origin pushes; the pull reconciler leaves them untouched. */
    pushManaged: number;
  }>;
};

type PublicAssetCard = {
  id: string;
  title?: string;
  description?: string;
  assetType?: string;
  publishedAt?: string;
  createdAt?: string;
  coverAvailable?: boolean;
  presentationTypes?: string[];
  presentation?: { body?: string };
  status?: string;
  visibility?: string;
  privacy?: string;
  /** Explicit audience from the origin (mybrandOS public_assets_v1). Anything but FREE is never ingested. */
  access?: string | null;
  /** True when the origin only exposes a paid teaser. */
  locked?: boolean;
};

type PublicExperience = {
  slug?: string;
  publicEnabled?: boolean;
  identity?: { displayName?: string; creatorId?: string; trustId?: string };
  publishedAssets?: PublicAssetCard[];
  error?: string;
};

export type IngestPublicationInput = {
  originApplicationId: string;
  originTenantId: string;
  originPublicationId: string;
  originAssetIds?: string[];
  originCreatorId?: string | null;
  publicationType: string;
  privacy?: string;
  publicationState?: string;
  title: string;
  caption?: string;
  authorDisplayName?: string;
  authorSlug: string;
  publicDestinationUrl: string;
  mediaUrl?: string | null;
  mediaStatus?: string;
  publishedAt: string | Date;
  rawMetadata?: Record<string, unknown>;
  /** Monotonic per publication at the origin; pushed deliveries only. */
  originSequence?: number | null;
};

function isLocalhostUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function normalizeSlug(value: string): string {
  return value.replace(/^@/, "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

function extractGetlifeosSlug(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const suffix = `.${PUBLIC_ROOT_DOMAIN}`;
    if (!host.endsWith(suffix)) return null;
    const slug = host.slice(0, -suffix.length);
    if (!slug || slug.includes(".")) return null;
    return normalizeSlug(slug);
  } catch {
    return null;
  }
}

function publicDestinationForSlug(slug: string): string {
  return `https://${slug}.${PUBLIC_ROOT_DOMAIN}/`;
}

function isPlaceholderSlug(slug: string, applicationId: string): boolean {
  const s = normalizeSlug(slug);
  const app = normalizeSlug(applicationId);
  if (!s) return true;
  if (s === app) return true;
  if (s === "mybrandos" || s === "hospitalityos" || s === "serviceos" || s === "ecommerceos") return true;
  return false;
}

function mapPublicationType(asset: PublicAssetCard): string | null {
  const types = (asset.presentationTypes ?? []).map((t) => String(t).toUpperCase());
  const assetType = String(asset.assetType ?? "").toUpperCase();
  if (types.includes("POST") || assetType === "DESIGN") return types.includes("PHOTO") ? "PHOTO" : "POST";
  if (types.includes("PHOTO") || assetType === "PHOTO") return "PHOTO";
  if (types.includes("VIDEO") || assetType === "VIDEO") return "VIDEO";
  if (types.includes("REEL")) return "REEL";
  if (assetType === "WRITING" && types.includes("POST")) return "POST";
  return null;
}

function isEligiblePublicAsset(asset: PublicAssetCard): { ok: boolean; reason?: string } {
  const status = String(asset.status ?? "PUBLISHED").toUpperCase();
  const visibility = String(asset.visibility ?? asset.privacy ?? "PUBLIC").toUpperCase();
  if (["DRAFT", "DELETED", "REVOKED", "SUSPENDED", "ARCHIVED"].includes(status)) {
    return { ok: false, reason: `status:${status}` };
  }
  if (["PRIVATE", "TENANT_PRIVATE", "STAFF", "ADMIN", "SCHEDULED"].includes(visibility)) {
    return { ok: false, reason: `privacy:${visibility}` };
  }
  if (visibility && visibility !== "PUBLIC" && visibility !== "PUBLISHED") {
    return { ok: false, reason: `privacy:${visibility}` };
  }
  // Fail closed: only an explicit, unlocked FREE classification from the origin is consumer-public.
  if (asset.locked === true) return { ok: false, reason: "protected" };
  if (String(asset.access ?? "").toUpperCase() !== "FREE") return { ok: false, reason: "audience_unclassified" };
  if (!mapPublicationType(asset)) return { ok: false, reason: "unsupported_type" };
  return { ok: true };
}

/** One identity per origin publication: mybrandOS sources always project under "mybrandos", like pushes. */
function canonicalApplicationId(source: { applicationId: string; publicApiBaseUrl: string }): string {
  const base = source.publicApiBaseUrl.replace(/\/$/, "");
  return base === MYBRANDOS_RAILWAY_ORIGIN || source.applicationId === "mybrandos" ? "mybrandos" : source.applicationId;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; json: unknown | null }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "follow",
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, status: res.status, json: null };
    }
    const json = (await res.json().catch(() => null)) as unknown;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

type ProbeResult =
  | { kind: "ok"; experience: PublicExperience }
  /** The origin answered that this public space does not exist (disabled, suspended or removed). */
  | { kind: "gone" }
  /** Unreachable or unexpected answer: says nothing about the space, so nothing is hidden. */
  | { kind: "error" };

async function probePublicExperience(apiBase: string, slug: string): Promise<ProbeResult> {
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/public/${encodeURIComponent(slug)}`;
  const result = await fetchJson(url);
  if ((result.status === 404 || result.status === 410) && result.json && typeof result.json === "object") {
    return { kind: "gone" };
  }
  if (!result.ok || !result.json || typeof result.json !== "object") return { kind: "error" };
  const body = result.json as PublicExperience;
  if (body.error) return { kind: "error" };
  if (body.publicEnabled === false) return { kind: "gone" };
  if (!Array.isArray(body.publishedAssets) && body.publicEnabled !== true) return { kind: "error" };
  return { kind: "ok", experience: body };
}

async function headOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (res.ok) return true;
    const get = await fetch(url, { method: "GET", redirect: "follow" });
    return get.ok;
  } catch {
    return false;
  }
}

function emptyCounts(): ReconcileCounts {
  return {
    applicationsDiscovered: 0,
    eligiblePublicationApps: 0,
    canonicalPublicationsScanned: 0,
    eligiblePublic: 0,
    alreadyInLifeOs: 0,
    missing: 0,
    ineligible: 0,
    brokenMedia: 0,
    errors: 0,
    created: 0,
    updated: 0,
    hidden: 0,
    skippedExisting: 0,
    failed: 0,
    byApplication: [],
  };
}

type SourceCandidate = {
  applicationId: string;
  tenantId: string;
  slug: string;
  displayName: string;
  publicApiBaseUrl: string;
  publicDestination: string;
};

/**
 * Discover publication-capable origins from Portal catalog + installed apps + ops seeds.
 * Does not invent content — only registers sources that speak a real public publication contract.
 */
export async function discoverPublicationSources(): Promise<{
  discovered: number;
  eligible: number;
  sources: Array<{ id: string; applicationId: string; tenantId: string; slug: string }>;
}> {
  const catalog = await prisma.appCatalogEntry.findMany({ where: { status: "active" } });
  const installed = await prisma.installedApp.findMany({
    where: { status: "active" },
    select: {
      appId: true,
      tenantId: true,
      displayName: true,
      subdomain: true,
      experienceUrl: true,
      approvedOrigin: true,
      standaloneUrl: true,
      launchUrl: true,
      preset: true,
    },
  });

  const candidates = new Map<string, SourceCandidate>();

  const addCandidate = (input: SourceCandidate) => {
    const slug = normalizeSlug(input.slug);
    if (!slug || isLocalhostUrl(input.publicApiBaseUrl) || isLocalhostUrl(input.publicDestination)) return;
    const key = `${input.applicationId}::${input.tenantId}::${slug}`;
    if (!candidates.has(key)) {
      candidates.set(key, { ...input, slug });
    }
  };

  const considerRow = (row: {
    appId: string;
    tenantId: string;
    displayName: string;
    subdomain: string;
    experienceUrl: string;
    approvedOrigin: string;
    launchUrl?: string | null;
    standaloneUrl?: string | null;
    preset?: string | null;
  }) => {
    const urls = [row.experienceUrl, row.approvedOrigin, row.launchUrl ?? "", row.standaloneUrl ?? ""];
    if (urls.some(isLocalhostUrl) && !urls.some((u) => u.includes(PUBLIC_ROOT_DOMAIN))) return;

    const apiBase = (() => {
      const origin = (row.approvedOrigin || row.experienceUrl || "").replace(/\/$/, "");
      if (!origin || isLocalhostUrl(origin)) {
        if (row.appId === "mybrandos" || row.preset === "mybrandos") return MYBRANDOS_RAILWAY_ORIGIN;
        return "";
      }
      if (origin.includes("mybrandos") || row.appId === "mybrandos" || row.preset === "mybrandos") {
        return MYBRANDOS_RAILWAY_ORIGIN;
      }
      return origin;
    })();
    if (!apiBase) return;

    const slugs = new Set<string>();
    if (row.subdomain) slugs.add(normalizeSlug(row.subdomain));
    for (const u of urls) {
      const hostSlug = extractGetlifeosSlug(u);
      if (hostSlug) slugs.add(hostSlug);
    }

    for (const slug of slugs) {
      if (!slug) continue;
      // Keep placeholder app-level slugs out of forced probes; env/installed brand slugs still apply.
      if (isPlaceholderSlug(slug, row.appId) && !extractGetlifeosSlug(row.experienceUrl)) continue;
      addCandidate({
        applicationId: row.appId,
        tenantId: row.tenantId,
        slug,
        displayName: row.displayName || slug,
        publicApiBaseUrl: apiBase,
        publicDestination: publicDestinationForSlug(slug),
      });
    }

    // Multi-tenant creator apps: catalog often registers the platform id, not brand slugs.
    if (row.appId === "mybrandos" || row.preset === "mybrandos") {
      const seed = (process.env.LIFEOS_PUBLICATION_DISCOVERY_SLUGS ?? "")
        .split(",")
        .map((s) => normalizeSlug(s))
        .filter(Boolean);
      for (const slug of seed) {
        addCandidate({
          applicationId: row.appId,
          tenantId: row.tenantId,
          slug,
          displayName: row.displayName || slug,
          publicApiBaseUrl: MYBRANDOS_RAILWAY_ORIGIN,
          publicDestination: publicDestinationForSlug(slug),
        });
      }
    }
  };

  for (const row of catalog) considerRow(row);
  for (const row of installed) considerRow(row);

  // Existing sources remain candidates (idempotent re-probe).
  const existing = await prisma.publicationSource.findMany();
  for (const row of existing) {
    addCandidate({
      applicationId: row.applicationId,
      tenantId: row.tenantId,
      slug: row.slug,
      displayName: row.displayName,
      publicApiBaseUrl: row.publicApiBaseUrl,
      publicDestination: row.publicDestination,
    });
  }

  let eligible = 0;
  const sources: Array<{ id: string; applicationId: string; tenantId: string; slug: string }> = [];

  for (const candidate of candidates.values()) {
    const probe = await probePublicExperience(candidate.publicApiBaseUrl, candidate.slug);
    if (probe.kind !== "ok") {
      const lastError = probe.kind === "gone" ? "public_contract_gone" : "public_contract_unavailable";
      await prisma.publicationSource.upsert({
        where: {
          applicationId_tenantId_slug: {
            applicationId: candidate.applicationId,
            tenantId: candidate.tenantId,
            slug: candidate.slug,
          },
        },
        create: {
          ...candidate,
          status: "inactive",
          lastError,
          lastScannedAt: new Date(),
        },
        update: {
          status: "inactive",
          lastError,
          lastScannedAt: new Date(),
          publicApiBaseUrl: candidate.publicApiBaseUrl,
          publicDestination: candidate.publicDestination,
        },
      });
      continue;
    }

    const experience = probe.experience;
    const displayName = experience.identity?.displayName || candidate.displayName || candidate.slug;
    const row = await prisma.publicationSource.upsert({
      where: {
        applicationId_tenantId_slug: {
          applicationId: candidate.applicationId,
          tenantId: candidate.tenantId,
          slug: candidate.slug,
        },
      },
      create: {
        ...candidate,
        displayName,
        capability: "public_assets_v1",
        status: "active",
        lastError: null,
        lastScannedAt: new Date(),
      },
      update: {
        displayName,
        publicApiBaseUrl: candidate.publicApiBaseUrl,
        publicDestination: candidate.publicDestination,
        capability: "public_assets_v1",
        status: "active",
        lastError: null,
        lastScannedAt: new Date(),
      },
    });
    eligible += 1;
    sources.push({
      id: row.id,
      applicationId: row.applicationId,
      tenantId: row.tenantId,
      slug: row.slug,
    });
  }

  return { discovered: candidates.size, eligible, sources };
}

export type UpsertPublicationResult = {
  id: string;
  created: boolean;
  /** An older origin event than the one already applied; nothing was changed. */
  stale?: boolean;
  /** True when the projection is out of the consumer feed after this call. */
  hidden?: boolean;
};

/** The publication is already bound to another origin creator. */
export class PublicationOwnershipConflict extends Error {
  readonly code = "ownership_conflict";
  constructor() {
    super("Publication belongs to another origin creator.");
  }
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && (err as { code?: string }).code === "P2002");
}

/**
 * Idempotent per (originApplicationId, originPublicationId).
 * originSequence (pushed by the origin) orders events: an older sequence never overwrites a newer one,
 * a sequenced revoke leaves a hidden tombstone, and unsequenced writes (the pull reconciler) never
 * resurrect a sequenced revocation.
 */
export async function upsertPublicationProjection(
  input: IngestPublicationInput,
): Promise<UpsertPublicationResult> {
  try {
    return await applyPublicationProjection(input);
  } catch (err) {
    // Two concurrent first deliveries raced on the unique key: the second applies as an update.
    if (isUniqueViolation(err)) return applyPublicationProjection(input);
    throw err;
  }
}

async function applyPublicationProjection(input: IngestPublicationInput): Promise<UpsertPublicationResult> {
  const privacy = String(input.privacy ?? "PUBLIC").toUpperCase();
  const publicationState = String(input.publicationState ?? "PUBLISHED").toUpperCase();
  const publishedAt =
    input.publishedAt instanceof Date ? input.publishedAt : new Date(input.publishedAt);
  const sequence = typeof input.originSequence === "number" ? input.originSequence : null;
  const revoking = privacy !== "PUBLIC" || !["PUBLISHED", "PUBLIC"].includes(publicationState);

  const existing = await prisma.publicationProjection.findUnique({
    where: {
      originApplicationId_originPublicationId: {
        originApplicationId: input.originApplicationId,
        originPublicationId: input.originPublicationId,
      },
    },
  });

  if (existing) {
    if (existing.originCreatorId && input.originCreatorId && existing.originCreatorId !== input.originCreatorId) {
      throw new PublicationOwnershipConflict();
    }
    // Older pushed sequence, or any unsequenced (pull) write over a pushed publication: the push is authoritative.
    const stale =
      (sequence !== null && existing.originSequence !== null && sequence < existing.originSequence) ||
      (sequence === null && existing.originSequence !== null);
    if (stale) return { id: existing.id, created: false, stale: true, hidden: Boolean(existing.hiddenAt) };
  }

  const originSequence = sequence ?? existing?.originSequence ?? null;

  if (revoking) {
    if (existing) {
      await prisma.publicationProjection.update({
        where: { id: existing.id },
        data: { hiddenAt: existing.hiddenAt ?? new Date(), publicationState, privacy, originSequence },
      });
      return { id: existing.id, created: false, hidden: true };
    }
    if (sequence === null) return { id: "", created: false, hidden: true };
  }

  const data = {
    originApplicationId: input.originApplicationId,
    originTenantId: input.originTenantId,
    originPublicationId: input.originPublicationId,
    originAssetIds: JSON.stringify(input.originAssetIds ?? [input.originPublicationId]),
    originCreatorId: input.originCreatorId ?? existing?.originCreatorId ?? null,
    originSequence,
    publicationType: input.publicationType,
    privacy: revoking ? privacy : "PUBLIC",
    publicationState: revoking ? publicationState : "PUBLISHED",
    title: input.title,
    caption: input.caption ?? "",
    authorDisplayName: input.authorDisplayName || input.authorSlug,
    authorSlug: normalizeSlug(input.authorSlug),
    publicDestinationUrl: input.publicDestinationUrl,
    mediaUrl: input.mediaUrl ?? null,
    mediaStatus: input.mediaStatus ?? (input.mediaUrl ? "ok" : "none"),
    publishedAt,
    // A sequenced revoke of an unseen publication is stored hidden, so a delayed publish cannot resurrect it.
    hiddenAt: revoking ? new Date() : null,
    rawMetadata: JSON.stringify(input.rawMetadata ?? {}),
  };

  if (existing) {
    const row = await prisma.publicationProjection.update({
      where: { id: existing.id },
      data,
    });
    return { id: row.id, created: false, hidden: revoking };
  }

  const row = await prisma.publicationProjection.create({ data });
  return { id: row.id, created: true, hidden: revoking };
}

export async function reconcileEcosystemPublications(opts: {
  dryRun?: boolean;
}): Promise<ReconcileCounts> {
  const dryRun = Boolean(opts.dryRun);
  const counts = emptyCounts();
  const discovery = await discoverPublicationSources();
  counts.applicationsDiscovered = discovery.discovered;
  counts.eligiblePublicationApps = discovery.eligible;

  // Active sources, plus sources whose origin said the public space is gone (to take their posts down).
  const sources = await prisma.publicationSource.findMany({
    where: { OR: [{ status: "active" }, { status: "inactive", lastError: "public_contract_gone" }] },
  });
  const seenKeys = new Set<string>();

  /** Hide pull-managed projections of a source. Push-managed (sequenced) rows follow their origin's pushes only. */
  async function hidePulled(source: (typeof sources)[number], keep: Set<string>, report: { hidden: number }) {
    const projected = await prisma.publicationProjection.findMany({
      where: {
        originApplicationId: canonicalApplicationId(source),
        authorSlug: source.slug,
        hiddenAt: null,
        originSequence: null,
      },
    });
    for (const row of projected) {
      if (keep.has(row.originPublicationId)) continue;
      counts.hidden += 1;
      report.hidden += 1;
      if (!dryRun) {
        await prisma.publicationProjection.updateMany({
          where: { id: row.id, originSequence: null, hiddenAt: null },
          data: { hiddenAt: new Date(), publicationState: "REVOKED" },
        });
      }
    }
  }

  for (const source of sources) {
    const originApplicationId = canonicalApplicationId(source);
    const appReport = {
      applicationId: source.applicationId,
      tenantId: source.tenantId,
      slug: source.slug,
      publicDestination: source.publicDestination,
      canonical: 0,
      eligible: 0,
      alreadyProjected: 0,
      recovered: 0,
      hidden: 0,
      brokenMedia: 0,
      errors: 0,
      pushManaged: 0,
    };

    try {
      const probe = await probePublicExperience(source.publicApiBaseUrl, source.slug);
      if (probe.kind === "gone") {
        // The creator's public space is disabled, suspended or removed: nothing of it stays visible.
        await hidePulled(source, new Set(), appReport);
        if (!dryRun) {
          await prisma.publicationSource.update({
            where: { id: source.id },
            data: { status: "inactive", lastError: "public_contract_gone", lastScannedAt: new Date() },
          });
        }
        counts.byApplication.push(appReport);
        continue;
      }
      if (probe.kind === "error") {
        // Unreachable is not "removed": keep what is projected and try again later.
        appReport.errors += 1;
        counts.errors += 1;
        counts.byApplication.push(appReport);
        continue;
      }
      const experience = probe.experience;

      const assets = experience.publishedAssets ?? [];
      appReport.canonical = assets.length;
      counts.canonicalPublicationsScanned += assets.length;
      const eligibleIds = new Set<string>();

      for (const asset of assets) {
        const eligibility = isEligiblePublicAsset(asset);
        if (!eligibility.ok) {
          counts.ineligible += 1;
          continue;
        }
        const publicationType = mapPublicationType(asset)!;
        counts.eligiblePublic += 1;
        appReport.eligible += 1;
        eligibleIds.add(asset.id);
        seenKeys.add(`${originApplicationId}::${asset.id}`);

        const existing = await prisma.publicationProjection.findUnique({
          where: {
            originApplicationId_originPublicationId: {
              originApplicationId,
              originPublicationId: asset.id,
            },
          },
        });
        if (existing && existing.originSequence !== null) {
          // Delivered by push: the push sequence is authoritative; a public-page snapshot may be stale.
          appReport.pushManaged += 1;
          counts.alreadyInLifeOs += existing.hiddenAt ? 0 : 1;
          counts.skippedExisting += 1;
          continue;
        }

        const cover = asset.coverAvailable
          ? `${source.publicApiBaseUrl.replace(/\/$/, "")}/api/public/${encodeURIComponent(source.slug)}/assets/${encodeURIComponent(asset.id)}/cover`
          : null;
        let mediaStatus = cover ? "ok" : "none";
        if (cover) {
          const ok = await headOk(cover);
          if (!ok) {
            mediaStatus = "broken";
            counts.brokenMedia += 1;
            appReport.brokenMedia += 1;
          }
        }

        const projection: IngestPublicationInput = {
          originApplicationId,
          originTenantId: source.tenantId,
          originPublicationId: asset.id,
          originAssetIds: [asset.id],
          originCreatorId: experience.identity?.creatorId ?? experience.identity?.trustId ?? null,
          publicationType,
          title: asset.title || "Untitled",
          caption:
            (typeof asset.presentation?.body === "string" && asset.presentation.body) ||
            asset.description ||
            "",
          authorDisplayName: experience.identity?.displayName || source.displayName,
          authorSlug: source.slug,
          publicDestinationUrl: source.publicDestination,
          mediaUrl: cover,
          mediaStatus,
          publishedAt: asset.publishedAt || asset.createdAt || existing?.publishedAt || new Date().toISOString(),
          rawMetadata: { assetType: asset.assetType, presentationTypes: asset.presentationTypes, access: asset.access },
        };

        if (existing && !existing.hiddenAt) {
          counts.alreadyInLifeOs += 1;
          appReport.alreadyProjected += 1;
          if (dryRun) {
            counts.skippedExisting += 1;
            continue;
          }
          const result = await upsertPublicationProjection(projection);
          if (result.stale) appReport.pushManaged += 1;
          else counts.updated += 1;
          counts.skippedExisting += 1;
          continue;
        }

        counts.missing += 1;
        if (dryRun) continue;

        const result = await upsertPublicationProjection(projection);
        if (result.stale) {
          appReport.pushManaged += 1;
        } else if (result.created) {
          counts.created += 1;
          appReport.recovered += 1;
        } else {
          counts.updated += 1;
        }
      }

      // Hide stale pull projections of this source that are no longer eligible/public.
      await hidePulled(source, eligibleIds, appReport);

      await prisma.publicationSource.update({
        where: { id: source.id },
        data: { status: "active", lastScannedAt: new Date(), lastError: null },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "reconcile_failed";
      counts.errors += 1;
      counts.failed += 1;
      appReport.errors += 1;
      await prisma.publicationSource.update({
        where: { id: source.id },
        data: { lastError: message, lastScannedAt: new Date() },
      });
    }

    counts.byApplication.push(appReport);
  }

  return counts;
}

export async function listFeedProjections(opts?: { limit?: number; cursor?: string }) {
  const take = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const rows = await prisma.publicationProjection.findMany({
    where: {
      hiddenAt: null,
      privacy: "PUBLIC",
      publicationState: "PUBLISHED",
    },
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
    ...(opts?.cursor
      ? {
          skip: 1,
          cursor: { id: opts.cursor },
        }
      : {}),
  });

  return rows.map((row) => ({
    id: row.id,
    originApplicationId: row.originApplicationId,
    originTenantId: row.originTenantId,
    originPublicationId: row.originPublicationId,
    originAssetIds: JSON.parse(row.originAssetIds || "[]") as string[],
    originCreatorId: row.originCreatorId,
    publicationType: row.publicationType,
    privacy: row.privacy,
    publicationState: row.publicationState,
    title: row.title,
    caption: row.caption,
    authorDisplayName: row.authorDisplayName,
    authorSlug: row.authorSlug,
    publicDestinationUrl: row.publicDestinationUrl,
    mediaUrl: row.mediaUrl,
    mediaStatus: row.mediaStatus,
    publishedAt: row.publishedAt.toISOString(),
    ingestedAt: row.ingestedAt.toISOString(),
  }));
}

export const MIN_PUBLICATION_INGEST_SECRET_LENGTH = 24;

/**
 * The dedicated credential for origin → LifeOS publication ingestion (and its operator reconcile).
 * Deliberately separate from MASTER_DISTRIBUTION_SECRET / DISTRIBUTOR_SECRET (OS releases).
 * Missing, short or whitespace-containing values count as not configured: every call is refused.
 */
export function publicationIngestSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = env.LIFEOS_PUBLICATION_INGEST_SECRET ?? "";
  return secret.length >= MIN_PUBLICATION_INGEST_SECRET_LENGTH && !/\s/.test(secret) ? secret : null;
}

export function authorizePublicationIngest(
  headers: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const secret = publicationIngestSecret(env);
  if (!secret) return false;
  const auth = Buffer.from(String(headers.authorization ?? ""));
  const expected = Buffer.from(`Bearer ${secret}`);
  return auth.length === expected.length && timingSafeEqual(auth, expected);
}
