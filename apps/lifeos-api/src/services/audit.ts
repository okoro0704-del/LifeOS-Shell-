import { prisma } from "../lib/prisma.js";

/** LifeOS-specific audit — does not replace TrustID identity audit. */
export async function auditLog(
  event: string,
  opts: { userId?: string | null; detail?: Record<string, unknown> } = {},
) {
  await prisma.auditEvent.create({
    data: {
      event,
      userId: opts.userId ?? null,
      detail: JSON.stringify(opts.detail ?? {}),
    },
  });
}
