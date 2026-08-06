import type {
  AvailabilityQuery,
  AvailabilityResponse,
  AvailabilitySlot,
  DiscoverableOffering,
  SlotPickerConfig,
} from "@lifeos/shared";
import { getOfferingProvider } from "./offerings.js";

/**
 * AvailabilityProvider — LifeOS requests slots; HospitalityOS (or peer) remains authoritative.
 * Mock projects deterministic slots from offering type until a live catalog feed exists.
 */
export interface AvailabilityProvider {
  getAvailability(offeringId: string, query?: AvailabilityQuery): Promise<AvailabilityResponse | null>;
  getSlots(offeringId: string, query?: AvailabilityQuery): Promise<AvailabilitySlot[]>;
  checkAvailability(offeringId: string, slotId: string): Promise<{ available: boolean; reason?: string; slot?: AvailabilitySlot }>;
  slotPickerConfig(offering: DiscoverableOffering): SlotPickerConfig;
}

function dayIso(offsetDays: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function slot(
  id: string,
  label: string,
  startsAt: string,
  available: boolean,
  remaining?: number,
  priceFormatted?: string,
): AvailabilitySlot {
  return { id, label, startsAt, available, remaining: remaining ?? null, priceFormatted: priceFormatted ?? null };
}

export class MockAvailabilityProvider implements AvailabilityProvider {
  async getAvailability(offeringId: string, query: AvailabilityQuery = {}) {
    const offering = await getOfferingProvider().getById(offeringId);
    if (!offering) return null;
    const slots = await this.getSlots(offeringId, query);
    return {
      offeringId,
      timezone: "Africa/Lagos",
      summary: offering.availability ?? `${slots.filter((s) => s.available).length} open slots`,
      slots,
      source: "hospitalityos-availability-projection",
      staleWarning: "Slots may change — the provider re-checks availability when you confirm.",
    };
  }

  async getSlots(offeringId: string, query: AvailabilityQuery = {}) {
    const offering = await getOfferingProvider().getById(offeringId);
    if (!offering) return [];
    const day = query.date ? new Date(query.date) : new Date();
    const baseOffset = query.date
      ? Math.round((day.getTime() - Date.now()) / 86400000)
      : offering.type === "TREATMENT"
        ? 1
        : 0;

    if (offering.type === "ROOM") {
      return [
        slot(`room_in_${baseOffset}`, `Check-in · ${labelDay(baseOffset)}`, dayIso(Math.max(baseOffset, 0), 14), true, 3, offering.priceFormatted),
        slot(`room_in_${baseOffset + 1}`, `Check-in · ${labelDay(baseOffset + 1)}`, dayIso(baseOffset + 1, 14), true, 2, offering.priceFormatted),
        slot(`room_in_${baseOffset + 2}`, `Check-in · ${labelDay(baseOffset + 2)}`, dayIso(baseOffset + 2, 14), false, 0, offering.priceFormatted),
      ];
    }
    if (offering.type === "TREATMENT" || offering.type === "SERVICE" || offering.type === "PACKAGE") {
      return [
        slot(`t_15`, `${labelDay(baseOffset)} · 3:00 PM`, dayIso(baseOffset, 15), true, 2, offering.priceFormatted),
        slot(`t_16`, `${labelDay(baseOffset)} · 4:00 PM`, dayIso(baseOffset, 16), true, 1, offering.priceFormatted),
        slot(`t_17`, `${labelDay(baseOffset)} · 5:00 PM`, dayIso(baseOffset, 17), false, 0, offering.priceFormatted),
        slot(`t_next`, `${labelDay(baseOffset + 1)} · 11:00 AM`, dayIso(baseOffset + 1, 11), true, 3, offering.priceFormatted),
      ];
    }
    if (offering.type === "CLASS") {
      return [
        slot(`c_1`, `Saturday · 10:00 AM`, dayIso(nextWeekday(6), 10), true, 8, offering.priceFormatted),
        slot(`c_2`, `Tonight · 7:00 PM`, dayIso(0, 19), true, 4, offering.priceFormatted),
        slot(`c_3`, `Sunday · 9:00 AM`, dayIso(nextWeekday(0), 9), true, 12, offering.priceFormatted),
      ];
    }
    if (offering.type === "TICKET" || offering.type === "SHOWTIME" || offering.type === "EVENT") {
      return [
        slot(`show_1`, `Tonight · 8:15 PM`, dayIso(0, 20, 15), true, 40, offering.priceFormatted),
        slot(`show_2`, `Tonight · 10:30 PM`, dayIso(0, 22, 30), true, 22, offering.priceFormatted),
        slot(`show_3`, `Tomorrow · 6:00 PM`, dayIso(1, 18), false, 0, offering.priceFormatted),
      ];
    }
    if (offering.type === "MEAL") {
      const qty = query.quantity ?? 2;
      return [
        slot(`meal_1`, `Tonight · 7:00 PM · party ${qty}`, dayIso(0, 19), true, 5, offering.priceFormatted),
        slot(`meal_2`, `Tonight · 8:30 PM · party ${qty}`, dayIso(0, 20, 30), true, 3, offering.priceFormatted),
        slot(`meal_3`, `Tomorrow · 1:00 PM · party ${qty}`, dayIso(1, 13), true, 6, offering.priceFormatted),
      ];
    }
    return [
      slot(`gen_1`, `Tomorrow · 2:00 PM`, dayIso(1, 14), true, 2, offering.priceFormatted),
      slot(`gen_2`, `Tomorrow · 4:00 PM`, dayIso(1, 16), true, 1, offering.priceFormatted),
    ];
  }

  async checkAvailability(offeringId: string, slotId: string) {
    const slots = await this.getSlots(offeringId);
    const found = slots.find((s) => s.id === slotId);
    if (!found) return { available: false, reason: "That time is no longer listed." };
    if (!found.available) return { available: false, reason: "That time was just taken.", slot: found };
    // Simulate rare conflict for a reserved id
    if (slotId.endsWith("_conflict")) {
      return { available: false, reason: "That time was just taken.", slot: { ...found, available: false } };
    }
    return { available: true, slot: found };
  }

  slotPickerConfig(offering: DiscoverableOffering): SlotPickerConfig {
    if (offering.type === "ROOM") {
      return { mode: "daterange", labels: { primary: "Check-in", secondary: "Check-out" } };
    }
    if (offering.type === "MEAL") {
      return { mode: "party", labels: { primary: "Date & time", quantity: "Party size" } };
    }
    if (offering.type === "CLASS") {
      return { mode: "class", labels: { primary: "Class time" } };
    }
    if (offering.type === "TICKET" || offering.type === "SHOWTIME" || offering.type === "EVENT") {
      return { mode: "showtime", labels: { primary: "Showtime", quantity: "Tickets" } };
    }
    return { mode: "datetime", labels: { primary: "Date & time" } };
  }
}

function labelDay(offset: number): string {
  if (offset <= 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function nextWeekday(target: number): number {
  const now = new Date();
  const delta = (target - now.getDay() + 7) % 7 || 7;
  return delta;
}

let provider: AvailabilityProvider | null = null;

export function getAvailabilityProvider(): AvailabilityProvider {
  if (!provider) provider = new MockAvailabilityProvider();
  return provider;
}
