"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  Code2,
  Cpu,
  CreditCard,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Plug,
  Plus,
  Receipt,
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
      { href: "/agents", label: "Agent Center", icon: Bot },
      { href: "/workflows", label: "Workflow Builder", icon: Workflow },
      { href: "/studio", label: "Code & Preview", icon: Code2 },
      { href: "/git", label: "Git Control", icon: GitBranch },
    ],
  },
  {
    label: "AI Intelligence",
    items: [
      { href: "/models", label: "Model Library", icon: Cpu },
      { href: "/api-usage", label: "Usage & Limits", icon: Activity },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/subscriptions", label: "Subscriptions & Billing", icon: CreditCard },
    ],
  },
  {
    label: "Management",
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
    <div className="flex items-center justify-between w-full">
      <Link href="/overview" className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-charcoal text-[#FDFDFD] shadow-sm">
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
        <div className="flex items-baseline gap-1">
          <span className="text-[13px] font-bold tracking-[0.08em] text-ink">
            MODEL<span className="text-accent">VAULT</span>
          </span>
          <span className="text-[9px] font-mono font-semibold uppercase px-1 py-0.2 rounded bg-surface-2 text-ink-2 border border-line">
            Command
          </span>
        </div>
      </Link>
    </div>
  )
}

function OrgWorkspaceSwitcher() {
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
    <div className="px-3 pt-3 pb-2">
      <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-2.5 py-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.03)] hover:border-line-strong transition-colors cursor-pointer">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-4 w-4 rounded-[4px] bg-charcoal text-[9px] font-bold text-white flex items-center justify-center shrink-0">
            {orgName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-ink truncate leading-tight">
              {orgName}
            </p>
            <p className="text-[10px] text-ink-2 truncate leading-none">
              {workspaceName}
            </p>
          </div>
        </div>
        <ChevronDown className="h-3 w-3 text-ink-3 shrink-0" />
      </div>
    </div>
  )
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <Brand />
      </div>

      <OrgWorkspaceSwitcher />

      {/* Quick Action: New Execution */}
      <div className="px-3 pb-2">
        <Link
          href="/agents"
          onClick={onNavigate}
          className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-charcoal text-[12px] font-medium text-[#FDFDFD] shadow-sm hover:bg-[#202020] active:scale-[0.98] transition-all"
        >
          <Plus className="h-3.5 w-3.5 text-accent" />
          <span>New Execution</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 pt-1 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-3 mb-1">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/overview" && pathname.startsWith(`${item.href}/`))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[12.5px] transition-colors duration-150",
                        isActive
                          ? "bg-[rgba(213,34,45,0.06)] font-semibold text-ink"
                          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[15px] w-[15px] shrink-0 transition-colors",
                          isActive ? "text-accent" : "text-ink-3 group-hover:text-secondary-grey"
                        )}
                        strokeWidth={isActive ? 2.1 : 1.7}
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
              className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-xs lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface shadow-2xl lg:hidden"
            >
              <div className="absolute right-3 top-3.5 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
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
