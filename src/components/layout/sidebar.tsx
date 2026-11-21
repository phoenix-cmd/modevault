"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Code2,
  CreditCard,
  Cpu,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle2,
  Workflow,
  X,
  Bell,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navSections: Array<{
  label: string
  items: Array<{ href: string; label: string; icon: LucideIcon }>
}> = [
  {
    label: "Workspace",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderGit2 },
      { href: "/agents", label: "Agent Center", icon: Bot },
      { href: "/workflows", label: "Workflow Builder", icon: Workflow },
      { href: "/studio", label: "Development Studio", icon: Code2 },
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
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/calendar", label: "Renewals", icon: CalendarClock },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/permissions", label: "Permissions", icon: ShieldCheck },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

interface SidebarProps {
  mobileOpen: boolean
  collapsed: boolean
  onClose: () => void
  onToggleCollapse: () => void
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/overview" className="flex items-center gap-2.5" title="MODELVAULT">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-line bg-surface text-accent">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="3.5" cy="8" r="1.2" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12.5" cy="4" r="1.2" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="12.5" cy="12" r="1.2" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4.7 7.4 11.3 4.7M4.7 8.6l6.6 2.7M12.5 5.3v5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      {!collapsed && (
        <span className="font-display text-[13px] font-medium tracking-[0.12em] text-ink">
          MODELVAULT
        </span>
      )}
    </Link>
  )
}

function useWorkspaceIdentity() {
  const [orgName, setOrgName] = useState("Organization")
  const [workspaceName, setWorkspaceName] = useState("Workspace")

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

  return { orgName, workspaceName }
}

function WorkspaceControls({ collapsed }: { collapsed?: boolean }) {
  const { orgName, workspaceName } = useWorkspaceIdentity()

  if (collapsed) {
    return (
      <div className="border-b border-line px-2 py-3 flex justify-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded border border-line bg-surface text-ink-2"
          title={`${orgName} · ${workspaceName}`}
        >
          <Building2 className="h-4 w-4" strokeWidth={1.6} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 border-b border-line px-3 py-3">
      <div>
        <p className="px-1 pb-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
          Organisation
        </p>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 text-left transition-colors hover:border-line-strong"
          title="Organisation selector"
        >
          <span className="min-w-0 truncate text-[12px] font-medium text-ink">{orgName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
        </button>
      </div>
      <div>
        <p className="px-1 pb-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
          Workspace
        </p>
        <button
          type="button"
          className="flex h-8 w-full items-center justify-between gap-2 rounded border border-line bg-surface px-2.5 text-left transition-colors hover:border-line-strong"
          title="Workspace switcher"
        >
          <span className="min-w-0 truncate font-mono text-[11px] text-ink-2">{workspaceName}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}

function NavContent({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className={cn("flex h-14 shrink-0 items-center border-b border-line", collapsed ? "justify-center px-2" : "px-4")}>
        <Brand collapsed={collapsed} />
      </div>

      <WorkspaceControls collapsed={collapsed} />

      <nav className={cn("flex-1 overflow-y-auto pb-4", collapsed ? "px-1.5 pt-2" : "px-2")}>
        {navSections.map((section) => (
          <div key={section.label} className={cn(collapsed ? "mt-2" : "")}>
            {!collapsed ? (
              <p className="nav-section-label">{section.label}</p>
            ) : (
              <div className="my-2 border-t border-line/70" aria-hidden />
            )}
            <ul className={cn(collapsed ? "space-y-1" : "")}>
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
                      title={item.label}
                      className={cn(
                        "group relative flex items-center rounded transition-colors duration-150",
                        collapsed ? "h-9 justify-center px-0" : "h-8 gap-2.5 px-3",
                        isActive
                          ? "bg-accent-soft text-accent"
                          : "text-ink-2 hover:bg-surface-2/70 hover:text-ink"
                      )}
                    >
                      {isActive && (
                        <span
                          className={cn(
                            "absolute bg-accent",
                            collapsed ? "left-0 top-2 bottom-2 w-[2px] rounded-r" : "inset-y-1.5 left-0 w-[2px] rounded-full"
                          )}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "h-[15px] w-[15px] shrink-0",
                          isActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"
                        )}
                        strokeWidth={1.6}
                      />
                      {!collapsed && (
                        <span className={cn("truncate text-[12.5px]", isActive ? "font-medium" : "font-normal")}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-line", collapsed ? "px-1.5 py-2" : "px-2 py-2.5")}>
        <Link
          href="/settings"
          onClick={onNavigate}
          title="User profile"
          className={cn(
            "group flex items-center rounded text-ink-2 transition-colors hover:bg-surface-2/70 hover:text-ink",
            collapsed ? "h-9 justify-center" : "h-9 gap-2.5 px-2.5"
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-mono text-[9px] font-medium text-ink-2">
            AK
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">Profile</span>
              <span className="block truncate font-mono text-[10px] text-ink-3">Account & preferences</span>
            </span>
          )}
        </Link>
        <Link
          href="/settings"
          onClick={onNavigate}
          title="Settings"
          className={cn(
            "group mt-0.5 flex items-center rounded text-ink-2 transition-colors hover:bg-surface-2/70 hover:text-ink",
            collapsed ? "h-9 justify-center" : "h-8 gap-2.5 px-2.5"
          )}
        >
          <Settings className="h-[15px] w-[15px] shrink-0 text-ink-3 group-hover:text-ink-2" strokeWidth={1.6} />
          {!collapsed && <span className="truncate text-[12.5px]">Settings</span>}
        </Link>
        {!collapsed ? (
          <p className="px-2.5 pt-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            v1.0 · Local
          </p>
        ) : (
          <div className="flex justify-center pt-1 text-ink-3">
            <UserCircle2 className="h-3.5 w-3.5 opacity-0" aria-hidden />
          </div>
        )}
      </div>
    </div>
  )
}

export function Sidebar({ mobileOpen, collapsed, onClose, onToggleCollapse }: SidebarProps) {
  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-sidebar transition-[width] duration-200 ease-out lg:flex lg:flex-col",
          collapsed ? "w-[4.25rem]" : "w-60"
        )}
      >
        <div className="relative h-full">
          <NavContent collapsed={collapsed} />
          <button
            type="button"
            onClick={onToggleCollapse}
            className="absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-ink-3 shadow-sm transition-colors hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
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
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-line bg-sidebar lg:hidden"
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
