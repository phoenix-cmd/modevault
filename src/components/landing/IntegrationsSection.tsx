const SETUP_STEPS = [
  {
    num: "01 / WORKSPACE",
    title: "Attach your repository.",
    body: "Upload a source archive or connect a Git repository to inspect structure and provision an isolated sandbox.",
  },
  {
    num: "02 / PROVIDERS",
    title: "Track keys and plans.",
    body: "Record provider subscriptions, monitor API credits, and store encrypted integration metadata per workspace.",
  },
  {
    num: "03 / AGENTS",
    title: "Orchestrate and review.",
    body: "Dispatch tasks across specialized agent profiles, run workflows, verify diffs, and approve merges.",
  },
]

const AGENT_STACK = [
  { name: "Claude Code", status: "Workspace Profile" },
  { name: "Codex", status: "Workspace Profile" },
  { name: "OpenCode", status: "Workspace Profile" },
  { name: "Cursor", status: "Tracked Plan" },
  { name: "Gemini CLI", status: "Workspace Profile" },
  { name: "Continue", status: "Adapter Planned" },
  { name: "Aider", status: "Adapter Planned" },
  { name: "Custom agents", status: "Configurable" },
]

function AgentGlyph({ name }: { name: string }) {
  const code = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 items-center justify-center border border-[var(--rig-paper-20)] bg-[#101514] rig-mono text-[11px] font-bold tracking-[0.06em] text-[var(--rig-paper)]"
    >
      {code}
    </span>
  )
}

export function IntegrationsSection() {
  return (
    <section
      id="integrations"
      className="border-b border-[var(--rig-paper-18)] py-20 sm:py-28"
    >
      <div className="rig-container">
        <div className="mx-auto mb-14 max-w-[680px] text-center">
          <span className="rig-badge mb-6">Get Started</span>
          <h2 className="rig-display text-[clamp(2.4rem,4.8vw,4rem)] font-bold leading-[0.96] text-[var(--rig-paper)]">
            Set up MODELVAULT
            <br />
            where code gets written.
          </h2>
        </div>

        {/* 3 Numbered Setup Columns */}
        <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {SETUP_STEPS.map((step) => (
            <li
              key={step.num}
              className="border-t border-[var(--rig-paper-18)] pt-6"
            >
              <p className="rig-mono text-[11px] tracking-[0.1em] text-[var(--rig-blue)]">
                {step.num}
              </p>
              <h3 className="mt-3 rig-display text-[1.45rem] font-semibold leading-[1.1] text-[var(--rig-paper)]">
                {step.title}
              </h3>
              <p className="mt-3 text-[0.92rem] leading-[1.68] text-[var(--rig-paper-75)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>

        {/* Works With Your Stack */}
        <div className="mt-20 border-t border-[var(--rig-paper-18)] pt-14">
          <h3 className="text-center rig-display text-[1.35rem] font-semibold text-[var(--rig-paper)]">
            Works with your coding agents and stack.
          </h3>
          <p className="mt-2 text-center rig-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--rig-paper-40)]">
            Supported workspace profiles &amp; planned external CLI adapters labeled explicitly
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {AGENT_STACK.map((agent) => (
              <div
                key={agent.name}
                className="flex flex-col items-center gap-2.5 border border-[var(--rig-paper-12)] bg-[#101514] px-3 py-4 text-center"
              >
                <AgentGlyph name={agent.name} />
                <span className="text-[12px] font-medium text-[var(--rig-paper)]">
                  {agent.name}
                </span>
                <span className="rig-mono text-[9px] uppercase tracking-[0.06em] text-[var(--rig-paper-40)]">
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
