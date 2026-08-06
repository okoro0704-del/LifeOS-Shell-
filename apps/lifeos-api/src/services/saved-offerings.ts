import type { SavedOfferingPublic } from "@lifeos/shared";
import { AUDIT_EVENTS } from "@lifeos/shared";
import { prisma } from "../lib/prisma.js";
import { auditLog } from "./audit.js";
import { getOfferingProvider } from "./offerings.js";

export async function listSaved(userId: string): Promise<SavedOfferingPublic[]> {
  const rows = await prisma.savedOffering.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  const out: SavedOfferingPublic[] = [];
  for (const row of rows) {
    let snap: Partial<SavedOfferingPublic> = {};
    try {
      snap = JSON.parse(row.snapshot) as Partial<SavedOfferingPublic>;
    } catch {
      snap = {};
    }
    const live = await getOfferingProvider().getById(row.offeringId);
    out.push({
      id: row.id,
      offeringId: row.offeringId,
      name: live?.name ?? snap.name ?? "Saved offering",
      businessName: live?.businessName ?? snap.businessName ?? "",
      category: live?.category ?? snap.category ?? "",
      priceFormatted: live?.priceFormatted ?? snap.priceFormatted ?? "",
      experienceId: live?.experienceId ?? snap.experienceId ?? "",
      savedAt: row.createdAt.toISOString(),
    });
  }
  return out;
}

export async function saveOffering(userId: string, offeringId: string) {
  const offering = await getOfferingProvider().getById(offeringId);
  if (!offering) throw Object.assign(new Error("not_found"), { code: "not_found" });
  const snapshot = JSON.stringify({
    name: offering.name,
    businessName: offering.businessName,
    category: offering.category,
    priceFormatted: offering.priceFormatted,
    experienceId: offering.experienceId,
  });
  const row = await prisma.savedOffering.upsert({
    where: { userId_offeringId: { userId, offeringId } },
    create: { userId, offeringId, snapshot },
    update: { snapshot },
  });
  await auditLog(AUDIT_EVENTS.OFFERING_SAVED, { userId, detail: { offeringId } });
  return row;
}

export async function unsaveOffering(userId: string, offeringId: string) {
  await prisma.savedOffering.deleteMany({ where: { userId, offeringId } });
  return { ok: true };
}

export async function isSaved(userId: string, offeringId: string) {
  const row = await prisma.savedOffering.findUnique({
    where: { userId_offeringId: { userId, offeringId } },
  });
  return Boolean(row);
}
