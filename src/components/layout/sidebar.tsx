"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Bot,
  Code2,
  CreditCard,
  Cpu,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Plug,
  Plus,
  Settings,
  ShieldCheck,
  Workflow,
  X,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navSections = [
  {
    label: "Workspace",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderGit2 },
      { href: "/agents", label: "Agents", icon: Bot },
      { href: "/workflows", label: "Workflows", icon: Workflow },
      { href: "/studio", label: "Studio", icon: Code2 },
      { href: "/git", label: "Git", icon: GitBranch },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/models", label: "Models", icon: Cpu },
      { href: "/api-usage", label: "Usage", icon: Activity },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/organizations", label: "Organizations", icon: ShieldCheck },
      { href: "/permissions", label: "Permissions", icon: ShieldCheck },
      { href: "/notifications", label: "Notifications", icon: Zap },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

function Brand() {
  return (
    <Link href="/overview" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded bg-accent text-accent-ink">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M8 1.75 14 4.5 8 7.25 2 4.5 8 1.75Z"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M2 8 8 10.75 14 8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 11.5 8 14.25 14 11.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-[13px] font-semibold tracking-[0.16em] text-ink">
        MODELVAULT
      </span>
    </Link>
  )
}

function WorkspaceIdentity() {
  const [orgName, setOrgName] = useState("Acme Engineering")
  const [workspaceName, setWorkspaceName] = useState("Core Platform")

  useEffect(() => {
    let active = true
    fetch("/api/organizations")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const org = json?.data?.[0]
        if (org?.name) setOrgName(org.name)
        if (org?.workspaces?.[0]?.name) setWorkspaceName(org.workspaces[0].name)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="border-b border-line px-4 pb-4 pt-4">
      <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-ink-3">
        Workspace
      </p>
      <p className="mt-1.5 truncate text-[12.5px] font-medium text-ink">{orgName}</p>
      <p className="truncate font-mono text-[10.5px] text-ink-3">{workspaceName}</p>
    </div>
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
        <Brand />
      </div>

      <WorkspaceIdentity />

      <div className="px-3 pt-4">
        <Link
          href="/agents"
          onClick={onNavigate}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-accent text-[12.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span>New execution</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-5">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="nav-section-label">{section.label}</p>
            <ul>
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/overview" && pathname.startsWith(`${item.href}/`))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex h-8 items-center gap-2.5 rounded px-3 text-[12.5px] transition-colors duration-150",
                        isActive
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                      )}
                    >
                      {isActive && (
                        <span className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-accent" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[15px] w-[15px] shrink-0",
                          isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"
                        )}
                        strokeWidth={isActive ? 2 : 1.6}
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

      <div className="border-t border-line px-4 py-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
          v1.0 · Local
        </p>
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface lg:block">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface lg:hidden"
            >
              <div className="absolute right-3 top-3.5 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded border border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavContent onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
