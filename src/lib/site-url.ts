const DEFAULT_PRODUCTION_SITE_URL = "https://modevault.vercel.app"

export function getSiteUrlString(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) {
    return configured.replace(/\/+$/, "")
  }

  const vercelProdHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (vercelProdHost) {
    const withProtocol = /^https?:\/\//i.test(vercelProdHost)
      ? vercelProdHost
      : `https://${vercelProdHost}`
    return withProtocol.replace(/\/+$/, "")
  }

  return DEFAULT_PRODUCTION_SITE_URL
}

export function getSiteUrl(): URL {
  try {
    return new URL(getSiteUrlString())
  } catch {
    return new URL(DEFAULT_PRODUCTION_SITE_URL)
  }
}
