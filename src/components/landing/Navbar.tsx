"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "#introducing", label: "Product" },
  { href: "#orchestration", label: "Agents" },
  { href: "#workflows", label: "Workflows" },
  { href: "#verification", label: "Security" },
  { href: "#integrations", label: "Integrations" },
  { href: "#faq", label: "Documentation" },
]

export function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={dark ? "text-[#0e1414]" : "text-[var(--rig-paper)]"}
      >
        <path
          d="M3 4h11v4H7v12H3V4Zm7 7h11v9h-4v-5h-7v-4Z"
          fill="currentColor"
        />
        <rect
          x="17"
          y="4"
          width="4"
          height="4"
          fill={dark ? "#0e1414" : "var(--rig-blue)"}
        />
      </svg>
      <span
        className={`rig-display text-[17px] font-bold tracking-[-0.03em] ${
          dark ? "text-[#0e1414]" : "text-[var(--rig-paper)]"
        }`}
      >
        MODELVAULT
      </span>
    </span>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 420)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [mobileOpen])

  return (
    <header
      role="banner"
      className={
        scrolled
          ? "fixed inset-x-0 top-0 z-50 border-b border-[var(--rig-paper-18)] bg-[#101514]/95 backdrop-blur-sm transition-colors duration-200"
          : "relative z-30 border-b border-black/15"
      }
    >
      <nav
        aria-label="Main navigation"
        className="rig-container flex h-[68px] items-center justify-between gap-4"
      >
        <Link href="/" aria-label="MODELVAULT Home" className="shrink-0 focus-visible:outline-2">
          <BrandMark dark={!scrolled} />
        </Link>

        {/* Desktop Links */}
        <div
          className={`hidden items-center gap-6 lg:flex ${
            scrolled ? "text-[var(--rig-paper)]" : "text-[#0d1313]"
          }`}
        >
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium tracking-[-0.01em] opacity-85 transition-opacity hover:underline hover:underline-offset-4 hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/login"
            className={`rig-mono text-[12px] font-medium uppercase tracking-[0.06em] transition-opacity hover:underline hover:underline-offset-4 ${
              scrolled ? "text-[var(--rig-paper)]" : "text-[#0d1313]"
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className={`rig-btn-chamfer ${
              scrolled ? "rig-btn-blue" : "rig-btn-dark"
            } !py-2.5 !px-4 !text-[11px]`}
          >
            Get started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className={`inline-flex h-11 w-11 items-center justify-center border lg:hidden ${
            scrolled
              ? "border-[var(--rig-paper-20)] text-[var(--rig-paper)]"
              : "border-black/25 text-[#0d1313]"
          }`}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="max-h-[calc(100dvh-68px)] overflow-y-auto border-t border-[var(--rig-paper-18)] bg-[#101514] px-5 py-5 text-[var(--rig-paper)] lg:hidden">
          <div className="flex flex-col space-y-1">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center border-b border-[var(--rig-paper-12)] py-2 text-sm font-medium text-[var(--rig-paper-75)] hover:text-[var(--rig-paper)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="rig-btn-outline w-full text-center"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="rig-btn-chamfer rig-btn-blue w-full"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
