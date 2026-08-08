import { serviceLabel, serviceVerticalById } from "./serviceCatalog";
import { SERVICE_CONCEPTS } from "./serviceReels";

export type PageMeta = {
  title: string;
  subtitle?: string;
};

/** Resolve chrome for non-Home routes. Home returns null (greeting header). */
export function resolvePageMeta(pathname: string): PageMeta | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app") return null;

  if (path.startsWith("/app/discover")) {
    return { title: "Explore", subtitle: "Businesses deployed on LifeOS" };
  }
  if (path.match(/^\/app\/business\/[^/]+$/)) {
    return { title: "Business", subtitle: "Services & experience" };
  }
  if (path.startsWith("/app/wallet")) {
    return { title: "Finance", subtitle: "Cash, tokens & more" };
  }
  if (path.startsWith("/app/activity")) {
    return { title: "Activity", subtitle: "Your recent LifeOS events" };
  }
  if (path.startsWith("/app/profile")) {
    return { title: "Profile" };
  }
  if (path.startsWith("/app/notifications")) {
    return { title: "Notifications" };
  }
  if (path.startsWith("/app/messages")) {
    return { title: "Messages" };
  }
  if (path.startsWith("/app/search")) {
    return { title: "Search" };
  }
  if (path.startsWith("/app/connections")) {
    return { title: "Connections" };
  }
  if (path.startsWith("/app/plans")) {
    return { title: "Today" };
  }
  if (path.startsWith("/app/saved")) {
    return { title: "Saved" };
  }
  const sellersMatch = path.match(/^\/app\/services\/explore\/([^/]+)$/);
  if (sellersMatch) {
    const concept = SERVICE_CONCEPTS.find((c) => c.id === decodeURIComponent(sellersMatch[1]));
    return {
      title: concept?.title ?? "Sellers",
      subtitle: "Businesses that offer this",
    };
  }
  if (path === "/app/services/explore") {
    return { title: "Discover", subtitle: "Services in video — tap to find sellers" };
  }

  const feedMatch = path.match(/^\/app\/services\/([^/]+)\/feed$/);
  if (feedMatch) {
    const category = decodeURIComponent(feedMatch[1]);
    const vertical = serviceVerticalById(category);
    return {
      title: category === "Stay" ? "Hotel rooms" : serviceLabel(category),
      subtitle: vertical?.blurb ?? "Swipe to explore",
    };
  }

  const categoryMatch = path.match(/^\/app\/services\/([^/]+)$/);
  if (categoryMatch) {
    const category = decodeURIComponent(categoryMatch[1]);
    const vertical = serviceVerticalById(category);
    return {
      title: serviceLabel(category),
      subtitle: vertical?.blurb,
    };
  }

  if (path.startsWith("/app/services")) {
    return { title: "Services", subtitle: "Everything LifeOS can book" };
  }

  return { title: "LifeOS" };
}
