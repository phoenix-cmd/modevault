import type { Metadata, Viewport } from "next"
import { Chivo_Mono, Instrument_Sans, Space_Grotesk } from "next/font/google"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
})

const chivoMono = Chivo_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
})

function getSiteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (configured) return new URL(configured)
  if (process.env.VERCEL_URL) return new URL(`https://${process.env.VERCEL_URL}`)
  return new URL("https://modelvault.dev")
}

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "MODELVAULT — Software development. Orchestrated.",
    template: "%s | MODELVAULT",
  },
  description:
    "One environment to coordinate coding agents, automate engineering workflows, verify generated code, and govern AI resources.",
  applicationName: "MODELVAULT",
  keywords: [
    "AI coding agents",
    "multi-agent orchestration",
    "AI workflow builder",
    "code verification",
    "LLM cost tracking",
    "AI subscription manager",
    "Claude Code",
    "Codex",
    "Gemini CLI",
  ],
  authors: [{ name: "MODELVAULT" }],
  creator: "MODELVAULT",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "MODELVAULT",
    title: "MODELVAULT — Software development. Orchestrated.",
    description:
      "Coordinate coding agents, verify diffs before merge, build DAG pipelines, and track AI spend in one environment.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MODELVAULT — Software development. Orchestrated.",
    description:
      "Coordinate coding agents, automate workflows, verify diffs, and track AI spend in one workspace.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#151b1a" },
    { media: "(prefers-color-scheme: light)", color: "#f0ede6" },
  ],
}

// Dark Rig charcoal is the default system; opt-in archival paper light theme toggles .light.
const themeScript = `(function(){try{var t=localStorage.getItem("mv-theme");document.documentElement.classList.toggle("light",t==="light")}catch(e){document.documentElement.classList.remove("light")}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${instrumentSans.variable} ${chivoMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full bg-canvas text-ink" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
