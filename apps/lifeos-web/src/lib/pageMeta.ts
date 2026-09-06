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

  if (path.startsWith("/app/shared/identity")) {
    return { title: "Identity", subtitle: "TrustID DID & verification" };
  }
  if (path.startsWith("/app/shared/security")) {
    return { title: "Security", subtitle: "Devices & biometric lock" };
  }
  if (path.startsWith("/app/shared/notifications")) {
    return { title: "ElfCom alerts", subtitle: "Push & workspace filters" };
  }
  if (path.startsWith("/app/shared/bridge")) {
    return { title: "Cross-space bridge", subtitle: "Personal → Business links" };
  }
  if (path.startsWith("/app/shared")) {
    return { title: "Shared settings" };
  }

  if (path === "/app/personal" || path === "/app/personal/main" || path === "/app/personal/post") {
    return { title: "Post", subtitle: "Home" };
  }
  if (path.startsWith("/app/personal/reels")) {
    return { title: "Reels", subtitle: "Home" };
  }
  if (path.startsWith("/app/personal/connects")) {
    return { title: "Connects", subtitle: "Home" };
  }
  if (path.startsWith("/app/personal/communities")) {
    return { title: "Communities", subtitle: "Home" };
  }
  if (path.startsWith("/app/personal/learnverse/edu")) {
    return { title: "Edu", subtitle: "Higher & secondary" };
  }
  if (path.startsWith("/app/personal/learnverse")) {
    return { title: "LearnVerse", subtitle: "Books · Courses · Edu · Schools" };
  }
  if (path.startsWith("/app/personal/streamify")) {
    return { title: "Streamify", subtitle: "Content · Music · Podcast · Videos" };
  }
  if (path.startsWith("/app/personal/plus")) {
    return { title: "Plus", subtitle: "Random discover" };
  }
  if (path.startsWith("/app/personal/offline") || path.startsWith("/app/personal/vault")) {
    return { title: "Offline", subtitle: "Bought & consumed" };
  }
  if (path.startsWith("/app/personal/free") || path.startsWith("/app/personal/discovery")) {
    return { title: "Free", subtitle: "Creator free content" };
  }
  if (path.startsWith("/app/personal/finance")) {
    return { title: "Finance", subtitle: "Business money view" };
  }
  if (path === "/app/business") {
    return { title: "Business", subtitle: "Consume & patronize" };
  }
  if (path.startsWith("/app/business/modules")) {
    return { title: "Modules", subtitle: "Enabled business verticals" };
  }

  if (path.startsWith("/app/serviceos/track")) {
    return { title: "Live tracking", subtitle: "Your professional is on the way" };
  }
  if (path.startsWith("/app/serviceos")) {
    return { title: "ServiceOS", subtitle: "Book an at-home visit" };
  }

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
