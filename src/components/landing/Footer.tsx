import Link from "next/link"
import { BrandMark } from "./Navbar"

const FOOTER_COLS = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/overview" },
      { label: "Agent Center", href: "/agents" },
      { label: "Workflow Builder", href: "/workflows" },
      { label: "Dev Studio", href: "/studio" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { label: "Architecture FAQ", href: "#faq" },
      { label: "Code Verification", href: "#verification" },
      { label: "Resource Ledger", href: "#intelligence" },
    ],
  },
  {
    title: "Integrations",
    links: [
      { label: "Supported Agents", href: "#integrations" },
      { label: "Provider Keys", href: "/integrations" },
      { label: "Model Library", href: "/models" },
    ],
  },
  {
    title: "Security",
    links: [
      { label: "Verification Center", href: "/verify" },
      { label: "Permissions", href: "/permissions" },
      { label: "Git Control", href: "/git" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Organizations", href: "/organizations" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Usage & Billing", href: "/billing" },
      { label: "Settings", href: "/settings" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative z-10 overflow-hidden bg-[#0a0a0a] pt-16 pb-20 text-[var(--rig-paper)]">
      {/* Subtle architectural watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 180 180"
        fill="none"
        className="pointer-events-none absolute -bottom-24 -right-12 hidden w-[460px] text-[var(--rig-paper)] opacity-[0.04] md:block"
      >
        <path
          d="M18 18h88v28H46v116H18V18Zm44 52h100v28H90v64H62V70Zm48 52h52v40h-52v-40Z"
          fill="currentColor"
        />
      </svg>

      <div className="rig-container relative z-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-[2fr_repeat(6,1fr)]">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" aria-label="MODELVAULT Home">
              <BrandMark />
            </Link>
            <p className="mt-4 max-w-[260px] text-[13px] leading-[1.65] text-[var(--rig-paper-50)]">
              Your AI development command center. Coordinate coding agents, workflows, and spend.
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 rig-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--rig-paper-40)]">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[var(--rig-paper-60)] transition-colors hover:text-[var(--rig-blue)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-[var(--rig-paper-18)] pt-8 rig-mono text-[11px] uppercase tracking-[0.1em] sm:flex-row sm:items-center">
          <span className="text-[var(--rig-paper-40)]">
            &copy; 2026 MODELVAULT Inc. All rights reserved.
          </span>
          <span className="inline-flex items-center gap-2.5 text-[var(--rig-paper-60)]">
            <span className="rig-blink-dot" aria-hidden="true" />
            System ready · Local workspace
          </span>
        </div>
      </div>
    </footer>
  )
}
