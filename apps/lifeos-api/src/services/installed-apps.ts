import type {
  DualProjectionRoutes,
  InstalledAppManifest,
  ShellAudience,
  TenantBootstrapInput,
  TenantInstalledEvent,
  TransportationOSPreset,
} from "@lifeos/shared";
import { buildDualProjectionRoutes, SHELL_EVENTS } from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";

export type BootstrapResult = {
  app: InstalledAppManifest;
  event: TenantInstalledEvent;
  created: boolean;
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

  // Also ensure ExperienceConnection when experienceId is known (zero re-auth path).
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
