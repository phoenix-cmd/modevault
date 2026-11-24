import type { MetadataRoute } from "next"

function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return configured.replace(/\/+$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "https://modelvault.dev"
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()
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
    host: siteUrl,
  }
}
