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
  Command,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Sun,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { clearSessionScopedStorage } from "@/lib/client-session-state"
import type { RawSubscription } from "@/lib/types"

const PAGE_META: Record<string, { section: string; title: string }> = {
  "/overview": { section: "Workspace", title: "Overview" },
  "/projects": { section: "Workspace", title: "Projects" },
  "/agents": { section: "Workspace", title: "Agent Center" },
  "/workflows": { section: "Workspace", title: "Workflow Builder" },
  "/studio": { section: "Workspace", title: "Development Studio" },
  "/git": { section: "Workspace", title: "Git Control" },
  "/verify": { section: "Workspace", title: "Verification Center" },
  "/models": { section: "Intelligence", title: "Model Library" },
  "/api-usage": { section: "Intelligence", title: "Usage & Limits" },
  "/analytics": { section: "Intelligence", title: "Analytics" },
  "/subscriptions": { section: "Intelligence", title: "Subscriptions & Billing" },
  "/billing": { section: "Intelligence", title: "Billing Ledger" },
  "/calendar": { section: "Intelligence", title: "Renewals" },
  "/integrations": { section: "Management", title: "Integrations" },
  "/organizations": { section: "Management", title: "Organizations" },
  "/permissions": { section: "Management", title: "Permissions" },
  "/notifications": { section: "Management", title: "Notifications" },
  "/settings": { section: "Management", title: "Settings" },
}

const SEARCH_PAGES = [
  { label: "Overview", hint: "Workspace", href: "/overview" },
  { label: "Projects", hint: "Workspace", href: "/projects" },
  { label: "Agent Center", hint: "Workspace", href: "/agents" },
  { label: "Workflow Builder", hint: "Workspace", href: "/workflows" },
  { label: "Development Studio", hint: "Workspace", href: "/studio" },
  { label: "Git Control", hint: "Workspace", href: "/git" },
  { label: "Verification Center", hint: "Workspace", href: "/verify" },
  { label: "Model Library", hint: "Intelligence", href: "/models" },
  { label: "Usage & Limits", hint: "Intelligence", href: "/api-usage" },
  { label: "Analytics", hint: "Intelligence", href: "/analytics" },
  { label: "Subscriptions & Billing", hint: "Intelligence", href: "/subscriptions" },
  { label: "Billing Ledger", hint: "Intelligence", href: "/billing" },
  { label: "Renewals", hint: "Intelligence", href: "/calendar" },
  { label: "Integrations", hint: "Management", href: "/integrations" },
  { label: "Organizations", hint: "Management", href: "/organizations" },
  { label: "Permissions", hint: "Management", href: "/permissions" },
  { label: "Notifications", hint: "Management", href: "/notifications" },
  { label: "Settings", hint: "Management", href: "/settings" },
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

export function Header({
  onMenuOpen,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  onMenuOpen: () => void
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()

  const meta = PAGE_META[pathname] || { section: "Workspace", title: "Dashboard" }

  const [isLight, setIsLight] = useState(false)
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable")
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
  const [userInitials, setUserInitials] = useState("MV")
  const [userLabel, setUserLabel] = useState("User profile")

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    setIsLight(document.documentElement.classList.contains("light"))
    setDensity(
      document.documentElement.getAttribute("data-density") === "compact"
        ? "compact"
        : "comfortable"
    )
  }, [])

  useEffect(() => {
    document.title = `${meta.title} | MODELVAULT`
  }, [meta.title])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch("/api/notifications").then((res) => res.json()).catch(() => null),
      fetch("/api/auth/me").then((res) => (res.ok ? res.json() : null)).catch(() => null),
    ]).then(([notifJson, meJson]) => {
      if (cancelled) return
      if (notifJson?.data?.notifications) {
        setNotifications(notifJson.data.notifications)
        setUnreadCount(notifJson.data.unreadCount ?? 0)
      }
      if (meJson?.data) {
        const name = (meJson.data.name as string | undefined) || ""
        const email = (meJson.data.email as string | undefined) || ""
        const parts = (name || email).trim().split(/[\s@._-]+/).filter(Boolean)
        const initials =
          parts.length >= 2
            ? `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
            : (name || email).slice(0, 2).toUpperCase() || "MV"
        setUserInitials(initials)
        setUserLabel(name || email || "User profile")
      }
    })
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
    const nextLight = !isLight
    setIsLight(nextLight)
    document.documentElement.classList.toggle("light", nextLight)
    try {
      localStorage.setItem("mv-theme", nextLight ? "light" : "dark")
    } catch {
      /* storage unavailable */
    }
  }

  function toggleDensity() {
    const next = density === "compact" ? "comfortable" : "compact"
    setDensity(next)
    if (next === "compact") {
      document.documentElement.setAttribute("data-density", "compact")
    } else {
      document.documentElement.removeAttribute("data-density")
    }
    try {
      localStorage.setItem("mv-density", next)
    } catch {
      /* storage unavailable */
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
      /* optimistic update safe */
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
              className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-3 pt-[6vh] backdrop-blur-[2px] sm:px-4 sm:pt-[12vh]"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setSearchOpen(false)
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.99 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="glass-panel w-full max-w-[560px] overflow-hidden rounded-[2px] shadow-float"
                role="dialog"
                aria-modal="true"
                aria-label="Search MODELVAULT"
              >
                <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3 sm:px-4">
                  <Search className="h-4 w-4 text-ink-3" strokeWidth={1.8} />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search pages, providers, and plans…"
                    className="h-6 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3 sm:h-5 sm:text-[13.5px]"
                  />
                  <kbd className="rounded-[2px] border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ink-3">
                    ESC
                  </kbd>
                </div>

                <div className="max-h-[60dvh] overflow-y-auto p-1.5 sm:max-h-[52vh]">
                  {results.length === 0 ? (
                    <p className="px-3 py-8 text-center text-[13px] text-ink-3">
                      No results for “{query}”.
                    </p>
                  ) : (
                    <>
                      <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">
                        Navigate
                      </p>
                      {results.map((result, index) => (
                        <button
                          key={result.key}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => goTo(result)}
                          className={cn(
                            "flex min-h-[44px] w-full items-center gap-3 rounded-[2px] px-2.5 py-2.5 text-left transition-colors",
                            index === activeIndex
                              ? "bg-accent-soft text-accent"
                              : "text-ink-2 hover:bg-surface-2"
                          )}
                        >
                          {result.kind === "page" ? (
                            <LayoutDashboard className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                          ) : (
                            <CreditCard className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.6} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-ink">
                              {result.label}
                            </span>
                            <span className="block truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-ink-3">
                              {result.hint}
                            </span>
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                  <span>↑ ↓ navigate · Enter open</span>
                  <span className="inline-flex items-center gap-1">
                    <Command className="h-3 w-3" />K
                  </span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-canvas/95 px-3 backdrop-blur-sm sm:gap-3 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
        <button
          onClick={onMenuOpen}
          className="icon-btn -ml-1 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" strokeWidth={1.8} />
        </button>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="icon-btn -ml-1 hidden lg:inline-flex"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
        )}

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3 sm:inline">
            {meta.section}
          </span>
          <ChevronRight className="hidden h-3 w-3 text-ink-3/50 sm:inline" strokeWidth={1.8} />
          <span className="truncate font-display text-[14px] font-semibold tracking-[-0.02em] text-ink sm:text-[15px]">
            {meta.title}
          </span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden h-8 w-[200px] items-center gap-2 rounded-[2px] border border-line bg-surface px-2.5 text-left text-[12px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 md:flex lg:w-[240px] xl:w-[260px]"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="flex-1">Search</span>
          <kbd className="rounded-[2px] border border-line bg-surface-2 px-1 py-0.5 font-mono text-[9.5px] font-medium text-ink-3">
            ⌘K
          </kbd>
        </button>

        <button
          onClick={() => setSearchOpen(true)}
          className="icon-btn md:hidden"
          aria-label="Search"
          title="Search (⌘K)"
        >
          <Search className="h-4 w-4" strokeWidth={1.8} />
        </button>

        <Link
          href="/agents"
          className="btn-primary btn-sm hidden sm:inline-flex"
          title="Dispatch agent"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>New run</span>
        </Link>
        <Link
          href="/agents"
          className="icon-btn sm:hidden"
          aria-label="Dispatch agent"
          title="New run"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </Link>

        <button
          type="button"
          onClick={toggleDensity}
          aria-pressed={density === "compact"}
          className="hidden h-8 items-center rounded-[2px] border border-line bg-surface px-2 font-mono text-[11px] uppercase tracking-[0.04em] text-ink-2 transition-colors hover:border-line-strong hover:text-ink xl:inline-flex"
          title={density === "compact" ? "Switch to comfortable spacing" : "Switch to compact density"}
          aria-label={density === "compact" ? "Compact density enabled — switch to comfortable" : "Comfortable density enabled — switch to compact"}
        >
          {density === "compact" ? "Compact" : "Comfort"}
        </button>

        <button
          onClick={toggleTheme}
          className="icon-btn"
          aria-label={isLight ? "Switch to dark charcoal theme" : "Switch to archival paper light theme"}
          title={isLight ? "Dark charcoal theme" : "Paper light theme"}
        >
          {isLight ? (
            <Moon className="h-4 w-4" strokeWidth={1.8} />
          ) : (
            <Sun className="h-4 w-4" strokeWidth={1.8} />
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setNotificationsOpen((open) => !open)}
            className="icon-btn relative"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            aria-controls="header-notifications-panel"
          >
            <Bell className="h-4 w-4" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 bg-accent ring-2 ring-canvas" />
            )}
          </button>

          <div id="header-notifications-panel">
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
                  className="glass-panel fixed inset-x-3 top-16 z-50 overflow-hidden rounded-[2px] shadow-float sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[340px]"
                >
                  <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-medium text-ink">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="rounded-[2px] bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent tnum">
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
                              "mt-1.5 h-1.5 w-1.5 shrink-0",
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
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.04em] text-ink-3">
                              {timeAgo(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-line px-4 py-2">
                    <Link
                      href="/notifications"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11.5px] font-medium text-ink-2 transition-colors hover:text-ink"
                    >
                      Open notifications
                    </Link>
                  </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="mx-0.5 hidden h-5 w-px bg-line sm:block" />

        <Link
          href="/settings"
          className="hidden h-8 w-8 items-center justify-center rounded-[2px] border border-line bg-surface font-mono text-[11px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink sm:flex"
          aria-label={`${userInitials} — ${userLabel}`}
          title={`${userInitials} — ${userLabel}`}
        >
          {userInitials}
        </Link>
        <button
          type="button"
          onClick={async () => {
            clearSessionScopedStorage()
            await fetch("/api/auth/logout", { method: "POST" })
            window.location.href = "/login"
          }}
          className="icon-btn hidden sm:inline-flex"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.8} />
        </button>
      </div>

      {palette}
    </header>
  )
}
