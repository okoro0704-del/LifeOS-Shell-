import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Where HospitalityOS (business PWAs) is hosted.
 * Local: http://localhost:5180
 * Production: LifeOS Netlify origin (experiences served under /hos)
 */
function resolveHospitality() {
  const raw =
    process.env.HOSPITALITY_ORIGIN?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://lifeos011.netlify.app"
      : "http://localhost:5180");
  const origin = raw.replace(/\/$/, "");
  const basePath =
    process.env.HOSPITALITY_BASE_PATH?.trim() ||
    (process.env.NODE_ENV === "production" || origin.includes("netlify.app") ? "/hos" : "");
  const normalizedBase = basePath && !basePath.startsWith("/") ? `/${basePath}` : basePath;
  return { origin, base: normalizedBase.replace(/\/$/, "") };
}

function experienceUrl(path: string, hos: { origin: string; base: string }) {
  const suffix = path === "/" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (!hos.base) return `${hos.origin}${suffix === "/" ? "/" : suffix}`;
  if (suffix === "/") return `${hos.origin}${hos.base}/`;
  return `${hos.origin}${hos.base}${suffix}`;
}

async function main() {
  const hos = resolveHospitality();
  const hospitalityOrigin = hos.origin;

  const experiences = [
    {
      id: "exp_sunrise_hotel",
      businessId: "biz_sunrise",
      businessName: "Sunrise Hotel",
      osType: "hospitality",
      category: "Hotels",
      experienceType: "web",
      experienceUrl: experienceUrl("/", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "Sunrise Hotel",
      description: "Boutique waterfront stay with guest booking experience.",
      location: "Lagos",
      status: "active",
      version: "1.0.0",
      icon: "hotel",
      permissions: JSON.stringify(["profile.basic", "notifications"]),
      metadata: JSON.stringify({ osLabel: "HospitalityOS", availability: "Open" }),
      featured: true,
    },
    {
      id: "exp_grand_restaurant",
      businessId: "biz_grand_rest",
      businessName: "Grand Restaurant",
      osType: "hospitality",
      category: "Restaurants",
      experienceType: "web",
      experienceUrl: experienceUrl("/restaurant", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "Grand Restaurant",
      description: "Table booking and dining — HospitalityOS guest experience.",
      location: "Lagos",
      status: "active",
      version: "1.0.0",
      icon: "restaurant",
      permissions: JSON.stringify(["profile.basic", "notifications"]),
      metadata: JSON.stringify({ osLabel: "HospitalityOS", availability: "Open" }),
      featured: true,
    },
    {
      id: "exp_harbor_apt",
      businessId: "biz_harbor_apt",
      businessName: "Harbor Apartments",
      osType: "realestate",
      category: "Apartments",
      experienceType: "web",
      experienceUrl: experienceUrl("/apartment", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "Harbor Apartments",
      description: "Short-stay apartments (preview listing).",
      location: "Victoria Island",
      status: "active",
      version: "0.9.0",
      icon: "apartment",
      permissions: JSON.stringify(["profile.basic"]),
      metadata: JSON.stringify({ osLabel: "RealEstateOS (preview)", availability: "Preview" }),
      featured: false,
    },
    {
      id: "exp_city_transit",
      businessId: "biz_city_transit",
      businessName: "City Transit",
      osType: "transport",
      category: "Transport",
      experienceType: "external",
      experienceUrl: experienceUrl("/", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "City Transit",
      description: "Placeholder transport experience for directory coverage.",
      location: "Metro",
      status: "active",
      version: "0.1.0",
      icon: "transport",
      permissions: JSON.stringify(["profile.basic"]),
      metadata: JSON.stringify({ osLabel: "TransportOS (preview)", availability: "Coming soon" }),
      featured: false,
    },
    {
      id: "exp_serenity_spa",
      businessId: "biz_serenity_spa",
      businessName: "Serenity Spa",
      osType: "hospitality",
      category: "Services",
      experienceType: "web",
      experienceUrl: experienceUrl("/", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "Serenity Spa",
      description: "Spa treatments and wellness packages (HospitalityOS projection).",
      location: "Victoria Island",
      status: "active",
      version: "1.0.0",
      icon: "spa",
      permissions: JSON.stringify(["profile.basic", "notifications"]),
      metadata: JSON.stringify({ osLabel: "HospitalityOS", availability: "Open" }),
      featured: true,
    },
    {
      id: "exp_peak_fitness",
      businessId: "biz_peak_fitness",
      businessName: "Peak Fitness",
      osType: "services",
      category: "Services",
      experienceType: "web",
      experienceUrl: experienceUrl("/", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "Peak Fitness",
      description: "Classes, day passes, and memberships.",
      location: "Lagos",
      status: "active",
      version: "1.0.0",
      icon: "fitness",
      permissions: JSON.stringify(["profile.basic", "notifications"]),
      metadata: JSON.stringify({ osLabel: "HospitalityOS", availability: "Open" }),
      featured: true,
    },
    {
      id: "exp_city_cinema",
      businessId: "biz_city_cinema",
      businessName: "City Cinema",
      osType: "services",
      category: "Other",
      experienceType: "web",
      experienceUrl: experienceUrl("/", hos),
      approvedOrigin: hospitalityOrigin,
      displayName: "City Cinema",
      description: "Movies, showtimes, and VIP tickets.",
      location: "Lagos",
      status: "active",
      version: "1.0.0",
      icon: "cinema",
      permissions: JSON.stringify(["profile.basic", "notifications"]),
      metadata: JSON.stringify({ osLabel: "HospitalityOS", availability: "Open" }),
      featured: false,
    },
  ];

  for (const exp of experiences) {
    await prisma.experience.upsert({
      where: { id: exp.id },
      update: exp,
      create: exp,
    });
  }

  console.log(
    `Seeded ${experiences.length} experiences → ${hospitalityOrigin}${hos.base || ""}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
