import type { SearchResult, SearchResultAction } from "@lifeos/shared";
import { getBusinessDirectory } from "../../services/directory.js";
import { getOfferingProvider } from "../../services/offerings.js";
import { prisma } from "../../lib/prisma.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

/** Offering-first search — action queries return treatments/meals/rooms before businesses. */
export class OfferingSearchProvider implements SearchProvider {
  readonly id = "offering";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const offerings = await getOfferingProvider().search(ctx.query);
    return offerings.slice(0, 16).map((o) => {
      const score = Math.max(
        scoreMatch(o.name, ctx.query),
        scoreMatch(o.description, ctx.query),
        scoreMatch(o.category, ctx.query),
        scoreMatch(o.type, ctx.query),
        scoreMatch(o.businessName, ctx.query) * 0.5,
      );
      const actions: SearchResultAction[] = [
        {
          id: `view_off_${o.id}`,
          label: "View",
          actionId: "OPEN_EXPERIENCE",
          params: { experienceId: o.experienceId, offeringId: o.id },
        },
      ];
      if (o.bookingCapability) {
        actions.push({
          id: `book_off_${o.id}`,
          label: "Book",
          actionId: "BOOK_SERVICE",
          params: {
            experienceId: o.experienceId,
            offeringId: o.id,
            service: o.name,
            amount: o.priceFormatted,
          },
          requiresConfirmation: true,
        });
      }
      return {
        id: `offering_${o.id}`,
        type: "OFFERING" as const,
        title: o.name,
        subtitle: o.businessName,
        description: [o.duration, o.priceFormatted, o.availability].filter(Boolean).join(" · "),
        icon: o.image ?? undefined,
        metadata: {
          offeringId: o.id,
          experienceId: o.experienceId,
          businessId: o.businessId,
          type: o.type,
          category: o.category,
          price: o.price,
          availability: o.availability,
          cancellationPolicy: o.cancellationPolicy,
          distanceKm: o.distanceKm,
          navigateTo: `/app/discover?offering=${o.id}`,
          availableActions: o.bookingCapability ? ["View", "Book"] : ["View"],
        },
        actions,
        source: this.id,
        score: Math.max(score, 0.45),
      } satisfies SearchResult;
    });
  }
}

export class ExperienceSearchProvider implements SearchProvider {
  readonly id = "experience";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const directory = getBusinessDirectory();
    const items = await directory.search(ctx.query);
    const businesses = await getOfferingProvider().listBusinesses(ctx.query);

    const experienceResults: SearchResult[] = items.map((e) => {
      const connected = ctx.connectedExperienceIds.has(e.id);
      const score = Math.max(
        scoreMatch(e.displayName, ctx.query),
        scoreMatch(e.businessName, ctx.query),
        scoreMatch(e.category, ctx.query),
        scoreMatch(e.description, ctx.query),
      );
      const actions: SearchResultAction[] = [
        {
          id: `view_${e.id}`,
          label: "View",
          actionId: "OPEN_EXPERIENCE",
          params: { experienceId: e.id },
        },
      ];
      if (connected) {
        actions.push({
          id: `open_${e.id}`,
          label: "Open",
          actionId: "OPEN_EXPERIENCE",
          params: { experienceId: e.id },
        });
      }
      return {
        id: `exp_${e.id}`,
        type: "EXPERIENCE" as const,
        title: e.displayName,
        subtitle: e.businessName,
        description: e.description,
        icon: e.icon ?? undefined,
        metadata: {
          experienceId: e.id,
          category: e.category,
          location: e.location,
          connected,
          navigateTo: `/app/discover?business=${e.businessId}`,
        },
        actions,
        source: this.id,
        score: score || 0.35,
      } satisfies SearchResult;
    });

    const businessResults: SearchResult[] = businesses.map((b) => ({
      id: `biz_${b.businessId}`,
      type: "BUSINESS" as const,
      title: b.businessName,
      subtitle: b.category,
      description: b.description,
      actions: [
        {
          id: `biz_view_${b.businessId}`,
          label: "View",
          actionId: "OPEN_EXPERIENCE",
          params: { experienceId: b.experienceId, businessId: b.businessId },
        },
      ],
      source: this.id,
      score: Math.max(scoreMatch(b.businessName, ctx.query), 0.5),
      metadata: {
        businessId: b.businessId,
        experienceId: b.experienceId,
        navigateTo: `/app/discover?business=${b.businessId}`,
      },
    }));

    return [...experienceResults, ...businessResults];
  }
}

export class BookingSearchProvider implements SearchProvider {
  readonly id = "booking";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const rows = await prisma.activity.findMany({
      where: {
        userId: ctx.userId,
        OR: [{ kind: "hotel_booking" }, { title: { contains: "book", mode: "insensitive" } }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const out: SearchResult[] = [];
    for (const r of rows) {
      const score = Math.max(
        scoreMatch(r.title, ctx.query),
        scoreMatch(r.detail, ctx.query),
        scoreMatch("booking reservation", ctx.query),
      );
      if (score < 0.4 && !/book|reserv/i.test(ctx.query)) continue;
      if (r.experienceId && !ctx.connectedExperienceIds.has(r.experienceId)) continue;
      const actions: SearchResultAction[] = [
        {
          id: `view_booking_${r.id}`,
          label: "View",
          actionId: "VIEW_BOOKINGS",
        },
      ];
      if (r.experienceId) {
        actions.push({
          id: `checkin_${r.id}`,
          label: "Check in",
          actionId: "CHECK_IN",
          params: { experienceId: r.experienceId, bookingId: r.id },
          requiresConfirmation: true,
        });
      }
      out.push({
        id: `booking_${r.id}`,
        type: "BOOKING",
        title: r.title,
        subtitle: r.detail,
        description: r.source,
        actions,
        source: this.id,
        score: Math.max(score, 0.5),
        metadata: { activityId: r.id, experienceId: r.experienceId },
      });
    }
    return out;
  }
}
