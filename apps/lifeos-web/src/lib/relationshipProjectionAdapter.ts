import type { CreatorVipRelationship } from "./onlineKernel";

type Projection = { relationshipId: string; subject: { id: string }; target: { id: string }; relationshipType: string; productId?: string; spaceId?: string; status: CreatorVipRelationship["status"]; capabilities: string[]; source: { system: string }; issuedAt: string; expiresAt?: string; updatedAt: string; version: number };

/** Network adapter only. Online Kernel remains pure domain policy. */
export async function listCreatorVipRelationships(subjectId: string, bearer: string): Promise<CreatorVipRelationship[]> {
  const base = String(import.meta.env.VITE_RELATIONSHIP_PROJECTION_URL || "").replace(/\/$/, "");
  if (!base || !bearer || !subjectId) return [];
  const response = await fetch(`${base}/relationships/me`, { headers: { Authorization: `Bearer ${bearer}` } });
  if (!response.ok) return [];
  const body = await response.json() as { relationships?: Projection[] };
  return (body.relationships ?? []).flatMap((item) => {
    if (item.relationshipType !== "CREATOR_VIP" || item.subject?.id !== subjectId || item.source?.system !== "mybrandOS" || !item.relationshipId || !item.target?.id || !item.updatedAt || !Number.isFinite(item.version)) return [];
    return [{ subjectId, creatorId: item.target.id, productId: item.productId ?? "", spaceId: item.spaceId ?? item.target.id, relationshipId: item.relationshipId, status: item.status, capabilities: item.capabilities ?? [], startedAt: item.issuedAt, expiresAt: item.expiresAt, source: item.source.system }];
  });
}
