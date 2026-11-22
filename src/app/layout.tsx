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

export const metadata: Metadata = {
  title: "MODELVAULT — Software development. Orchestrated.",
  description:
    "One environment to coordinate coding agents, automate engineering workflows, verify generated code, and govern AI resources.",
}

export const viewport: Viewport = {
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
