import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Search results and the old tree redirect are not pages worth crawling.
    rules: { userAgent: "*", allow: "/", disallow: ["/search", "/tree/", "/ngau-nhien"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
