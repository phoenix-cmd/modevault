import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import "./globals.css"

// Self-hosted Inter (variable, latin) so the build never depends on
// fonts.googleapis.com being reachable.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "MODELVAULT — AI Subscription Command Center",
  description:
    "Track, manage, and optimize all your AI subscriptions and API usage in one precise command center.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
}

const themeScript = `(function(){try{var t=localStorage.getItem("mv-theme");if(t==="dark"){document.documentElement.classList.add("dark")}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
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
