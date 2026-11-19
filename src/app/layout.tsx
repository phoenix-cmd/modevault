import type { Metadata, Viewport } from "next"
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "MODELVAULT — AI spend, usage, and agent operations",
  description:
    "Track AI subscriptions, API usage, workspaces, and agent runs from one operational console.",
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#08090a" },
  ],
}

// Dark is the default experience; a saved light preference opts out before paint.
const themeScript = `(function(){try{var t=localStorage.getItem("mv-theme");var dark=t!=="light";document.documentElement.classList.toggle("dark",dark)}catch(e){document.documentElement.classList.add("dark")}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
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
