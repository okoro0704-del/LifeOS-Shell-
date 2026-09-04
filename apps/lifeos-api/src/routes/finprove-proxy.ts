import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../lib/config.js";

const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

const PREFIXES = [
  "/api/v1/finprove",
  "/v1/finprove",
  "/api/v1/gateway/finprove",
  "/v1/gateway/finprove",
];

/**
 * Reverse-proxy LifeOS Gateway paths onto the standalone Finprove engine (:4220).
 * Browser `/api` (Vite) and direct API clients both resolve to the same broker.
 */
export async function finproveProxyRoutes(app: FastifyInstance) {
  const handler = async (req: FastifyRequest, reply: FastifyReply) => {
    const rest = rewrite(req.url);
    const target = `${config.finproveUrl.replace(/\/$/, "")}/api/v1/finprove${rest}`;
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (HOP.has(k.toLowerCase())) continue;
      if (typeof v === "string") headers[k] = v;
      else if (Array.isArray(v) && v[0]) headers[k] = v[0];
    }

    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    try {
      const res = await fetch(target, {
        method: req.method,
        headers,
        body: hasBody && req.body !== undefined ? JSON.stringify(req.body) : undefined,
      });
      const text = await res.text();
      reply.header("content-type", res.headers.get("content-type") ?? "application/json");
      try {
        return reply.code(res.status).send(text ? JSON.parse(text) : null);
      } catch {
        return reply.code(res.status).send(text);
      }
    } catch (err) {
      return reply.code(502).send({
        error: "finprove_unreachable",
        module: "finprov",
        message: err instanceof Error ? err.message : "Finprove engine is offline",
        upstream: config.finproveUrl,
      });
    }
  };

  for (const prefix of PREFIXES) {
    app.all(prefix, handler);
    app.all(`${prefix}/*`, handler);
  }
}

function rewrite(url: string): string {
  return url
    .replace(/^\/api\/v1\/gateway\/finprove/, "")
    .replace(/^\/api\/v1\/finprove/, "")
    .replace(/^\/v1\/gateway\/finprove/, "")
    .replace(/^\/v1\/finprove/, "");
}
