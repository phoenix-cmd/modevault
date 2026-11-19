"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCheck2,
  GitBranch,
  Play,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

interface WorkflowNode {
  id: string
  step: string
  title: string
  role: string
  status: "completed" | "running" | "queued" | "gate"
  duration: string
  description: string
  rules: string[]
}

const NODES: WorkflowNode[] = [
  {
    id: "plan",
    step: "01",
    title: "Decompose & Plan",
    role: "Claude 3.7 Sonnet",
    status: "completed",
    duration: "1.4s",
    description: "Ingests PR description or issue tickets, builds architectural dependency graph, and reserves file paths.",
    rules: ["Token limit: 8,000", "Schema validation: Strict", "Sub-task limit: 6"],
  },
  {
    id: "develop",
    step: "02",
    title: "Parallel Synthesis",
    role: "DeepSeek V3 / GPT-4.5",
    status: "completed",
    duration: "4.8s",
    description: "Frontend and Backend agents execute concurrently in isolated ephemeral workspaces with shared git tree access.",
    rules: ["Zero global pollution", "TypeScript strict mode", "Atomic commits"],
  },
  {
    id: "integrate",
    step: "03",
    title: "Git Integration",
    role: "MODELVAULT Engine",
    status: "completed",
    duration: "0.6s",
    description: "Validates mergeability against target branch, performs 3-way AST merge, and flags potential merge conflicts.",
    rules: ["Branch: feat/*", "Fast-forward merge", "Conflict auto-abort"],
  },
  {
    id: "test",
    step: "04",
    title: "Automated Test Suite",
    role: "Vitest / Jest Runner",
    status: "running",
    duration: "2.1s",
    description: "Runs regression tests plus newly synthesized unit tests. Halts pipeline if coverage decreases or tests fail.",
    rules: ["Coverage threshold: >= 90%", "Timeout: 30s", "Flaky test retry: 1"],
  },
  {
    id: "verify",
    step: "05",
    title: "AST Security Audit",
    role: "Llama 3.3 70B Taint Gate",
    status: "queued",
    duration: "1.8s",
    description: "Scans for secret leakage, SQL injection, unsafe deserialization, and CWE vulnerability signatures.",
    rules: ["Zero high CWEs", "Secret entropy scan", "Signed audit hash"],
  },
  {
    id: "review",
    step: "06",
    title: "Human Approval Gate",
    role: "Lead Engineer Sign-off",
    status: "gate",
    duration: "Manual",
    description: "Presents diff in Monaco review editor with automated confidence score and suggested test vectors.",
    rules: ["Mandatory for production", "2FA approval", "Comment audit log"],
  },
  {
    id: "deploy",
    step: "07",
    title: "Preview Deployment",
    role: "Vercel / GitHub Actions",
    status: "queued",
    duration: "12s",
    description: "Pushes validated branch, provisions ephemeral preview environment, and pings team via Slack/Discord.",
    rules: ["Ephemeral database clone", "Audit trail logged", "Auto-cleanup in 48h"],
  },
]

export function WorkflowShowcase() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("test")
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

  const activeNode = NODES.find((n) => n.id === selectedNodeId) || NODES[3]

  return (
    <section
      id="workflows"
      ref={sectionRef}
      className="py-24 px-6 bg-[#FFFEFB] text-[#15140F] border-b border-[#E2DDD3]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2DDD3] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#A4610A]">03</span>
              <span>/</span>
              <span>Pipeline Automation</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-[#15140F] leading-tight">
              Deterministic pipelines for
              <br />
              <span className="text-[#6F6C64]">non-deterministic models.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#6F6C64] max-w-md leading-relaxed">
            Eliminate prompt chaos. Construct multi-stage development workflows with conditional branching, automated healing loops, and mandatory human sign-off gates.
          </p>
        </div>

        {/* Visual Pipeline Strip */}
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-mono text-[#6F6C64]">
            <span>PIPELINE EXECUTION GRAPH: PRODUCTION RELEASE</span>
            <span className="text-[#A4610A] flex items-center gap-1.5 font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] animate-ping" />
              <span>STEP 4 RUNNING</span>
            </span>
          </div>

          {/* Interactive Node Sequence (horizontal on desktop, scrollable) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {NODES.map((node) => {
              const isSelected = selectedNodeId === node.id
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3.5 rounded-lg border text-left transition-all relative flex flex-col justify-between min-h-[140px] ${
                    isSelected
                      ? "border-[#F5A623] bg-[#F6F4EF] ring-1 ring-[#F5A623]/30"
                      : "border-[#E2DDD3] bg-[#FFFEFB] hover:border-[#CFC9BE] hover:bg-[#F6F4EF]"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-[10px] font-bold text-[#6F6C64]">
                      {node.step}
                    </span>
                    {node.status === "completed" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A4D]" />
                    )}
                    {node.status === "running" && (
                      <RotateCw className="h-3.5 w-3.5 text-[#A4610A] animate-spin" />
                    )}
                    {node.status === "gate" && (
                      <span className="text-[9px] font-mono font-bold text-[#8A5A00] bg-[#8A5A00]/10 px-1.5 py-0.2 rounded border border-[#8A5A00]/20">
                        GATE
                      </span>
                    )}
                    {node.status === "queued" && (
                      <Clock className="h-3.5 w-3.5 text-[#6F6C64]" />
                    )}
                  </div>

                  <div className="my-2">
                    <div className="font-bold text-xs text-[#15140F] leading-tight">
                      {node.title}
                    </div>
                    <div className="text-[10px] text-[#6F6C64] line-clamp-1 mt-0.5">
                      {node.role.split(" ")[0]}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E2DDD3] text-[10px] font-mono text-[#6F6C64] flex justify-between items-center w-full">
                    <span>{node.duration}</span>
                    <span
                      className={`capitalize ${
                        node.status === "completed"
                          ? "text-[#1F7A4D]"
                          : node.status === "running"
                          ? "text-[#A4610A] font-semibold"
                          : "text-[#6F6C64]"
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Node Detail Inspector Box */}
          <div className="p-6 rounded-none border border-[#E2DDD3] bg-[#F6F4EF] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2DDD3] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#A4610A] bg-[#F5A623]/10 px-2 py-0.5 rounded">
                  STAGE {activeNode.step}
                </span>
                <h4 className="text-base font-bold text-[#15140F]">
                  {activeNode.title}
                </h4>
                <span className="text-xs text-[#6F6C64] font-mono">
                  • Agent/Runner: {activeNode.role}
                </span>
              </div>
              <div className="text-xs font-mono text-[#6F6C64]">
                Execution Time: <span className="font-semibold text-[#15140F]">{activeNode.duration}</span>
              </div>
            </div>

            <p className="text-sm text-[#6F6C64] leading-relaxed">
              {activeNode.description}
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs font-mono text-[#6F6C64] mr-2">
                Guardrail Rules:
              </span>
              {activeNode.rules.map((rule, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-[#FFFEFB] border border-[#E2DDD3] text-xs font-mono text-[#15140F]"
                >
                  ✓ {rule}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
