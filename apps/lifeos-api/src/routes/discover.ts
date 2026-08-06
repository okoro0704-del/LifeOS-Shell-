import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { EXPERIENCE_PERMISSIONS, PERMISSION_LABELS, type ExperiencePermission } from "@lifeos/shared";
import { requireSession } from "../lib/auth.js";
import { getBusinessDirectory } from "../services/directory.js";
import { getExperienceProvider, parsePerms } from "../services/experience.js";
import { getOfferingProvider, isOfferingType } from "../services/offerings.js";
import { getAvailabilityProvider } from "../services/availability.js";
import { isSaved } from "../services/saved-offerings.js";

/** Map legacy Experience categories to offering discovery chips. */
function mapLegacyCategory(category?: string): string | undefined {
  if (!category || category === "All") return undefined;
  const map: Record<string, string> = {
    Hotels: "Stay",
    Apartments: "Stay",
    Restaurants: "Eat",
    Services: "Wellness",
    Transport: "Travel",
    Other: "More",
    Stay: "Stay",
    Eat: "Eat",
    Wellness: "Wellness",
    Fitness: "Fitness",
    Events: "Events",
    Cinema: "Cinema",
    Activities: "Activities",
    Travel: "Travel",
    More: "More",
  };
  return map[category] ?? category;
}

export async function discoverRoutes(app: FastifyInstance) {
  const directory = getBusinessDirectory();
  const experiences = getExperienceProvider();
  const offerings = getOfferingProvider();

  app.get("/discover", { preHandler: requireSession }, async (req) => {
    const q = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q : undefined;
    const category =
      typeof (req.query as { category?: string }).category === "string"
        ? (req.query as { category: string }).category
        : undefined;
    const items = await directory.list({ q, category });
    const categories = await directory.categories();
    let preferredCategories: string[] | undefined;
    let preferredBusinessIds: string[] | undefined;
    try {
      const { personalContextService } = await import("../services/personal-context.js");
      const snap = await personalContextService.getSnapshot(req.lifeosUser!.id, req.lifeosUser!.trustId);
      preferredCategories = snap.signals.preferredCategories;
      preferredBusinessIds = snap.signals.preferredBusinessIds;
    } catch {
      /* personalization optional */
    }
    const offeringList = await offerings.list({
      q,
      category: mapLegacyCategory(category),
      preferredCategories,
      preferredBusinessIds,
    });
    const offeringCategories = await offerings.categories();
    return {
      categories,
      featured: items.filter((i) => i.featured),
      items,
      offerings: offeringList,
      featuredOfferings: offeringList.filter((o) => o.featured).slice(0, 12),
      offeringCategories,
      mode: "offerings",
    };
  });

  app.get("/discover/categories", { preHandler: requireSession }, async () => {
    return {
      categories: await directory.categories(),
      offeringCategories: await offerings.categories(),
    };
  });

  app.get("/discover/offerings", { preHandler: requireSession }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const type = query.type && isOfferingType(query.type) ? query.type : undefined;
    const list = await offerings.list({
      q: query.q,
      category: query.category,
      type,
      businessId: query.business,
      experienceId: query.experienceId,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      availableOnly: query.available === "1" || query.available === "true",
      sort: (query.sort as "relevance" | "price_asc" | "price_desc" | "rating" | "distance") || "relevance",
    });
    return { offerings: list, count: list.length };
  });

  app.get<{ Params: { id: string } }>(
    "/discover/offerings/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      const offering = await offerings.getById(req.params.id);
      if (!offering) return reply.code(404).send({ error: "not_found" });
      const business = await offerings.getBusiness(offering.businessId);
      const more = (await offerings.listByBusiness(offering.businessId)).filter((o) => o.id !== offering.id);
      const availability = await getAvailabilityProvider().getAvailability(offering.id);
      const slotPicker = getAvailabilityProvider().slotPickerConfig(offering);
      const saved = await isSaved(req.lifeosUser!.id, offering.id);
      return {
        offering,
        business,
        moreFromBusiness: more,
        availability,
        slotPicker,
        saved,
        capabilities: offering.capabilities,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/discover/offerings/:id/availability",
    { preHandler: requireSession },
    async (req, reply) => {
      const query = req.query as Record<string, string | undefined>;
      const availability = await getAvailabilityProvider().getAvailability(req.params.id, {
        date: query.date,
        time: query.time,
        quantity: query.quantity ? Number(query.quantity) : undefined,
        duration: query.duration,
        location: query.location,
      });
      if (!availability) return reply.code(404).send({ error: "not_found" });
      const offering = await offerings.getById(req.params.id);
      return {
        availability,
        slotPicker: offering ? getAvailabilityProvider().slotPickerConfig(offering) : null,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/discover/offerings/:id/business",
    { preHandler: requireSession },
    async (req, reply) => {
      const offering = await offerings.getById(req.params.id);
      if (!offering) return reply.code(404).send({ error: "not_found" });
      const business = await offerings.getBusiness(offering.businessId);
      if (!business) return reply.code(404).send({ error: "not_found" });
      const related = await offerings.listByBusiness(offering.businessId);
      return { business, offerings: related };
    },
  );

  app.get("/discover/businesses", { preHandler: requireSession }, async (req) => {
    const q = typeof (req.query as { q?: string }).q === "string" ? (req.query as { q: string }).q : undefined;
    return { businesses: await offerings.listBusinesses(q) };
  });

  app.get<{ Params: { id: string } }>(
    "/discover/businesses/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      const business = await offerings.getBusiness(req.params.id);
      if (!business) return reply.code(404).send({ error: "not_found" });
      const related = await offerings.listByBusiness(business.businessId);
      const experience = await directory.getById(business.experienceId);
      return { business, offerings: related, experience };
    },
  );

  app.get("/experiences", { preHandler: requireSession }, async () => {
    const items = await directory.list();
    return { experiences: items };
  });

  app.get<{ Params: { id: string } }>(
    "/experiences/:id",
    { preHandler: requireSession },
    async (req, reply) => {
      const experience = await directory.getById(req.params.id);
      if (!experience) return reply.code(404).send({ error: "not_found" });
      const connection = await experiences.getConnection(req.lifeosUser!.id, experience.id);
      const relatedOfferings = await offerings.list({ experienceId: experience.id });
      return {
        experience,
        offerings: relatedOfferings,
        connection: connection
          ? {
              id: connection.id,
              status: connection.status,
              grantedPermissions: connection.grantedPermissions,
              connectedAt: connection.connectedAt.toISOString(),
              disconnectedAt: connection.disconnectedAt?.toISOString() ?? null,
            }
          : null,
      };
    },
  );

  app.get<{ Params: { id: string } }>(
    "/experiences/:id/permissions",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        const requested = await experiences.getPermissions(req.params.id);
        const connection = await experiences.getConnection(req.lifeosUser!.id, req.params.id);
        return {
          experienceId: req.params.id,
          requestable: requested.map((p) => ({
            id: p,
            label: PERMISSION_LABELS[p],
          })),
          catalog: EXPERIENCE_PERMISSIONS.map((p) => ({
            id: p,
            label: PERMISSION_LABELS[p],
          })),
          granted: connection?.status === "connected" ? connection.grantedPermissions : [],
          connected: connection?.status === "connected" || false,
        };
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  );

  const connectBody = z.object({
    permissions: z.array(z.string()).min(1),
  });

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/connect",
    { preHandler: requireSession },
    async (req, reply) => {
      const body = connectBody.parse(req.body);
      const permissions = body.permissions.filter((p): p is ExperiencePermission =>
        (EXPERIENCE_PERMISSIONS as readonly string[]).includes(p),
      );
      try {
        const result = await experiences.connect(
          req.lifeosUser!.id,
          req.params.id,
          permissions,
        );
        const session = await experiences.createExperienceSession({
          userId: req.lifeosUser!.id,
          trustId: req.lifeosUser!.trustId,
          displayName: req.lifeosUser!.displayName,
          experienceId: req.params.id,
        });
        return { ...result, session };
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === "permission_denied") {
          return reply.code(403).send({
            error: "permission_denied",
            message: err instanceof Error ? err.message : "Permission denied",
          });
        }
        if (code === "not_found") return reply.code(404).send({ error: "not_found" });
        throw err;
      }
    },
  );

  const denyBody = z.object({
    permissions: z.array(z.string()).min(1),
  });

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/permissions/deny",
    { preHandler: requireSession },
    async (req) => {
      const body = denyBody.parse(req.body);
      const permissions = body.permissions.filter((p): p is ExperiencePermission =>
        (EXPERIENCE_PERMISSIONS as readonly string[]).includes(p),
      );
      await experiences.denyPermissions(req.lifeosUser!.id, req.params.id, permissions);
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/experiences/:id/session",
    { preHandler: requireSession },
    async (req, reply) => {
      try {
        const session = await experiences.createExperienceSession({
          userId: req.lifeosUser!.id,
          trustId: req.lifeosUser!.trustId,
          displayName: req.lifeosUser!.displayName,
          experienceId: req.params.id,
        });
        return { session };
      } catch (err) {
        const code = (err as Error & { code?: string }).code;
        if (code === "not_connected") {
          return reply.code(403).send({ error: "not_connected", message: "Connect and grant permissions first" });
        }
        return reply.code(400).send({
          error: code || "session_failed",
          message: err instanceof Error ? err.message : "Failed",
        });
      }
    },
  );
}

void parsePerms;
