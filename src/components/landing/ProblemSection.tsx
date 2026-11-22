"use client"

import { useEffect, useRef } from "react"
import { animateFadeUp, createScrollObserver } from "@/lib/animations/reveals"

const PROBLEMS = [
  {
    code: "01",
    index: "001",
    label: "AGENTS",
    title: "Fragmented agents.",
    description:
      "Developers run different coding agents in isolated sessions without unified coordination, handoff state, or conflict protection.",
  },
  {
    code: "02",
    index: "002",
    label: "WORKFLOWS",
    title: "Disconnected workflows.",
    description:
      "Planning, implementation, testing, security checks, and human review remain split across disconnected scripts and dashboards.",
  },
  {
    code: "03",
    index: "003",
    label: "VISIBILITY",
    title: "Limited visibility.",
    description:
      "Engineering leads cannot easily inspect which files each agent touched, which checks ran, or why a change was proposed.",
  },
  {
    code: "04",
    index: "004",
    label: "RESOURCES",
    title: "Uncontrolled resources.",
    description:
      "Token usage, provider API credits, consumer subscriptions, and project expenditure sit across separate billing portals.",
  },
]

export function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let anim: { cancel?: () => void } | null = null
    const stopObserver = createScrollObserver(sectionRef.current, () => {
      anim = animateFadeUp(headingRef.current, 0, 560)
    })
    return () => {
      stopObserver()
      anim?.cancel?.()
    }
  }, [])

  return (
    <section
      id="problem"
      ref={sectionRef}
      className="relative scroll-mt-20 border-b border-[var(--rig-paper-18)]"
    >
      <div className="rig-container !px-0">
        {/* Top Editorial Header */}
        <div
          ref={headingRef}
          className="border-b border-[var(--rig-paper-18)] px-4 py-10 sm:px-12 sm:py-16"
        >
          <span className="rig-badge mb-7">
            <span className="rig-blink-dot" aria-hidden="true" />
            The Problem
          </span>
          <h2 className="rig-display max-w-4xl text-[clamp(1.85rem,4.8vw,4.25rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
            AI development is powerful.
            <br />
            <span className="text-[var(--rig-paper-50)]">
              Managing it shouldn&apos;t be complicated.
            </span>
          </h2>
        </div>

        {/* Rig 3-column asymmetric hairline grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2">
          {/* Left architectural diagram spanning 2 rows */}
          <div className="flex flex-col items-center justify-center border-b border-[var(--rig-paper-18)] bg-[#101514] p-6 sm:p-8 lg:row-span-2 lg:border-b-0 lg:border-r">
            <div className="w-full max-w-[300px]">
              <div className="mb-4 flex items-center justify-between rig-mono text-[10px] uppercase tracking-[0.14em] text-[var(--rig-paper-40)]">
                <span>Uncoordinated Flow</span>
                <span className="text-[var(--rig-red)]">Bottleneck</span>
              </div>

              <svg
                viewBox="0 0 280 260"
                preserveAspectRatio="xMidYMid meet"
                className="w-full"
                aria-label="Diagram illustrating four fragmented AI tool streams converging onto an uncoordinated review bottleneck"
              >
                {/* Horizontal grid hairlines */}
                <line x1="0" y1="65" x2="280" y2="65" stroke="rgba(240,237,230,0.08)" />
                <line x1="0" y1="130" x2="280" y2="130" stroke="rgba(240,237,230,0.08)" />
                <line x1="0" y1="195" x2="280" y2="195" stroke="rgba(240,237,230,0.08)" />

                {/* Left isolated agent sources */}
                {[
                  { y: 30, label: "CLI A" },
                  { y: 95, label: "IDE B" },
                  { y: 160, label: "BOT C" },
                  { y: 225, label: "API $" },
                ].map((node) => (
                  <g key={node.label}>
                    <rect
                      x="8"
                      y={node.y - 14}
                      width="56"
                      height="28"
                      fill="#161e1d"
                      stroke="rgba(240,237,230,0.28)"
                    />
                    <text
                      x="36"
                      y={node.y + 4}
                      textAnchor="middle"
                      fill="rgba(240,237,230,0.75)"
                      fontSize="10"
                      fontFamily="var(--font-mono), monospace"
                    >
                      {node.label}
                    </text>
                    <path
                      d={`M 64 ${node.y} L 138 ${node.y} L 178 130`}
                      fill="none"
                      stroke="rgba(240,237,230,0.28)"
                      strokeDasharray="4 4"
                    />
                  </g>
                ))}

                {/* Collision gate */}
                <rect
                  x="178"
                  y="98"
                  width="92"
                  height="64"
                  fill="rgba(237, 70, 45, 0.12)"
                  stroke="oklch(0.6329 0.2075 31.49)"
                  strokeWidth="1.5"
                />
                <text
                  x="224"
                  y="125"
                  textAnchor="middle"
                  fill="oklch(0.6329 0.2075 31.49)"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="var(--font-mono), monospace"
                >
                  MANUAL
                </text>
                <text
                  x="224"
                  y="142"
                  textAnchor="middle"
                  fill="rgba(240,237,230,0.8)"
                  fontSize="10"
                  fontFamily="var(--font-mono), monospace"
                >
                  BACKLOG
                </text>
              </svg>

              <p className="mt-4 rig-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rig-paper-40)]">
                Zero shared context across tools
              </p>
            </div>
          </div>

          {/* 4 Hairline Problem Cells */}
          {PROBLEMS.map((problem, index) => (
            <div
              key={problem.code}
              className={`flex flex-col justify-between p-7 sm:p-9 ${
                index < 2 ? "border-b border-[var(--rig-paper-18)]" : ""
              } ${index % 2 === 0 ? "lg:border-r lg:border-[var(--rig-paper-18)]" : ""} ${
                index === 2 ? "border-b lg:border-b-0 border-[var(--rig-paper-18)]" : ""
              }`}
            >
              <div>
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="rig-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-[var(--rig-blue)]">
                    {problem.code} — {problem.label}
                  </span>
                  <span className="rig-mono text-[10px] tracking-[0.2em] text-[var(--rig-paper-20)]">
                    {problem.index}
                  </span>
                </div>
                <h3 className="rig-display text-[1.45rem] font-semibold leading-[1.08] text-[var(--rig-paper)]">
                  {problem.title}
                </h3>
                <p className="mt-3 text-[0.9rem] leading-[1.65] text-[var(--rig-paper-75)]">
                  {problem.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
