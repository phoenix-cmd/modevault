"use client"

/* eslint-disable react-hooks/set-state-in-effect -- header UI syncs with browser theme, storage and focus */

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Bell,
  Check,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { RawSubscription } from "@/lib/types"

const PAGE_META: Record<string, { section: string; title: string }> = {
  "/overview": { section: "Overview", title: "Dashboard" },
  "/subscriptions": { section: "Overview", title: "Subscriptions" },
  "/api-usage": { section: "Overview", title: "API Usage" },
  "/analytics": { section: "Overview", title: "Analytics" },
  "/billing": { section: "Management", title: "Billing" },
  "/calendar": { section: "Management", title: "Renewal Calendar" },
  "/integrations": { section: "Management", title: "Integrations" },
  "/settings": { section: "Preferences", title: "Settings" },
}

const SEARCH_PAGES = [
  { label: "Dashboard", hint: "Overview", href: "/overview" },
  { label: "Subscriptions", hint: "Overview", href: "/subscriptions" },
  { label: "API Usage", hint: "Overview", href: "/api-usage" },
  { label: "Analytics", hint: "Overview", href: "/analytics" },
  { label: "Billing", hint: "Management", href: "/billing" },
  { label: "Renewal Calendar", hint: "Management", href: "/calendar" },
  { label: "Integrations", hint: "Management", href: "/integrations" },
  { label: "Settings", hint: "Preferences", href: "/settings" },
]

interface NotificationItem {
  id: string
  title: string
  message: string
  severity: "info" | "warning" | "critical"
  isRead: boolean
  createdAt: string
}

interface SearchResult {
  key: string
  label: string
  hint: string
  href: string
  kind: "page" | "subscription"
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  })
}

export function Header({ onMenuOpen }: { onMenuOpen: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const meta = PAGE_META[pathname] || { section: "Workspace", title: "Dashboard" }

  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [subscriptions, setSubscriptions] = useState<
    Array<{ id: string; providerName: string; planName: string }>
  >([])
  const [subscriptionsLoaded, setSubscriptionsLoaded] = useState(false)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (json?.data?.notifications) {
          setNotifications(json.data.notifications)
          setUnreadCount(json.data.unreadCount ?? 0)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setSearchOpen((open) => !open)
      }
      if (event.key === "Escape") {
        setSearchOpen(false)
        setNotificationsOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!searchOpen) {
      setQuery("")
      setActiveIndex(0)
      return
    }
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 20)
    return () => window.clearTimeout(timer)
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen || subscriptionsLoaded) return
    setSubscriptionsLoaded(true)
    fetch("/api/subscriptions")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          setSubscriptions(
            json.data.map((s: RawSubscription) => ({
              id: s.id,
              providerName: s.provider?.name || "Provider",
              planName: s.customPlanName || s.plan?.name || "Plan",
            }))
          )
        }
      })
      .catch(() => {})
  }, [searchOpen, subscriptionsLoaded])

  const results: SearchResult[] = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const pages = SEARCH_PAGES.filter(
      (page) =>
        !normalized ||
        page.label.toLowerCase().includes(normalized) ||
        page.hint.toLowerCase().includes(normalized)
    ).map((page) => ({
      key: `page-${page.href}`,
      label: page.label,
      hint: page.hint,
      href: page.href,
      kind: "page" as const,
    }))

    const subs = subscriptions
      .filter(
        (sub) =>
          !normalized ||
          sub.providerName.toLowerCase().includes(normalized) ||
          sub.planName.toLowerCase().includes(normalized)
      )
      .slice(0, normalized ? 5 : 3)
      .map((sub) => ({
        key: `sub-${sub.id}`,
        label: sub.providerName,
        hint: sub.planName,
        href: "/subscriptions",
        kind: "subscription" as const,
      }))

    return [...pages, ...subs]
  }, [query, subscriptions])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("mv-theme", next ? "dark" : "light")
    } catch {
      /* storage can be unavailable */
    }
  }

  function goTo(result: SearchResult) {
    setSearchOpen(false)
    router.push(result.href)
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    }
    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault()
      goTo(results[activeIndex])
    }
  }

  async function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })))
    setUnreadCount(0)
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" })
    } catch {
      /* optimistic update is safe to keep */
    }
  }

  const palette = mounted
    ? createPortal(
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              key="command-palette"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[80] flex items-start justify-center bg-black/25 px-4 pt-[12vh] backdrop-blur-[2px] dark:bg-black/55"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSearchOpen(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel w-full max-w-[560px] overflow-hidden rounded-xl"
                role="dialog"
                aria-modal="true"
                aria-label="Search MODELVAULT"
              >
                <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                  <Search className="h-4 w-4 text-ink-3" strokeWidth={1.8} />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search pages, providers, and plans…"
                    className="h-5 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-3"
                  />
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="rounded border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-3 hover:text-ink-2"
                  >
                    ESC
                  </button>
                </div>

                <div className="max-h-[52vh] overflow-y-auto p-1.5">
                  {results.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[13px] text-ink-3">
                      No results for “{query}”.
                    </p>
                  ) : (
                    <>
                      <p className="px-2.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                        Navigate
                      </p>
                      {results.map((result, index) => (
                        <button
                          key={result.key}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => goTo(result)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                            index === activeIndex
                              ? "bg-accent-soft text-accent"
                              : "text-ink-2 hover:bg-surface-2"
                          )}
                        >
                          {result.kind === "page" ? (
                            <LayoutDashboard
                              className="h-4 w-4 shrink-0 text-ink-3"
                              strokeWidth={1.8}
                            />
                          ) : (
                            <CreditCard
                              className="h-4 w-4 shrink-0 text-ink-3"
                              strokeWidth={1.8}
                            />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">
                              {result.label}
                            </span>
                            <span className="block truncate text-[11.5px] text-ink-3">
                              {result.hint}
                            </span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[10.5px] text-ink-3">
                  <span>Navigate with ↑ ↓ · Enter to open</span>
                  <span className="font-medium">MODELVAULT Search</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-[8px] sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuOpen}
          className="icon-btn -ml-1 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
          <span className="hidden text-[12px] text-ink-3 sm:inline">Workspace</span>
          <ChevronRight
            className="hidden h-3 w-3 text-ink-3/70 sm:block"
            strokeWidth={2}
          />
          <span className="truncate text-[12.5px] font-medium text-ink-2">
            {meta.section}
          </span>
          <ChevronRight className="h-3 w-3 shrink-0 text-ink-3/70" strokeWidth={2} />
          <span className="truncate text-[12.5px] font-medium text-ink">
            {meta.title}
          </span>
        </nav>
      </div>

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden h-8 w-[230px] items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-left text-[12.5px] text-ink-3 transition-colors hover:border-line-strong md:flex"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="flex-1">Search</span>
          <kbd className="rounded border border-line bg-surface-2 px-1 py-0.5 font-sans text-[10px] font-medium text-ink-3">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="icon-btn md:hidden"
          aria-label="Search"
        >
          <Search className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={toggleTheme}
          className="icon-btn"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Light theme" : "Dark theme"}
        >
          {isDark ? (
            <Sun className="h-4.5 w-4.5" strokeWidth={1.8} />
          ) : (
            <Moon className="h-4.5 w-4.5" strokeWidth={1.8} />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((open) => !open)}
            className="icon-btn relative"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4.5 w-4.5" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-canvas" />
            )}
          </button>

          <AnimatePresence>
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotificationsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -3, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -3, scale: 0.99 }}
                  transition={{ duration: 0.14 }}
                  className="glass-panel absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl"
                >
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-ink">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent tnum">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
                      >
                        <Check className="h-3 w-3" strokeWidth={2} />
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[320px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[12.5px] text-ink-3">
                        You’re all caught up.
                      </p>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            "flex gap-2.5 border-b border-line px-4 py-3 last:border-b-0",
                            !item.isRead && "bg-accent-soft/40"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                              item.severity === "critical"
                                ? "bg-danger"
                                : item.severity === "warning"
                                  ? "bg-warning"
                                  : "bg-info"
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium text-ink">
                              {item.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">
                              {item.message}
                            </p>
                            <p className="mt-1 text-[10.5px] text-ink-3">
                              {timeAgo(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-line px-4 py-2">
                    <Link
                      href="/settings"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                    >
                      Notification preferences
                    </Link>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-line sm:block" />

        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-surface-2"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-2 text-[10.5px] font-semibold text-ink-2">
            AK
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-[12px] font-medium leading-tight text-ink">
              Alex Kumar
            </span>
            <span className="block text-[10.5px] leading-tight text-ink-3">
              alex@example.com
            </span>
          </span>
          <Settings
            className="hidden h-3.5 w-3.5 text-ink-3 sm:block"
            strokeWidth={1.8}
          />
        </Link>
      </div>

      {palette}
    </header>
  )
}
