import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "MODELVAULT — AI Subscription Command Center",
  description:
    "Track, manage, and optimize all your AI subscriptions and API usage in one premium dashboard.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#09090b] text-[#fafafa]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
