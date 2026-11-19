"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowUpRight, Menu, X } from "lucide-react"

const NAV = [
  { label: "Orchestration", href: "#orchestration" },
  { label: "Workflows", href: "#workflows" },
  { label: "Studio", href: "#studio" },
  { label: "Verification", href: "#verification" },
  { label: "Intelligence", href: "#intelligence" },
  { label: "Governance", href: "#governance" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? "border-[var(--mkt-line)] bg-[color:color-mix(in_srgb,var(--mkt-bg)_92%,transparent)] backdrop-blur-sm"
          : "border-transparent bg-[var(--mkt-bg)]"
      }`}
    >
      <div className="mkt-container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-3 text-[var(--mkt-ink)]">
          <span className="inline-flex h-7 w-7 items-center justify-center border border-[var(--mkt-line-strong)] bg-[var(--mkt-paper)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="3.5" cy="8" r="1.25" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="12.5" cy="4" r="1.25" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="12.5" cy="12" r="1.25" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.7 7.4 11.3 4.7M4.7 8.6l6.6 2.7M12.5 5.3v5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="font-display text-[15px] font-medium tracking-[-0.02em]">
            Modelvault
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="mkt-link text-[13px]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Link href="/login" className="mkt-btn-secondary h-9 px-3 text-[12px]">
            Sign in
          </Link>
          <Link href="/overview" className="mkt-btn-primary h-9 px-3 text-[12px]">
            Open workspace
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center border border-[var(--mkt-line)] bg-[var(--mkt-paper)] text-[var(--mkt-ink)] sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mkt-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div id="mkt-mobile-nav" className="border-t border-[var(--mkt-line)] bg-[var(--mkt-paper)] sm:hidden">
          <div className="mkt-container flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="py-2 text-[14px] text-[var(--mkt-ink-2)]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--mkt-line)] pt-4">
              <Link href="/login" className="mkt-btn-secondary" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/overview" className="mkt-btn-primary" onClick={() => setOpen(false)}>
                Open workspace
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
