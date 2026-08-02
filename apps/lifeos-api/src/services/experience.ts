import {
  AUDIT_EVENTS,
  EXPERIENCE_PERMISSIONS,
  type ExperiencePermission,
  type ExperienceSessionPublic,
} from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";
import { getBusinessDirectory } from "./directory.js";
import { getExperienceSessionIssuer } from "./experience-session.js";
function parsePerms(raw: string): ExperiencePermission[] {
  try {
    return JSON.parse(raw) as ExperiencePermission[];
  } catch {
    return [];
  }
}
function isAllowedPermission(p: string): p is ExperiencePermission {
  return (EXPERIENCE_PERMISSIONS as readonly string[]).includes(p);
}
export interface ExperienceProvider {
  getPermissions(experienceId: string): Promise<ExperiencePermission[]>;
  getConnection(userId: string, experienceId: string): Promise<{
    id: string;
    status: string;
    grantedPermissions: ExperiencePermission[];
    connectedAt: Date;
    disconnectedAt: Date | null;
  } | null>;
  connect(
    userId: string,
    experienceId: string,
    requested: ExperiencePermission[],
  ): Promise<{
    connectionId: string;
    grantedPermissions: ExperiencePermission[];
  }>;
  denyPermissions(userId: string, experienceId: string, permissions: ExperiencePermission[]): Promise<void>;
  disconnect(userId: string, connectionId: string): Promise<void>;
  listConnections(userId: string): Promise<
    {
      id: string;
      experienceId: string;
      status: string;
      grantedPermissions: string;
      connectedAt: Date;
      disconnectedAt: Date | null;
      experience: {
        displayName: string;
        businessName: string;
        osType: string;
        metadata: string;
      };
    }[]
  >;
  createExperienceSession(opts: {
    userId: string;
    trustId: string;
    displayName: string;
    experienceId: string;
  }): Promise<ExperienceSessionPublic>;
}
export class RegistryExperienceProvider implements ExperienceProvider {
  async getPermissions(experienceId: string) {
    const exp = await prisma.experience.findUnique({ where: { id: experienceId } });
    if (!exp) throw new Error("not_found");
    return parsePerms(exp.permissions).filter(isAllowedPermission);
  }
  async getConnection(userId: string, experienceId: string) {
    const row = await prisma.experienceConnection.findUnique({
      where: { userId_experienceId: { userId, experienceId } },
    });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      grantedPermissions: parsePerms(row.grantedPermissions),
      connectedAt: row.connectedAt,
      disconnectedAt: row.disconnectedAt,
    };
  }
  async connect(userId: string, experienceId: string, requested: ExperiencePermission[]) {
    const allowed = await this.getPermissions(experienceId);
    const invalid = requested.filter((p) => !allowed.includes(p));
    if (invalid.length) {
      await auditLog(AUDIT_EVENTS.PERMISSION_DENIED, {
        userId,
        detail: { experienceId, invalid },
      });
      const err = new Error(`Unapproved permissions: ${invalid.join(", ")}`);
      (err as Error & { code: string }).code = "permission_denied";
      throw err;
    }
    if (requested.length === 0) {
      const err = new Error("At least one permission must be granted");
      (err as Error & { code: string }).code = "permission_denied";
      throw err;
    }
    await auditLog(AUDIT_EVENTS.PERMISSION_REQUESTED, {
      userId,
      detail: { experienceId, permissions: requested },
    });
    const row = await prisma.experienceConnection.upsert({
      where: { userId_experienceId: { userId, experienceId } },
      create: {
        userId,
        experienceId,
        status: "connected",
        grantedPermissions: JSON.stringify(requested),
        connectedAt: new Date(),
        disconnectedAt: null,
      },
      update: {
        status: "connected",
        grantedPermissions: JSON.stringify(requested),
        connectedAt: new Date(),
        disconnectedAt: null,
      },
    });
    await auditLog(AUDIT_EVENTS.EXPERIENCE_CONNECTED, {
      userId,
      detail: { experienceId, permissions: requested },
    });
    await auditLog(AUDIT_EVENTS.PERMISSION_GRANTED, {
      userId,
      detail: { experienceId, permissions: requested },
    });
    return { connectionId: row.id, grantedPermissions: requested };
  }
  async denyPermissions(
    userId: string,
    experienceId: string,
    permissions: ExperiencePermission[],
  ) {
    await auditLog(AUDIT_EVENTS.PERMISSION_REQUESTED, {
      userId,
      detail: { experienceId, permissions, source: "experience_bridge" },
    });
    await auditLog(AUDIT_EVENTS.PERMISSION_DENIED, {
      userId,
      detail: { experienceId, permissions, reason: "user_denied" },
    });
  }
  async disconnect(userId: string, connectionId: string) {
    const row = await prisma.experienceConnection.findFirst({
      where: { id: connectionId, userId },
    });
    if (!row) {
      const err = new Error("not_found");
      (err as Error & { code: string }).code = "not_found";
      throw err;
    }
    await prisma.experienceConnection.update({
      where: { id: row.id },
      data: { status: "disconnected", disconnectedAt: new Date(), grantedPermissions: "[]" },
    });
    await getExperienceSessionIssuer().revokeForExperience(userId, row.experienceId);
    await auditLog(AUDIT_EVENTS.EXPERIENCE_DISCONNECTED, {
      userId,
      detail: { experienceId: row.experienceId, connectionId },
    });
    await auditLog(AUDIT_EVENTS.PERMISSION_REVOKED, {
      userId,
      detail: { experienceId: row.experienceId, connectionId },
    });
  }
  async listConnections(userId: string) {
    return prisma.experienceConnection.findMany({
      where: { userId },
      include: {
        experience: {
          select: {
            displayName: true,
            businessName: true,
            osType: true,
            metadata: true,
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    });
  }
  async createExperienceSession(opts: {
    userId: string;
    trustId: string;
    displayName: string;
    experienceId: string;
  }): Promise<ExperienceSessionPublic> {
    // trustId intentionally unused in token — only LifeOS user id + optional display name.
    void opts.trustId;
    const conn = await this.getConnection(opts.userId, opts.experienceId);
    if (!conn || conn.status !== "connected") {
      const err = new Error("Experience not connected");
      (err as Error & { code: string }).code = "not_connected";
      throw err;
    }
    const listing = await getBusinessDirectory().getById(opts.experienceId);
    if (!listing?.loadable) {
      const err = new Error("Experience unavailable");
      (err as Error & { code: string }).code = "experience_unavailable";
      throw err;
    }
    // Scopes come only from the stored connection — never from the client.
    return getExperienceSessionIssuer().issue({
      userId: opts.userId,
      displayName: opts.displayName,
      experienceId: listing.id,
      businessId: listing.businessId,
      experienceUrl: listing.experienceUrl,
      approvedOrigin: listing.approvedOrigin,
      scopes: conn.grantedPermissions,
    });
  }
}
let provider: ExperienceProvider | null = null;
export function getExperienceProvider(): ExperienceProvider {
  if (!provider) {
    provider = new RegistryExperienceProvider();
  }
  return provider;
}
export { parsePerms };