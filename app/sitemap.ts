import type { MetadataRoute } from "next";
import { allCardNamesFromJson, buildSlugMap } from "@/lib/card-slug";

const BASE_URL = "https://maximuspoints-chris-picks-projects.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-15");
  const pages = [
    "/",
    "/cards",
    "/optimizer",
    "/advisor",
    "/calculator",
    "/portals",
    "/alaska",
  ];
  const entries: MetadataRoute.Sitemap = pages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
  }));
  // Programmatic per-card review pages.
  const slugMap = buildSlugMap(allCardNamesFromJson());
  for (const slug of slugMap.values()) {
    entries.push({
      url: `${BASE_URL}/cards/${slug}`,
      lastModified,
    });
  }
  return entries;
}
