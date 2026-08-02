import type { DiscoverCategory, ExperienceRecord, ExperiencePermission, ExperienceType, OsType } from "@lifeos/shared";
import { canLoadExperience } from "@lifeos/experience-sdk";
import { prisma } from "../lib/prisma.js";

export type DirectoryListing = ExperienceRecord & {
  featured: boolean;
  loadable: boolean;
  availability: string;
};

export interface BusinessDirectoryProvider {
  list(opts?: { category?: string; q?: string }): Promise<DirectoryListing[]>;
  categories(): Promise<string[]>;
  getById(id: string): Promise<DirectoryListing | null>;
  search(q: string): Promise<DirectoryListing[]>;
}

function mapRow(row: {
  id: string;
  businessId: string;
  businessName: string;
  osType: string;
  category: string;
  experienceType: string;
  experienceUrl: string;
  approvedOrigin: string;
  displayName: string;
  description: string;
  location: string | null;
  status: string;
  version: string;
  icon: string | null;
  permissions: string;
  metadata: string;
  featured: boolean;
}): DirectoryListing {
  let permissions: ExperiencePermission[] = [];
  let metadata: Record<string, unknown> = {};
  try {
    permissions = JSON.parse(row.permissions) as ExperiencePermission[];
  } catch {
    /* empty */
  }
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    /* empty */
  }
  const record: ExperienceRecord = {
    id: row.id,
    businessId: row.businessId,
    businessName: row.businessName,
    osType: row.osType as OsType,
    category: row.category as DiscoverCategory,
    experienceType: (row.experienceType || "web") as ExperienceType,
    experienceUrl: row.experienceUrl,
    approvedOrigin: row.approvedOrigin,
    displayName: row.displayName,
    description: row.description,
    location: row.location,
    status: row.status as ExperienceRecord["status"],
    version: row.version,
    icon: row.icon,
    permissions,
    metadata,
    featured: row.featured,
  };
  return {
    ...record,
    featured: row.featured,
    loadable: canLoadExperience(record),
    availability: String(metadata.availability ?? (row.status === "active" ? "Open" : row.status)),
  };
}

/** V1 seeded registry. Later: LifeOSBusinessPortalProvider. */
export class MockBusinessDirectoryProvider implements BusinessDirectoryProvider {
  async list(opts: { category?: string; q?: string } = {}) {
    const rows = await prisma.experience.findMany({
      where: {
        status: "active",
        ...(opts.category ? { category: opts.category } : {}),
      },
      orderBy: [{ featured: "desc" }, { displayName: "asc" }],
    });
    let items = rows.map(mapRow);
    if (opts.q) {
      const q = opts.q.toLowerCase();
      items = items.filter(
        (i) =>
          i.displayName.toLowerCase().includes(q) ||
          i.businessName.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.location ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }

  async categories() {
    const rows = await prisma.experience.findMany({
      where: { status: "active" },
      select: { category: true },
      distinct: ["category"],
    });
    return rows.map((r) => r.category).sort();
  }

  async getById(id: string) {
    const row = await prisma.experience.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async search(q: string) {
    return this.list({ q });
  }
}

let directory: BusinessDirectoryProvider | null = null;

export function getBusinessDirectory(): BusinessDirectoryProvider {
  if (!directory) directory = new MockBusinessDirectoryProvider();
  return directory;
}
