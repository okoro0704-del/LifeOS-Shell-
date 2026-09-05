import type {
  DualProjectionRoutes,
  InstalledAppManifest,
  ShellAudience,
  TenantBootstrapInput,
  TenantInstalledEvent,
} from "@lifeos/shared";
import { buildDualProjectionRoutes, SHELL_EVENTS } from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";

export type BootstrapResult = {
  app: InstalledAppManifest;
  event: TenantInstalledEvent;
  created: boolean;
};

export type AppCatalogManifest = {
  id: string;
  appId: string;
  tenantId: string;
  displayName: string;
  icon: string | null;
  osType: string;
  audience: ShellAudience;
  experienceId: string | null;
  experienceUrl: string;
  approvedOrigin: string;
  subdomain: string;
  launchUrl: string;
  preset: string | null;
  badgeCount: number;
  status: "active" | "revoked";
  source: string;
  updatedAt: string;
};

function parsePreset(value: string | null | undefined): string | null {
  if (!value || !value.trim()) return null;
  return value.trim();
}

function toManifest(row: {
  id: string;
  appId: string;
  tenantId: string;
  trustId: string;
  displayName: string;
  icon: string | null;
  osType: string;
  audience: string;
  experienceId: string | null;
  experienceUrl: string;
  approvedOrigin: string;
  subdomain: string;
  standaloneUrl: string;
  shellDeepLink: string;
  launchUrl: string;
  preset: string | null;
  badgeCount: number;
  installedAt: Date;
  status: string;
}): InstalledAppManifest {
  const routes: DualProjectionRoutes = {
    standalonePwaUrl: row.standaloneUrl,
    shellDeepLink: row.shellDeepLink,
  };
  return {
    id: row.id,
    appId: row.appId,
    tenantId: row.tenantId,
    trustId: row.trustId,
    displayName: row.displayName,
    icon: row.icon,
    osType: row.osType,
    audience: (row.audience === "personal" ? "personal" : "business") as ShellAudience,
    experienceId: row.experienceId,
    experienceUrl: row.experienceUrl,
    approvedOrigin: row.approvedOrigin,
    subdomain: row.subdomain,
    launchUrl: row.launchUrl || row.experienceUrl,
    preset: parsePreset(row.preset),
    badgeCount: row.badgeCount ?? 0,
    routes,
    installedAt: row.installedAt.toISOString(),
    status: row.status === "active" ? "active" : "revoked",
  };
}

function toCatalogManifest(row: {
  id: string;
  appId: string;
  tenantId: string;
  displayName: string;
  icon: string | null;
  osType: string;
  audience: string;
  experienceId: string | null;
  experienceUrl: string;
  approvedOrigin: string;
  subdomain: string;
  launchUrl: string;
  preset: string | null;
  badgeCount: number;
  status: string;
  source: string;
  updatedAt: Date;
}): AppCatalogManifest {
  return {
    id: row.id,
    appId: row.appId,
    tenantId: row.tenantId,
    displayName: row.displayName,
    icon: row.icon,
    osType: row.osType,
    audience: (row.audience === "personal" ? "personal" : "business") as ShellAudience,
    experienceId: row.experienceId,
    experienceUrl: row.experienceUrl,
    approvedOrigin: row.approvedOrigin,
    subdomain: row.subdomain,
    launchUrl: row.launchUrl || row.experienceUrl,
    preset: parsePreset(row.preset),
    badgeCount: row.badgeCount ?? 0,
    status: row.status === "active" ? "active" : "revoked",
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Portal tenant bootstrap — dual projection + TENANT_INSTALLED on Trust ID profile.
 */
export async function bootstrapTenant(input: TenantBootstrapInput): Promise<BootstrapResult> {
  const audience: ShellAudience = input.audience ?? "business";
  const routes = buildDualProjectionRoutes({
    appId: input.appId,
    tenantId: input.tenantId,
    subdomain: input.subdomain,
  });
  const launchUrl = (input.launchUrl ?? input.experienceUrl).trim();

  let user = await prisma.user.findUnique({ where: { trustId: input.trustId } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        trustId: input.trustId,
        displayName: input.trustId,
      },
    });
  }

  const existing = await prisma.installedApp.findUnique({
    where: {
      userId_appId_tenantId: {
        userId: user.id,
        appId: input.appId,
        tenantId: input.tenantId,
      },
    },
  });

  const data = {
    trustId: input.trustId,
    displayName: input.displayName,
    icon: input.icon ?? null,
    osType: input.osType ?? "other",
    audience,
    experienceId: input.experienceId ?? null,
    experienceUrl: input.experienceUrl,
    approvedOrigin: input.approvedOrigin,
    subdomain: input.subdomain,
    standaloneUrl: routes.standalonePwaUrl,
    shellDeepLink: routes.shellDeepLink,
    launchUrl,
    preset: input.preset ?? null,
    badgeCount: input.badgeCount ?? 0,
    status: "active",
    metadata: JSON.stringify({
      source: "portal_bootstrap",
      preset: input.preset ?? null,
    }),
  };

  const row = existing
    ? await prisma.installedApp.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.installedApp.create({
        data: {
          userId: user.id,
          appId: input.appId,
          tenantId: input.tenantId,
          ...data,
        },
      });

  if (input.experienceId) {
    const exp = await prisma.experience.findUnique({ where: { id: input.experienceId } });
    if (exp) {
      await prisma.experienceConnection.upsert({
        where: {
          userId_experienceId: { userId: user.id, experienceId: exp.id },
        },
        create: {
          userId: user.id,
          experienceId: exp.id,
          status: "connected",
          grantedPermissions: exp.permissions,
        },
        update: {
          status: "connected",
          disconnectedAt: null,
        },
      });
    }
  }

  // Keep global registry in sync so every LifeOS user can stream the same apps.
  await upsertCatalogEntry({
    appId: input.appId,
    tenantId: input.tenantId,
    displayName: input.displayName,
    icon: input.icon ?? null,
    osType: input.osType ?? "other",
    audience,
    experienceId: input.experienceId ?? null,
    experienceUrl: input.experienceUrl,
    approvedOrigin: input.approvedOrigin,
    subdomain: input.subdomain,
    launchUrl,
    preset: input.preset ?? null,
    badgeCount: input.badgeCount ?? 0,
    source: "portal_bootstrap",
  });

  const app = toManifest(row);
  const event: TenantInstalledEvent = {
    type: SHELL_EVENTS.TENANT_INSTALLED,
    trustId: input.trustId,
    appId: input.appId,
    tenantId: input.tenantId,
    audience,
    routes,
    at: new Date().toISOString(),
  };

  await auditLog(SHELL_EVENTS.TENANT_INSTALLED, {
    userId: user.id,
    detail: {
      appId: input.appId,
      tenantId: input.tenantId,
      routes,
      audience,
      preset: input.preset ?? null,
    },
  });

  return { app, event, created: !existing };
}

export async function upsertCatalogEntry(input: {
  appId: string;
  tenantId: string;
  displayName: string;
  icon?: string | null;
  osType?: string;
  audience?: ShellAudience;
  experienceId?: string | null;
  experienceUrl: string;
  approvedOrigin: string;
  subdomain: string;
  launchUrl?: string;
  preset?: string | null;
  badgeCount?: number;
  source?: string;
}): Promise<AppCatalogManifest> {
  const launchUrl = (input.launchUrl ?? input.experienceUrl).trim();
  const row = await prisma.appCatalogEntry.upsert({
    where: {
      appId_tenantId: { appId: input.appId, tenantId: input.tenantId },
    },
    create: {
      appId: input.appId,
      tenantId: input.tenantId,
      displayName: input.displayName,
      icon: input.icon ?? null,
      osType: input.osType ?? "other",
      audience: input.audience ?? "business",
      experienceId: input.experienceId ?? null,
      experienceUrl: input.experienceUrl,
      approvedOrigin: input.approvedOrigin,
      subdomain: input.subdomain,
      launchUrl,
      preset: input.preset ?? null,
      badgeCount: input.badgeCount ?? 0,
      status: "active",
      source: input.source ?? "registry",
    },
    update: {
      displayName: input.displayName,
      icon: input.icon ?? null,
      osType: input.osType ?? "other",
      audience: input.audience ?? "business",
      experienceId: input.experienceId ?? null,
      experienceUrl: input.experienceUrl,
      approvedOrigin: input.approvedOrigin,
      subdomain: input.subdomain,
      launchUrl,
      preset: input.preset ?? null,
      badgeCount: input.badgeCount ?? 0,
      status: "active",
      source: input.source ?? "registry",
    },
  });
  return toCatalogManifest(row);
}

export async function listAppCatalog(): Promise<AppCatalogManifest[]> {
  const rows = await prisma.appCatalogEntry.findMany({
    where: { status: "active" },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toCatalogManifest);
}

/** Install every active catalog app onto the given user's launcher. */
export async function syncInstalledAppsFromCatalog(input: {
  userId: string;
  trustId: string;
}): Promise<{ apps: InstalledAppManifest[]; installed: number; skipped: number }> {
  const catalog = await prisma.appCatalogEntry.findMany({ where: { status: "active" } });
  let installed = 0;
  let skipped = 0;
  const apps: InstalledAppManifest[] = [];

  for (const entry of catalog) {
    const result = await bootstrapTenant({
      appId: entry.appId,
      tenantId: entry.tenantId,
      trustId: input.trustId,
      displayName: entry.displayName,
      subdomain: entry.subdomain,
      experienceUrl: entry.experienceUrl,
      approvedOrigin: entry.approvedOrigin,
      icon: entry.icon,
      osType: entry.osType,
      audience: entry.audience === "personal" ? "personal" : "business",
      experienceId: entry.experienceId,
      preset: entry.preset,
      badgeCount: entry.badgeCount,
      launchUrl: entry.launchUrl,
    });
    apps.push(result.app);
    if (result.created) installed += 1;
    else skipped += 1;
  }

  return { apps, installed, skipped };
}

export async function listInstalledAppsForUser(userId: string): Promise<InstalledAppManifest[]> {
  const rows = await prisma.installedApp.findMany({
    where: { userId, status: "active" },
    orderBy: { installedAt: "desc" },
  });
  return rows.map(toManifest);
}

export async function listInstalledAppsForTrustId(trustId: string): Promise<InstalledAppManifest[]> {
  const rows = await prisma.installedApp.findMany({
    where: { trustId, status: "active" },
    orderBy: { installedAt: "desc" },
  });
  return rows.map(toManifest);
}

/** Map Experience rows into the global app catalog (shell-first, no standalone PWA required). */
export async function syncCatalogFromExperiences(): Promise<number> {
  const experiences = await prisma.experience.findMany({ where: { status: "active" } });
  let n = 0;
  for (const exp of experiences) {
    const appId =
      exp.osType === "hospitality"
        ? "hospitalityos"
        : exp.osType === "transport"
          ? "transportationos"
          : exp.osType === "service"
            ? "serviceos"
            : exp.osType || "other";
    let origin = exp.approvedOrigin;
    try {
      origin = new URL(exp.experienceUrl).origin;
    } catch {
      /* keep approvedOrigin */
    }
    const subdomain = exp.businessId.replace(/[^a-z0-9-]/gi, "-").toLowerCase().slice(0, 48) || exp.id;
    await upsertCatalogEntry({
      appId,
      tenantId: exp.businessId,
      displayName: exp.displayName || exp.businessName,
      icon: exp.icon,
      osType: exp.osType,
      audience: "business",
      experienceId: exp.id,
      experienceUrl: exp.experienceUrl,
      approvedOrigin: origin,
      subdomain,
      launchUrl: exp.experienceUrl,
      source: "experience_sync",
    });
    n += 1;
  }
  return n;
}
