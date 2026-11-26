import type { MetadataRoute } from "next"
import { getSiteUrlString } from "@/lib/site-url"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrlString()
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: [
          "/api/",
          "/overview",
          "/projects",
          "/agents",
          "/workflows",
          "/studio",
          "/git",
          "/verify",
          "/models",
          "/api-usage",
          "/analytics",
          "/subscriptions",
          "/billing",
          "/calendar",
          "/integrations",
          "/organizations",
          "/permissions",
          "/notifications",
          "/settings",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
