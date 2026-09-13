import type { MetadataRoute } from "next";

const BASE_URL = "https://maximuspoints-chris-picks-projects.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/tracker", "/accounts", "/signin", "/api/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
