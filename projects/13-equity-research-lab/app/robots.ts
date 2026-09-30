import type { MetadataRoute } from "next";
// Crawlers must never follow research links: each live report costs API credits.
export default function robots(): MetadataRoute.Robots { return { rules: [{ userAgent: "*", disallow: "/" }] }; }
