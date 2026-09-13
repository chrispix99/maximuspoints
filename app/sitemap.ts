import type { MetadataRoute } from "next";

const BASE_URL = "https://maximuspoints-chris-picks-projects.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-09-13");
  const pages = ["/", "/cards", "/optimizer", "/advisor", "/calculator", "/portals"];
  return pages.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
  }));
}
