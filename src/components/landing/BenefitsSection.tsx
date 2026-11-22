const BENEFITS = [
  {
    kicker: "COORDINATION",
    title: "BUILD TOGETHER",
    description:
      "Coordinate specialized AI agents across architecture, implementation, and review from one shared workspace.",
  },
  {
    kicker: "TRANSPARENCY",
    title: "SEE EVERYTHING",
    description:
      "Monitor live execution stages, inspect every generated code change, and track exact token expenditure.",
  },
  {
    kicker: "VERIFICATION",
    title: "SHIP WITH EVIDENCE",
    description:
      "Test changes in isolated sandboxes, inspect verification findings, and merge only after human review.",
  },
]

export function BenefitsSection() {
  return (
    <section className="border-b border-[var(--rig-paper-18)]">
      <div className="rig-container !px-0">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr_1px_1fr]">
          {BENEFITS.map((item, idx) => (
            <div key={item.title} className="contents">
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-10 sm:py-24">
                <span className="rig-badge mb-5">{item.kicker}</span>
                <h2 className="rig-display text-[clamp(1.6rem,2.6vw,2.1rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
                  {item.title}
                </h2>
                <p className="mt-4 max-w-[300px] text-[0.92rem] leading-[1.65] text-[var(--rig-paper-75)]">
                  {item.description}
                </p>
              </div>
              {idx < BENEFITS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="h-px w-full bg-[var(--rig-paper-18)] md:h-auto md:w-px md:self-stretch"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
