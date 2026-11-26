"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Code2,
  Cpu,
  CreditCard,
  FileCheck2,
  FolderGit2,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Plug,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle2,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { clearSessionScopedStorage } from "@/lib/client-session-state"

const navSections: Array<{
  label: string
  code: string
  items: Array<{ href: string; label: string; icon: LucideIcon }>
}> = [
  {
    label: "Workspace",
    code: "01",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderGit2 },
      { href: "/agents", label: "Agent Center", icon: Bot },
      { href: "/workflows", label: "Workflow Builder", icon: Workflow },
      { href: "/studio", label: "Development Studio", icon: Code2 },
      { href: "/git", label: "Git Control", icon: GitBranch },
      { href: "/verify", label: "Verification Center", icon: FileCheck2 },
    ],
  },
  {
    label: "Intelligence",
    code: "02",
    items: [
      { href: "/models", label: "Model Library", icon: Cpu },
      { href: "/api-usage", label: "Usage & Limits", icon: Activity },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/subscriptions", label: "Subscriptions & Billing", icon: CreditCard },
      { href: "/billing", label: "Billing Ledger", icon: Receipt },
      { href: "/calendar", label: "Renewals", icon: CalendarClock },
    ],
  },
  {
    label: "Management",
    code: "03",
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border border-line-strong bg-surface">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 4h11v4H7v12H3V4Zm7 7h11v9h-4v-5h-7v-4Z" fill="currentColor" className="text-ink" />
          <rect x="17" y="4" width="4" height="4" className="fill-accent" />
        </svg>
      </span>
      {!collapsed && (
        <span className="font-display text-[14px] font-bold tracking-[-0.02em] text-ink">
          MODELVAULT
        </span>
      )}
    </Link>
  )
}

function computeInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "MV").trim()
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase()
  }
  return source.slice(0, 2).toUpperCase() || "MV"
}

interface SidebarOrg {
  id: string
  name: string
  workspaces: Array<{ id: string; name: string }>
}

function useWorkspaceIdentity() {
  const [orgs, setOrgs] = useState<SidebarOrg[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [selectedWsId, setSelectedWsId] = useState("")
  const [userProfile, setUserProfile] = useState<{ name?: string | null; email?: string | null } | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch("/api/organizations").then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([orgJson, meJson]) => {
      if (!active) return
      if (meJson?.data) setUserProfile(meJson.data)
      const list = Array.isArray(orgJson?.data) ? (orgJson.data as SidebarOrg[]) : []
      setOrgs(list)
      if (list.length > 0) {
        let savedOrg = ""
        let savedWs = ""
        try {
          savedOrg = localStorage.getItem("mv-active-org") || ""
          savedWs = localStorage.getItem("mv-active-workspace") || ""
        } catch {}
        const org = list.find((o) => o.id === savedOrg) || list[0]
        setSelectedOrgId(org.id)
        const ws = org.workspaces?.find((w) => w.id === savedWs) || org.workspaces?.[0]
        if (ws) setSelectedWsId(ws.id)
        try {
          localStorage.setItem("mv-active-org", org.id)
          if (ws) localStorage.setItem("mv-active-workspace", ws.id)
        } catch {}
      }
    })
    return () => {
      active = false
    }
  }, [])

  const activeOrg = orgs.find((o) => o.id === selectedOrgId) || orgs[0]
  const workspaces = activeOrg?.workspaces || []
  const activeWs = workspaces.find((w) => w.id === selectedWsId) || workspaces[0]

  const selectOrg = (orgId: string) => {
    setSelectedOrgId(orgId)
    const org = orgs.find((o) => o.id === orgId)
    const firstWs = org?.workspaces?.[0]?.id || ""
    setSelectedWsId(firstWs)
    try {
      localStorage.setItem("mv-active-org", orgId)
      if (firstWs) localStorage.setItem("mv-active-workspace", firstWs)
      else localStorage.removeItem("mv-active-workspace")
      localStorage.removeItem("mv-active-project")
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mv-workspace-change", { detail: { orgId, workspaceId: firstWs } })
      )
    }
  }

  const selectWorkspace = (wsId: string) => {
    setSelectedWsId(wsId)
    try {
      localStorage.setItem("mv-active-workspace", wsId)
      localStorage.removeItem("mv-active-project")
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("mv-workspace-change", {
          detail: { orgId: activeOrg?.id || "", workspaceId: wsId },
        })
      )
    }
  }

  return {
    orgs,
    activeOrg,
    workspaces,
    activeWs,
    selectOrg,
    selectWorkspace,
    userProfile,
    initials: computeInitials(userProfile?.name, userProfile?.email),
  }
}

function WorkspaceControls({
  collapsed,
  identity,
}: {
  collapsed?: boolean
  identity: ReturnType<typeof useWorkspaceIdentity>
}) {
  const { orgs, activeOrg, workspaces, activeWs, selectOrg, selectWorkspace } = identity
  const orgName = activeOrg?.name || "Organization"
  const workspaceName = activeWs?.name || "Workspace"

  if (collapsed) {
    return (
      <div className="flex justify-center border-b border-line px-2 py-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[2px] border border-line bg-surface text-ink-2"
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
        <label htmlFor="sidebar-org-select" className="block px-1 pb-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
          Organisation
        </label>
        <div className="relative">
          <select
            id="sidebar-org-select"
            value={activeOrg?.id || ""}
            onChange={(e) => selectOrg(e.target.value)}
            disabled={orgs.length === 0}
            className="h-8 w-full appearance-none rounded-[2px] border border-line bg-surface pl-2.5 pr-7 text-[12px] font-medium text-ink outline-none focus:border-accent"
          >
            {orgs.length === 0 ? (
              <option value="">{orgName}</option>
            ) : (
              orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
        </div>
      </div>
      <div>
        <label htmlFor="sidebar-ws-select" className="block px-1 pb-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
          Workspace
        </label>
        <div className="relative">
          <select
            id="sidebar-ws-select"
            value={activeWs?.id || ""}
            onChange={(e) => selectWorkspace(e.target.value)}
            disabled={workspaces.length === 0}
            className="h-8 w-full appearance-none rounded-[2px] border border-line bg-surface pl-2.5 pr-7 font-mono text-[11px] text-ink-2 outline-none focus:border-accent"
          >
            {workspaces.length === 0 ? (
              <option value="">{workspaceName}</option>
            ) : (
              workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  )
}

function NavContent({
  collapsed,
  isMobileDrawer,
  onNavigate,
}: {
  collapsed?: boolean
  isMobileDrawer?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const identity = useWorkspaceIdentity()

  async function handleSignOut() {
    onNavigate?.()
    clearSessionScopedStorage()
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.href = "/login"
  }

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-line",
          collapsed ? "justify-center px-2" : isMobileDrawer ? "pl-4 pr-14" : "px-4"
        )}
      >
        <Brand collapsed={collapsed} />
      </div>

      <WorkspaceControls collapsed={collapsed} identity={identity} />

      <nav className={cn("flex-1 overflow-y-auto pb-4", collapsed ? "px-1.5 pt-2" : "px-2")}>
        {navSections.map((section) => (
          <div key={section.label} className={cn(collapsed ? "mt-2" : "")}>
            {!collapsed ? (
              <p className="nav-section-label">
                <span className="text-accent">{section.code}</span>{" // "}{section.label}
              </p>
            ) : (
              <div className="my-2 border-t border-line/70" aria-hidden />
            )}
            <ul className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
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
                        "group relative flex items-center rounded-[2px] transition-colors duration-150",
                        collapsed
                          ? "h-9 justify-center px-0"
                          : isMobileDrawer
                            ? "min-h-[44px] gap-3 px-3 py-2"
                            : "h-8 gap-2.5 px-3",
                        isActive
                          ? "bg-accent-soft text-accent"
                          : "text-ink-2 hover:bg-surface-2/70 hover:text-ink"
                      )}
                    >
                      {isActive && (
                        <span
                          className={cn(
                            "absolute bg-accent",
                            collapsed ? "left-0 top-1.5 bottom-1.5 w-[2px]" : "inset-y-1 left-0 w-[2px]"
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
                        <span
                          className={cn(
                            "truncate",
                            isMobileDrawer ? "text-[13.5px]" : "text-[12.5px]",
                            isActive ? "font-medium text-ink" : "font-normal"
                          )}
                        >
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
            "group flex items-center rounded-[2px] text-ink-2 transition-colors hover:bg-surface-2/70 hover:text-ink",
            collapsed ? "h-9 justify-center" : isMobileDrawer ? "min-h-[44px] gap-2.5 px-2.5" : "h-9 gap-2.5 px-2.5"
          )}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface font-mono text-[9px] font-medium text-ink-2">
            {identity.initials}
          </span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium text-ink">
                {identity.userProfile?.name || "Profile"}
              </span>
              <span className="block truncate font-mono text-[10px] text-ink-3">
                {identity.userProfile?.email || "Account & defaults"}
              </span>
            </span>
          )}
        </Link>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex min-h-[44px] w-full items-center gap-2.5 rounded-[2px] px-2.5 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2/70 hover:text-ink"
          >
            <LogOut className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.6} />
            <span>Sign out</span>
          </button>
        )}
        {!collapsed ? (
          <p className="flex items-center gap-2 px-2.5 pt-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-3">
            <span className="inline-block h-1.5 w-1.5 bg-accent" aria-hidden />
            System ready · Local
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
  useEffect(() => {
    if (!mobileOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [mobileOpen, onClose])

  return (
    <>
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
            className="absolute -right-3 top-[4.5rem] z-10 flex h-6 w-6 items-center justify-center rounded-[2px] border border-line-strong bg-surface text-ink-3 transition-colors hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] lg:hidden"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,86vw)] flex-col border-r border-line bg-sidebar lg:hidden"
              aria-label="Mobile navigation drawer"
            >
              <div className="absolute right-2.5 top-2 z-10">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-[2px] border border-line text-ink-2 hover:bg-surface-2 hover:text-ink"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavContent isMobileDrawer onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
