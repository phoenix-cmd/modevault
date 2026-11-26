"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mv-sidebar-collapsed")
      if (saved === "1") {
        queueMicrotask(() => setCollapsed(true))
      } else if (
        saved === null &&
        window.matchMedia("(min-width: 1024px) and (max-width: 1279px)").matches
      ) {
        queueMicrotask(() => setCollapsed(true))
      }
    } catch {
      /* ignore */
    }
  }, [])

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v
      try {
        localStorage.setItem("mv-sidebar-collapsed", next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div data-app="vault" className="min-h-screen overflow-x-clip bg-canvas text-ink">
      <Sidebar
        mobileOpen={mobileOpen}
        collapsed={collapsed}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={toggleCollapsed}
      />

      <div
        className={[
          "flex min-h-screen min-w-0 flex-col transition-[padding-left] duration-200 ease-out",
          collapsed ? "lg:pl-[4.25rem]" : "lg:pl-60",
        ].join(" ")}
      >
        <Header
          onMenuOpen={() => setMobileOpen(true)}
          sidebarCollapsed={collapsed}
          onToggleSidebar={toggleCollapsed}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] min-w-0 flex-1 px-4 pb-16 pt-5 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
