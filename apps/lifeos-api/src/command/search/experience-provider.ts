import type { SearchResult, SearchResultAction } from "@lifeos/shared";
import { prisma } from "../../lib/prisma.js";
import { getBusinessDirectory } from "../../services/directory.js";
import type { SearchContext, SearchProvider } from "./types.js";
import { scoreMatch } from "./types.js";

export class ExperienceSearchProvider implements SearchProvider {
  readonly id = "experience";

  async search(ctx: SearchContext): Promise<SearchResult[]> {
    const directory = getBusinessDirectory();
    const items = await directory.search(ctx.query);
    return items.map((e) => {
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
      } else {
        actions.push({
          id: `book_${e.id}`,
          label: "Book",
          actionId: "BOOK_SERVICE",
          params: { experienceId: e.id, service: e.displayName },
          requiresConfirmation: true,
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
        },
        actions,
        source: this.id,
        score: score || 0.4,
      } satisfies SearchResult;
    });
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
