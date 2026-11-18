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
      className="py-24 px-6 bg-[#0E1015] text-white border-b border-[#1E222A]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1E222A] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#737982]">
              <span className="text-[#D5222D]">02</span>
              <span>/</span>
              <span>Multi-Agent Architecture</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Autonomous agents.
              <br />
              <span className="text-[#8E95A2]">Synchronized output.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#8E95A2] max-w-md leading-relaxed">
            Replace chaotic solitary bots with a coordinated multi-agent mesh. Every agent is assigned specialized boundaries, strict budget limits, and direct git integration.
          </p>
        </div>

        {/* Interactive Agent Mesh Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Agent Selector List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#737982] mb-1">
              Select Agent to Inspect Telemetry:
            </div>
            {AGENTS.map((agent) => {
              const isSelected = agent.id === selectedAgent
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-[#D5222D] bg-[#161822] shadow-md"
                      : "border-[#1E222A] bg-[#12141A] hover:bg-[#151720]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {agent.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1F232B] text-[#A0A6AF]">
                        {agent.badge}
                      </span>
                    </div>
                    {agent.status === "Active" ? (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#D5222D]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#D5222D] animate-ping" />
                        <span>ACTIVE</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#27C93F]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>READY</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#8E95A2] line-clamp-1 mb-3">
                    {agent.role}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#737982] pt-2 border-t border-[#1E222A]">
                    <span>Model: {agent.model.split(" ")[0]}</span>
                    <span className="text-white font-medium">{agent.metrics.tokens}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active Agent Telemetry Monitor (7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-[#2B313D] bg-[#12141A] p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between border-b border-[#1E222A] pb-4 gap-3">
              <div>
                <div className="text-[10px] font-mono text-[#D5222D] uppercase tracking-wider">
                  Agent Telemetry Inspector
                </div>
                <h3 className="text-xl font-bold text-white">{current.name}</h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#A0A6AF] bg-[#1A1D26] px-3 py-1.5 rounded-md border border-[#262A34]">
                <Cpu className="h-3.5 w-3.5 text-[#D5222D]" />
                <span>Engine: {current.model}</span>
              </div>
            </div>

            <p className="text-sm text-[#C2C1C9] leading-relaxed">
              {current.description}
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1E222A]">
                <span className="block text-[10px] font-mono text-[#737982] uppercase">
                  Tokens Ingested
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.tokens}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1E222A]">
                <span className="block text-[10px] font-mono text-[#737982] uppercase">
                  Cost Allocated
                </span>
                <span className="text-base font-bold text-[#27C93F] font-mono">
                  {current.metrics.cost}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1E222A]">
                <span className="block text-[10px] font-mono text-[#737982] uppercase">
                  Average Latency
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.latency}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1E222A]">
                <span className="block text-[10px] font-mono text-[#737982] uppercase">
                  Tasks Verified
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {current.metrics.tasksDone} Done
                </span>
              </div>
            </div>

            {/* Recent Output Terminal Stream */}
            <div className="rounded-lg bg-[#090A0D] border border-[#1E222A] p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[#737982] text-[10px] pb-2 border-b border-[#1A1D24]">
                <span>AGENT STDOUT STREAM</span>
                <span>STATUS: VERIFIED</span>
              </div>
              <div className="text-[#A0A6AF] leading-relaxed">
                <span className="text-[#D5222D] mr-2">❯</span>
                {current.recentAction}
              </div>
              <div className="text-[#5C616B] text-[11px]">
                Payload hash: sha256:7f4c9b8e1a... • Context depth: 14.8k tokens • Isolation: Containerized
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
