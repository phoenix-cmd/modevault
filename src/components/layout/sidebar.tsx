"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/api-usage", label: "API Usage", icon: Activity },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/calendar", label: "Renewal Calendar", icon: CalendarDays },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Preferences",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

function Brand() {
  return (
    <Link href="/overview" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-ink text-canvas">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.75 14 4.5 8 7.25 2 4.5 8 1.75Z"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M2 8 8 10.75 14 8"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 11.5 8 14.25 14 11.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[13px] font-semibold uppercase tracking-[0.11em] text-ink">
        MODEL<span className="text-ink-3">VAULT</span>
      </span>
    </Link>
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
        <Brand />
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="nav-section-label px-3">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors duration-150",
                        isActive
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[16px] w-[16px] shrink-0",
                          isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"
                        )}
                        strokeWidth={1.8}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line p-3.5">
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2/60 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-2">
            <span className="brand-dot bg-success" />
            All systems operational
          </span>
          <ShieldCheck className="h-3.5 w-3.5 text-ink-3" strokeWidth={1.8} />
        </div>
        <div className="mt-3 flex items-center justify-between px-1 text-[10.5px] text-ink-3">
          <span className="font-medium tracking-[0.04em]">MODELVAULT v1.0</span>
          <Link
            href="/settings"
            onClick={onNavigate}
            className="inline-flex items-center gap-1 transition-colors hover:text-ink-2"
          >
            <BookOpen className="h-3 w-3" strokeWidth={1.8} />
            Help
          </Link>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-line bg-surface lg:hidden"
            >
              <button
                onClick={onClose}
                className="icon-btn absolute right-2.5 top-3 z-10"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
              <NavContent onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
