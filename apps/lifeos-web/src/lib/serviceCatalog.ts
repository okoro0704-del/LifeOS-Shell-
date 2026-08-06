/** Consumer-facing service verticals for Quick Access + Services browse. */

export type ServiceVertical = {
  id: string;
  label: string;
  blurb: string;
  /** CSS accent token key for reel styling */
  tone: "stay" | "eat" | "wellness" | "fitness" | "events" | "cinema" | "activities" | "travel";
};

export const SERVICE_VERTICALS: ServiceVertical[] = [
  {
    id: "Stay",
    label: "Hotel rooms",
    blurb: "Nights, suites, and stays near you",
    tone: "stay",
  },
  {
    id: "Eat",
    label: "Food",
    blurb: "Restaurants, buffets, and tables",
    tone: "eat",
  },
  {
    id: "Wellness",
    label: "Wellness",
    blurb: "Spa, treatments, and recovery",
    tone: "wellness",
  },
  {
    id: "Fitness",
    label: "Fitness",
    blurb: "Classes, training, and gym time",
    tone: "fitness",
  },
  {
    id: "Cinema",
    label: "Cinema",
    blurb: "Showtimes and tickets",
    tone: "cinema",
  },
  {
    id: "Events",
    label: "Events",
    blurb: "Concerts, nights out, and tickets",
    tone: "events",
  },
  {
    id: "Activities",
    label: "Activities",
    blurb: "Things to do nearby",
    tone: "activities",
  },
  {
    id: "Travel",
    label: "Travel",
    blurb: "Getting there and getting around",
    tone: "travel",
  },
];

export function serviceVerticalById(id: string): ServiceVertical | undefined {
  return SERVICE_VERTICALS.find((v) => v.id.toLowerCase() === id.toLowerCase());
}

export function serviceLabel(categoryId: string): string {
  return serviceVerticalById(categoryId)?.label ?? categoryId;
}
