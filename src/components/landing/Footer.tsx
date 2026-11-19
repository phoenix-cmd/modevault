import Link from "next/link"

const PRODUCT = [
  { label: "Workspace", href: "/overview" },
  { label: "Agents", href: "/agents" },
  { label: "Workflows", href: "/workflows" },
  { label: "Studio", href: "/studio" },
  { label: "Git", href: "/git" },
]

const OPERATIONS = [
  { label: "Models", href: "/models" },
  { label: "Subscriptions", href: "/subscriptions" },
  { label: "Usage", href: "/api-usage" },
  { label: "Billing", href: "/billing" },
  { label: "Permissions", href: "/permissions" },
]

export function Footer() {
  return (
    <footer className="border-t border-[var(--mkt-line)] bg-[var(--mkt-paper)]">
      <div className="mkt-container py-14 sm:py-16">
        <div className="grid gap-10 border-b border-[var(--mkt-line)] pb-12 md:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.5fr))] md:gap-12">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3 text-[var(--mkt-ink)]">
              <span className="inline-flex h-7 w-7 items-center justify-center border border-[var(--mkt-line-strong)] bg-[var(--mkt-bg)]">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="3.5" cy="8" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="12.5" cy="4" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="12.5" cy="12" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M4.7 7.4 11.3 4.7M4.7 8.6l6.6 2.7M12.5 5.3v5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="font-display text-[15px] font-medium tracking-[-0.02em]">Modelvault</span>
            </Link>
            <p className="mt-4 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
              A workspace for coordinating coding agents, structuring development
              workflows, and reviewing changes before delivery.
            </p>
            <p className="mkt-note mt-5">
              Software development, orchestrated.
            </p>
          </div>

          <div>
            <p className="mkt-eyebrow">Product</p>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="mkt-link text-[13px]">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mkt-eyebrow">Operations</p>
            <ul className="mt-4 space-y-2.5">
              {OPERATIONS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="mkt-link text-[13px]">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/login" className="mkt-link text-[13px]">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[12px] text-[var(--mkt-ink-3)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Modelvault. Public site presentation.</p>
          <p className="mkt-mono text-[10px] uppercase tracking-[0.08em]">
            Built for clear, verifiable software work
          </p>
        </div>
      </div>
    </footer>
  )
}
