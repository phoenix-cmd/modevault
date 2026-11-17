"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Bell, Moon, Sun, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
  "/overview": "Overview",
  "/subscriptions": "My Subscriptions",
  "/api-usage": "API Usage",
  "/analytics": "Analytics",
  "/billing": "Billing & Expenses",
  "/calendar": "Renewal Calendar",
  "/integrations": "Integrations",
  "/settings": "Settings",
}

interface HeaderProps {
  onMobileMenuToggle?: () => void
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const pathname = usePathname()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const title = pageTitles[pathname] || "Dashboard"

  const notifications = [
    { id: "1", title: "OpenAI quota at 85%", time: "2 min ago", read: false },
    { id: "2", title: "Claude Pro renewal in 3 days", time: "1 hr ago", read: false },
    { id: "3", title: "API sync completed", time: "3 hrs ago", read: true },
  ]

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/[0.06] bg-[#09090b]/80 px-4 backdrop-blur-xl md:px-6">
      {/* Left: Mobile menu + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <motion.h1
          key={pathname}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-semibold text-zinc-100"
        >
          {title}
        </motion.h1>
      </div>

      {/* Center: Search bar */}
      <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search subscriptions, providers..."
            className="glass h-9 w-full rounded-lg pl-9 pr-4 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-colors focus:border-violet-500/30"
          />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search icon (mobile) */}
        <button className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 md:hidden">
          <Search className="h-5 w-5" />
        </button>

        {/* Theme toggle placeholder */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
          aria-label="Toggle theme"
        >
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-violet-500" />
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl glass-elevated shadow-2xl"
              >
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Notifications
                  </h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 border-b border-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.02]",
                        !n.read && "bg-violet-500/[0.03]"
                      )}
                    >
                      {!n.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                      )}
                      <div className={cn("min-w-0 flex-1", n.read && "ml-5")}>
                        <p className="text-sm text-zinc-300">{n.title}</p>
                        <p className="text-xs text-zinc-600">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] px-4 py-2.5">
                  <button className="text-xs font-medium text-violet-400 hover:text-violet-300">
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
