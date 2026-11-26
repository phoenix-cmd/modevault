"use client"

const PROVIDER_LEDGER = [
  {
    provider: "Anthropic API",
    allowance: "Tier 4 · $500.00/mo",
    consumed: "$312.40",
    pct: 62,
    tokens: "18.4M tkn",
    budgetCap: "Enforced ($500)",
  },
  {
    provider: "OpenAI Platform",
    allowance: "Prepaid Credit · $800.00",
    consumed: "$418.90",
    pct: 52,
    tokens: "21.9M tkn",
    budgetCap: "Enforced ($800)",
  },
  {
    provider: "Cursor Team",
    allowance: "Consumer Plan · 12 seats",
    consumed: "$480.00",
    pct: 84,
    tokens: "5,420 reqs",
    budgetCap: "Seat quota alert",
  },
  {
    provider: "Google Vertex / Gemini",
    allowance: "Developer · $300.00/mo",
    consumed: "$84.20",
    pct: 28,
    tokens: "14.2M tkn",
    budgetCap: "Enforced ($300)",
  },
]

const AGENT_BUDGETS = [
  { project: "checkout-api", agent: "Backend Profile", limit: "$150.00", spent: "$64.10", remaining: "$85.90" },
  { project: "design-system", agent: "Frontend Profile", limit: "$120.00", spent: "$41.80", remaining: "$78.20" },
  { project: "auth-service", agent: "Verification Profile", limit: "$80.00", spent: "$19.45", remaining: "$60.55" },
]

export function ResourceIntelligence() {
  return (
    <section
      id="intelligence"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] py-16 sm:py-28"
    >
      <div className="rig-container">
        <div className="flex flex-col justify-between gap-6 border-b border-[var(--rig-paper-18)] pb-10 lg:flex-row lg:items-end">
          <div>
            <span className="rig-badge mb-6">Resource Intelligence</span>
            <h2 className="rig-display text-[clamp(1.9rem,4.5vw,3.9rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
              Subscriptions, API credits,
              <br />
              <span className="text-[var(--rig-paper-50)]">and agent budgets unified.</span>
            </h2>
          </div>
          <p className="max-w-md text-[0.95rem] leading-[1.68] text-[var(--rig-paper-75)]">
            Separate fixed subscription seats from metered token consumption, prepaid API balances, and per-project agent spend ceilings.
          </p>
        </div>

        {/* Summary Band */}
        <div className="grid grid-cols-2 gap-x-4 border-b border-[var(--rig-paper-18)] lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-[var(--rig-paper-18)]">
          {[
            { label: "Provider Subscriptions", value: "$480.00", meta: "12 tracked seats (illustrative)" },
            { label: "Metered API Credits", value: "$815.50", meta: "Across 3 active providers" },
            { label: "Token Consumption", value: "54.5M", meta: "Input + output volume" },
            { label: "Agent Budget Guard", value: "98.4%", meta: "Runs within cap" },
          ].map((m, idx) => (
            <div
              key={m.label}
              className={`min-w-0 py-5 lg:px-6 lg:py-6 lg:first:pl-0 ${
                idx < 2 ? "border-b border-[var(--rig-paper-18)] lg:border-b-0" : ""
              }`}
            >
              <p className="rig-mono text-[10px] uppercase tracking-[0.14em] text-[var(--rig-paper-40)]">
                {m.label}
              </p>
              <p className="mt-2 rig-mono text-[clamp(1.35rem,3vw,1.625rem)] font-medium tracking-[-0.04em] text-[var(--rig-paper)] tabular-nums">
                {m.value}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-[var(--rig-paper-50)]">{m.meta}</p>
            </div>
          ))}
        </div>

        {/* Analytical Tables */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Provider & Subscription Usage Table */}
          <div className="border border-[var(--rig-paper-18)] bg-[#101514]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] px-4 py-3 rig-mono text-[10.5px] uppercase tracking-[0.1em]">
              <span className="text-[var(--rig-paper)]">Provider Usage & Allowances</span>
              <span className="text-[var(--rig-yellow)]">Illustrative Data</span>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-[12.5px]">
                <caption className="sr-only">Illustrative provider usage, token allowances, and spend</caption>
                <thead>
                  <tr className="border-b border-[var(--rig-paper-12)] rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-paper-40)]">
                    <th className="px-4 py-2.5">Provider</th>
                    <th className="px-4 py-2.5">Allowance</th>
                    <th className="px-4 py-2.5">Utilization</th>
                    <th className="px-4 py-2.5 text-right">Volume</th>
                    <th className="px-4 py-2.5 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {PROVIDER_LEDGER.map((row) => (
                    <tr key={row.provider} className="border-b border-[var(--rig-paper-12)] last:border-b-0">
                      <td className="px-4 py-3 font-medium text-[var(--rig-paper)]">
                        {row.provider}
                        <span className="mt-0.5 block rig-mono text-[10px] text-[var(--rig-paper-40)]">
                          {row.budgetCap}
                        </span>
                      </td>
                      <td className="px-4 py-3 rig-mono text-[11px] text-[var(--rig-paper-60)]">
                        {row.allowance}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="h-[3px] w-full bg-[var(--rig-paper-12)]">
                          <div
                            className="h-full"
                            style={{
                              width: `${row.pct}%`,
                              backgroundColor: row.pct >= 80 ? "var(--rig-yellow)" : "var(--rig-blue)",
                            }}
                          />
                        </div>
                        <span className="mt-1 block rig-mono text-[10px] text-[var(--rig-paper-40)]">
                          {row.pct}% used
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right rig-mono text-[11px] text-[var(--rig-paper-60)] tabular-nums">
                        {row.tokens}
                      </td>
                      <td className="px-4 py-3 text-right rig-mono text-[11.5px] font-medium text-[var(--rig-paper)] tabular-nums">
                        {row.consumed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--rig-paper-12)] md:hidden">
              {PROVIDER_LEDGER.map((row) => (
                <div key={row.provider} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--rig-paper)]">{row.provider}</p>
                      <p className="mt-0.5 rig-mono text-[10px] text-[var(--rig-paper-50)]">{row.allowance}</p>
                    </div>
                    <div className="shrink-0 text-right rig-mono">
                      <p className="text-[13px] font-medium text-[var(--rig-paper)] tabular-nums">{row.consumed}</p>
                      <p className="mt-0.5 text-[10px] text-[var(--rig-paper-50)] tabular-nums">{row.tokens}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-[3px] w-full bg-[var(--rig-paper-12)]">
                      <div
                        className="h-full"
                        style={{
                          width: `${row.pct}%`,
                          backgroundColor: row.pct >= 80 ? "var(--rig-yellow)" : "var(--rig-blue)",
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between rig-mono text-[10px] text-[var(--rig-paper-40)]">
                      <span>{row.pct}% used</span>
                      <span>{row.budgetCap}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Expenditure & Agent Budgets Table */}
          <div className="border border-[var(--rig-paper-18)] bg-[#101514]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-12)] px-4 py-3 rig-mono text-[10.5px] uppercase tracking-[0.1em]">
              <span className="text-[var(--rig-paper)]">Project Expenditure & Agent Budgets</span>
              <span className="text-[var(--rig-paper-40)]">Sample Ledger</span>
            </div>

            <div className="divide-y divide-[var(--rig-paper-12)]">
              {AGENT_BUDGETS.map((b) => (
                <div key={b.project} className="flex items-center justify-between gap-4 px-4 py-4">
                  <div>
                    <p className="rig-mono text-[12px] font-medium text-[var(--rig-paper)]">
                      {b.project}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[var(--rig-paper-50)]">
                      {b.agent} · Cap {b.limit}
                    </p>
                  </div>
                  <div className="text-right rig-mono">
                    <p className="text-[13px] font-medium text-[var(--rig-paper)] tabular-nums">
                      {b.spent}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--rig-green)] tabular-nums">
                      {b.remaining} left
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--rig-paper-12)] bg-[#0b0f0e] px-4 py-3 rig-mono text-[10.5px] text-[var(--rig-paper-50)]">
              Representative values only — live account figures load inside Usage &amp; Subscriptions once configured.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
