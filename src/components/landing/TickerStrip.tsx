"use client"

const TICKER_ITEMS = [
  { label: "MULTI-AGENT EXECUTION", href: "#orchestration" },
  { label: "WORKFLOW AUTOMATION", href: "#workflows" },
  { label: "LIVE DEVELOPMENT", href: "#studio" },
  { label: "CODE VERIFICATION", href: "#verification" },
  { label: "RESOURCE INTELLIGENCE", href: "#intelligence" },
  { label: "GIT BRANCH ISOLATION", href: "#introducing" },
  { label: "BUDGET GOVERNANCE", href: "#intelligence" },
]

export function TickerStrip() {
  return (
    <div
      className="rig-ticker relative z-20 overflow-hidden border-t border-black/15 py-3"
      aria-label="Platform capabilities"
    >
      <div className="rig-ticker-inner rig-mono text-[12px] font-medium uppercase tracking-[0.14em] text-[#0c1212]/80">
        <div className="flex shrink-0 items-center gap-10 pr-10">
          {TICKER_ITEMS.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-10">
              <a
                href={item.href}
                className="whitespace-nowrap transition-opacity hover:underline hover:underline-offset-4 hover:opacity-100"
              >
                {item.label}
              </a>
              <span aria-hidden="true" className="text-[10px]">
                &#9632;
              </span>
            </span>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="rig-ticker-clone flex shrink-0 items-center gap-10 pr-10"
        >
          {TICKER_ITEMS.map((item) => (
            <span key={`clone-${item.label}`} className="inline-flex items-center gap-10">
              <span className="whitespace-nowrap">{item.label}</span>
              <span className="text-[10px]">&#9632;</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
