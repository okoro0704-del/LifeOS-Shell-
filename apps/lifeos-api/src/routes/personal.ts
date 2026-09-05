import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireSession } from "../lib/auth.js";
import { config } from "../lib/config.js";
import { prisma } from "../lib/prisma.js";

type DigiconomyEnvelope = {
  success?: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
};

async function digiconomyFetch(
  path: string,
  opts: { method?: string; bearer?: string; body?: unknown } = {},
): Promise<{ ok: boolean; status: number; json: DigiconomyEnvelope | null }> {
  const base = config.digiconomyApiUrl;
  if (!base) return { ok: false, status: 0, json: null };
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (opts.bearer) {
      headers.Authorization = `Bearer ${opts.bearer}`;
      headers["X-TrustID-Session"] = opts.bearer;
    }
    const res = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as DigiconomyEnvelope | null;
    return { ok: res.ok, status: res.status, json };
  } catch {
    return { ok: false, status: 0, json: null };
  }
}

function bearerFromRequest(req: { headers: Record<string, unknown> }): string | undefined {
  const auth = String(req.headers.authorization ?? "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const trust = req.headers["x-trustid-session"];
  if (typeof trust === "string" && trust.trim()) return trust.trim();
  return undefined;
}

/**
 * Personal space BFF — Digiconomy-shaped `/v1/personal/*` with TrustID-safe local fallbacks.
 */
export async function personalRoutes(app: FastifyInstance) {
  app.get("/v1/personal/vault", { preHandler: requireSession }, async (req) => {
    const userId = req.lifeosUser!.id;
    const rows = await prisma.personalVaultItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        previewHint: r.previewHint,
        encrypted: true,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  });

  app.post("/v1/personal/vault", { preHandler: requireSession }, async (req, reply) => {
    const body = z
      .object({
        title: z.string().min(1).max(200),
        kind: z.enum(["document", "key", "asset", "media", "secret"]).optional(),
        mimeType: z.string().max(120).optional(),
        sizeBytes: z.number().int().min(0).optional(),
        previewHint: z.string().max(280).optional(),
      })
      .parse(req.body);

    const row = await prisma.personalVaultItem.create({
      data: {
        userId: req.lifeosUser!.id,
        title: body.title.trim(),
        kind: body.kind ?? "document",
        mimeType: body.mimeType ?? null,
        sizeBytes: body.sizeBytes ?? null,
        previewHint: body.previewHint ?? null,
        encryptedMeta: JSON.stringify({ source: "lifeos_personal_upload" }),
      },
    });

    return reply.code(201).send({
      item: {
        id: row.id,
        title: row.title,
        kind: row.kind,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        previewHint: row.previewHint,
        encrypted: true,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  });

  app.get("/v1/personal/discovery", { preHandler: requireSession }, async (req) => {
    const bearer = bearerFromRequest(req as { headers: Record<string, unknown> });
    // Prefer Digiconomy / feed when configured; otherwise LifeOS experiences as federated discovery.
    if (config.digiconomyApiUrl && bearer) {
      const remote = await digiconomyFetch("/api/me", { bearer });
      if (remote.ok) {
        /* Core has no discovery feed yet — fall through to LifeOS catalog. */
      }
    }

    const experiences = await prisma.experience.findMany({
      where: { status: "active" },
      orderBy: [{ featured: "desc" }, { updatedAt: "desc" }],
      take: 24,
    });

    const items = experiences.map((e) => ({
      id: e.id,
      title: e.displayName,
      kind: e.category || e.osType || "experience",
      summary: e.description,
      source: e.businessName,
      previewUrl: e.icon,
      createdAt: e.updatedAt.toISOString(),
    }));

    if (!items.length) {
      return {
        items: [
          {
            id: "seed-vault",
            title: "Offline Vault ready",
            kind: "system",
            summary: "Kernel 1 personal vault is available in Personal space.",
            source: "LifeOS",
            previewUrl: null,
            createdAt: new Date().toISOString(),
          },
          {
            id: "seed-finance",
            title: "Personal ledger connected",
            kind: "system",
            summary: "View net worth and private transactions under Personal Finance.",
            source: "LifeOS",
            previewUrl: null,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    return { items };
  });

  app.get("/v1/personal/finance/summary", { preHandler: requireSession }, async (req) => {
    const bearer = bearerFromRequest(req as { headers: Record<string, unknown> });
    const currency = "NGN";

    if (config.digiconomyApiUrl && bearer) {
      const wallets = await digiconomyFetch("/api/wallets", { bearer });
      if (wallets.ok && wallets.json?.success && Array.isArray(wallets.json.data)) {
        const list = wallets.json.data as Array<{ id?: string; walletId?: string }>;
        const first = list[0];
        const walletId = first?.id || first?.walletId;
        if (walletId) {
          const summary = await digiconomyFetch(`/api/wallets/${walletId}/balance-summary`, {
            bearer,
          });
          const tx = await digiconomyFetch(
            `/api/wallets/${walletId}/transactions?limit=20&offset=0`,
            { bearer },
          );
          const data = (summary.json?.data ?? {}) as Record<string, unknown>;
          const net =
            Number(data.netWorth ?? data.total ?? data.available ?? data.balance ?? 0) || 0;
          const available = Number(data.available ?? data.balance ?? net) || 0;
          const rawTx = Array.isArray(tx.json?.data)
            ? (tx.json!.data as Array<Record<string, unknown>>)
            : Array.isArray((tx.json?.data as { items?: unknown })?.items)
              ? ((tx.json!.data as { items: Array<Record<string, unknown>> }).items)
              : [];

          return {
            netWorth: net,
            currency: String(data.currency ?? currency),
            available,
            ledgerLabel: "Digiconomy personal ledger",
            source: "digiconomy" as const,
            transactions: rawTx.slice(0, 20).map((t, i) => {
              const amount = Number(t.amount ?? t.value ?? 0) || 0;
              return {
                id: String(t.id ?? `tx_${i}`),
                label: String(t.label ?? t.description ?? t.memo ?? "Ledger entry"),
                amount: Math.abs(amount),
                currency: String(t.currency ?? data.currency ?? currency),
                direction: (amount < 0 ? "out" : "in") as "in" | "out",
                at: String(t.at ?? t.createdAt ?? new Date().toISOString()),
              };
            }),
          };
        }
      }
    }

    // LifeOS-local demo summary (isolated from Business FinanceOS UI).
    return {
      netWorth: 0,
      currency,
      available: 0,
      ledgerLabel: "Personal ledger",
      source: "lifeos" as const,
      transactions: [] as Array<{
        id: string;
        label: string;
        amount: number;
        currency: string;
        direction: "in" | "out";
        at: string;
      }>,
    };
  });
}
