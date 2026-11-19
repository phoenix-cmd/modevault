"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Cpu,
  GitBranch,
  Layers,
  Network,
  RotateCw,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

interface AgentProfile {
  id: string
  name: string
  badge: string
  model: string
  role: string
  description: string
  status: "Completed" | "Active" | "Standby"
  metrics: {
    tokens: string
    cost: string
    latency: string
    tasksDone: number
  }
  recentAction: string
}

const AGENTS: AgentProfile[] = [
  {
    id: "orchestrator",
    name: "Master Orchestrator",
    badge: "CORE ENGINE",
    model: "Claude 3.7 Sonnet",
    role: "System Decomposition & Execution Planner",
    description:
      "Ingests user specifications, builds a topological dependency DAG, resolves file collision boundaries, and assigns subtasks to domain agents.",
    status: "Completed",
    metrics: {
      tokens: "2,410 tkn",
      cost: "$0.0072",
      latency: "1.6s",
      tasksDone: 6,
    },
    recentAction: "Resolved 4 execution tasks across frontend, backend, and security domains",
  },
  {
    id: "backend",
    name: "Backend Systems Agent",
    badge: "SERVICES & API",
    model: "DeepSeek V3 / GPT-4.5",
    role: "Database Schemas & Route Synthesis",
    description:
      "Implements server-side route handlers, Prisma database queries, transaction rollbacks, and cryptographic session validation.",
    status: "Active",
    metrics: {
      tokens: "5,890 tkn",
      cost: "$0.0176",
      latency: "2.8s",
      tasksDone: 3,
    },
    recentAction: "Created src/app/api/auth/oauth/token/route.ts with PKCE verifier",
  },
  {
    id: "frontend",
    name: "Frontend UI Specialist",
    badge: "CLIENT & UX",
    model: "Claude 3.7 Sonnet",
    role: "Accessible UI Components & State",
    description:
      "Synthesizes responsive React 19 components with Tailwind v4, optimistic UI states, keyboard accessible ARIA attributes, and error boundaries.",
    status: "Completed",
    metrics: {
      tokens: "3,720 tkn",
      cost: "$0.0111",
      latency: "2.1s",
      tasksDone: 4,
    },
    recentAction: "Exported OAuthCallbackModal.tsx with loading skeletons and error state",
  },
  {
    id: "security",
    name: "Security & QA Auditor",
    badge: "INDEPENDENT GATE",
    model: "Llama 3.3 70B",
    role: "AST Static Analysis & Test Generation",
    description:
      "Runs automated taint analysis, detects OWASP Top 10 vulnerabilities, enforces zero secret leakage, and writes Vitest suites with 100% path coverage.",
    status: "Active",
    metrics: {
      tokens: "3,150 tkn",
      cost: "$0.0031",
      latency: "1.9s",
      tasksDone: 5,
    },
    recentAction: "Generated 5 unit tests in tests/pkce.test.ts • 0 CWE vulnerabilities",
  },
]

export function AgentOrchestration() {
  const [selectedAgent, setSelectedAgent] = useState<string>("backend")
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = createScrollObserver(sectionRef.current, () => {
      if (contentRef.current) {
        animateFadeUp(contentRef.current, 0, 700)
      }
    })
    return cleanup
  }, [])

  const current = AGENTS.find((a) => a.id === selectedAgent) || AGENTS[1]

  return (
    <section
      id="orchestration"
      ref={sectionRef}
      className="py-24 px-6 bg-[#0D0E10] text-white border-b border-[#1E2024]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1E2024] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#F5A623]">02</span>
              <span>/</span>
              <span>Multi-Agent Architecture</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-white leading-tight">
              Autonomous agents.
              <br />
              <span className="text-[#A5A29A]">Synchronized output.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#A5A29A] max-w-md leading-relaxed">
            Replace chaotic solitary bots with a coordinated multi-agent mesh. Every agent is assigned specialized boundaries, strict budget limits, and direct git integration.
          </p>
        </div>

        {/* Interactive Agent Mesh Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Agent Selector List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#6F6C64] mb-1">
              Select Agent to Inspect Telemetry:
            </div>
            {AGENTS.map((agent) => {
              const isSelected = agent.id === selectedAgent
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full text-left p-4 rounded-none border transition-all ${
                    isSelected
                      ? "border-[#F5A623] bg-[#16171A]"
                      : "border-[#1E2024] bg-[#16171A] hover:bg-[#16171A]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {agent.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1F2024] text-[#A5A29A]">
                        {agent.badge}
                      </span>
                    </div>
                    {agent.status === "Active" ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#F5A623]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] animate-ping" />
                        <span>ACTIVE</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#63C08A]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>READY</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#A5A29A] line-clamp-1 mb-3">
                    {agent.role}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#6F6C64] pt-2 border-t border-[#1E2024]">
                    <span>Model: {agent.model.split(" ")[0]}</span>
                    <span className="text-white font-medium">{agent.metrics.tokens}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Agent Telemetry Monitor (7 cols) */}
          <div className="lg:col-span-7 rounded-none border border-[#2D3036] bg-[#16171A] p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1E2024] pb-4 gap-3">
              <div>
                <div className="text-[10px] font-mono text-[#F5A623] uppercase tracking-wider">
                  Agent Telemetry Inspector
                </div>
                <h3 className="text-xl font-bold text-white">{current.name}</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#A5A29A] bg-[#1F2024] px-3 py-1.5 rounded-md border border-[#2D3036]">
                <Cpu className="h-3.5 w-3.5 text-[#F5A623]" />
                <span>Engine: {current.model}</span>
              </div>
            </div>

            <p className="text-sm text-[#C9C5BC] leading-relaxed">
              {current.description}
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0D0E10] border border-[#1E2024]">
                <span className="block text-[10px] font-mono text-[#6F6C64] uppercase">
                  Tokens Ingested
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.tokens}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0D0E10] border border-[#1E2024]">
                <span className="block text-[10px] font-mono text-[#6F6C64] uppercase">
                  Cost Allocated
                </span>
                <span className="text-base font-bold text-[#63C08A] font-mono">
                  {current.metrics.cost}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0D0E10] border border-[#1E2024]">
                <span className="block text-[10px] font-mono text-[#6F6C64] uppercase">
                  Average Latency
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.latency}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0D0E10] border border-[#1E2024]">
                <span className="block text-[10px] font-mono text-[#6F6C64] uppercase">
                  Tasks Verified
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.tasksDone} Done
                </span>
              </div>
            </div>

            {/* Recent Output Terminal Stream */}
            <div className="rounded-lg bg-[#0A0B0D] border border-[#1E2024] p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[#6F6C64] text-[10px] pb-2 border-b border-[#1E2024]">
                <span>AGENT STDOUT STREAM</span>
                <span>STATUS: VERIFIED</span>
              </div>
              <div className="text-[#A5A29A] leading-relaxed">
                <span className="text-[#F5A623] mr-2">❯</span>
                {current.recentAction}
              </div>
              <div className="text-[#6F6C64] text-[11px]">
                Payload hash: sha256:7f4c9b8e1a... • Context depth: 14.8k tokens • Isolation: Containerized
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
