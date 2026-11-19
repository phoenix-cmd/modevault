"use client"

import { useState, useEffect } from "react"
import {
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  FileCode2,
  GitBranch,
  Play,
  RotateCw,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react"

interface AgentTask {
  id: string
  name: string
  role: string
  model: string
  status: "completed" | "running" | "queued"
  task: string
  tokens: string
  duration: string
}

const AGENTS: AgentTask[] = [
  {
    id: "agent-1",
    name: "Architect Agent",
    role: "System Design",
    model: "Claude 3.7 Sonnet",
    status: "completed",
    task: "Decomposed OAuth2 RFC 7636 PKCE specification & challenge schema",
    tokens: "1,420 tkn",
    duration: "1.8s",
  },
  {
    id: "agent-2",
    name: "Backend Agent",
    role: "Implementation",
    model: "DeepSeek V3 / GPT-4.5",
    status: "running",
    task: "Generating constant-time verifier with Web Crypto SHA-256",
    tokens: "2,840 tkn",
    duration: "2.4s",
  },
  {
    id: "agent-3",
    name: "Security QA Agent",
    role: "Verification",
    model: "Llama 3.3 70B",
    status: "queued",
    task: "Static AST taint analysis & timing attack vulnerability checks",
    tokens: "Waiting",
    duration: "Queue",
  },
]

export function HeroProductDemo() {
  const [activeTab, setActiveTab] = useState<"diff" | "terminal" | "security">("diff")
  const [selectedAgent, setSelectedAgent] = useState<string>("agent-2")
  const [cycleStep, setCycleStep] = useState<number>(0)

  // Subtle cyclic transition simulating agent coordination
  useEffect(() => {
    const timer = setInterval(() => {
      setCycleStep((prev) => (prev + 1) % 4)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full rounded-none border border-[#2D3036] bg-[#0D0E10] overflow-hidden text-left">
      {/* Window Titlebar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1E2024] bg-[#16171A] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#63C08A]/80" />
          </div>
          <div className="h-3.5 w-px bg-[#2D3036]" />
          <div className="flex items-center gap-2 font-mono text-xs text-[#A5A29A]">
            <GitBranch className="h-3.5 w-3.5 text-[#F5A623]" />
            <span className="text-white font-medium">modelvault</span>
            <span className="text-[#6F6C64]">/</span>
            <span>feat/oauth-pkce-verifier</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1E2024] text-[#A5A29A] border border-[#2D3036]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#63C08A] animate-pulse" />
            <span>3 AGENTS ACTIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[#6F6C64]">
            <span>BURN:</span>
            <span className="text-white font-medium">4,260 tkn ($0.0134)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Agent Roster + Right Code/Inspect View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
        {/* Left Column: Live Agent Coordination (5 cols) */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1E2024] bg-[#0A0B0D] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#6F6C64]">
                Active Agent Mesh
              </span>
              <span className="text-[11px] font-mono text-[#F5A623] flex items-center gap-1">
                <RotateCw className="h-3 w-3 animate-spin" />
                <span>Orchestrating</span>
              </span>
            </div>

            {/* Agent Cards */}
            <div className="space-y-2">
              {AGENTS.map((agent) => {
                const isSelected = selectedAgent === agent.id
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "border-[#F5A623]/60 bg-[#161820]"
                        : "border-[#1E2024] bg-[#16171A]/60 hover:bg-[#16171A]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {agent.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1F2024] text-[#A5A29A]">
                          {agent.role}
                        </span>
                      </div>
                      {agent.status === "completed" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#63C08A]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>DONE</span>
                        </span>
                      )}
                      {agent.status === "running" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#F5A623]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623] animate-ping" />
                          <span>STREAMING</span>
                        </span>
                      )}
                      {agent.status === "queued" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#6F6C64]">
                          <Clock className="h-3 w-3" />
                          <span>QUEUED</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#A5A29A] line-clamp-2 leading-relaxed">
                      {agent.task}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#1E2024] flex items-center justify-between text-[10px] font-mono text-[#6F6C64]">
                      <span>Model: {agent.model}</span>
                      <span className="text-white/80">{agent.tokens}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Execution Status Banner */}
          <div className="p-2.5 rounded-md border border-[#2D3036] bg-[#16171A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#A5A29A]">
              <ShieldCheck className="h-4 w-4 text-[#63C08A]" />
              <span className="text-[11px] font-mono">AST Gate: Enforced</span>
            </div>
            <span className="text-[10px] font-mono text-[#63C08A] bg-[#63C08A]/10 px-2 py-0.5 rounded border border-[#63C08A]/20">
              0 Violations
            </span>
          </div>
        </div>

        {/* Right Column: Code Diff / Live Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-[#0D0E10] flex flex-col justify-between">
          {/* Editor Header / Tab Switcher */}
          <div className="flex items-center justify-between border-b border-[#1E2024] bg-[#16171A] px-4">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("diff")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "diff"
                    ? "border-[#F5A623] text-white font-medium bg-[#0D0E10]"
                    : "border-transparent text-[#6F6C64] hover:text-[#A5A29A]"
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                <span>src/auth/pkce.ts</span>
              </button>

              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "terminal"
                    ? "border-[#F5A623] text-white font-medium bg-[#0D0E10]"
                    : "border-transparent text-[#6F6C64] hover:text-[#A5A29A]"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Agent Logs</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "security"
                    ? "border-[#F5A623] text-white font-medium bg-[#0D0E10]"
                    : "border-transparent text-[#6F6C64] hover:text-[#A5A29A]"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#63C08A]" />
                <span>Verification Report</span>
              </button>
            </div>

            <span className="hidden sm:inline-block text-[10px] font-mono text-[#6F6C64]">
              TypeScript 5.8 (Strict)
            </span>
          </div>

          {/* Main Content Area */}
          <div className="p-4 flex-1 font-mono text-xs overflow-x-auto leading-relaxed">
            {activeTab === "diff" && (
              <div className="space-y-1">
                <div className="text-[#6F6C64] text-[11px] pb-2 border-b border-[#1E2024] flex justify-between">
                  <span>@@ -14,6 +14,19 @@ export interface PkceChallenge</span>
                  <span className="text-[#63C08A]">+13 lines added</span>
                </div>
                <div className="text-[#6F6C64] pl-2">  method: 'S256' | 'plain';</div>
                <div className="text-[#6F6C64] pl-2">  createdAt: Date;</div>
                <div className="text-[#6F6C64] pl-2">{'}'}</div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  + export async function verifyCodeChallenge(
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   verifier: string,
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   challenge: string
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  + ): Promise&lt;boolean&gt; {'{'}
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   const raw = new TextEncoder().encode(verifier);
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   const hash = await crypto.subtle.digest(&apos;SHA-256&apos;, raw);
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   const computed = toBase64Url(new Uint8Array(hash));
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  +   return constantTimeCompare(computed, challenge);
                </div>
                <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                  + {'}'}
                </div>
                <div className="text-[#6F6C64] pl-2"> </div>
              </div>
            )}

            {activeTab === "terminal" && (
              <div className="space-y-1.5 text-[11px] text-[#A5A29A]">
                <div className="text-[#6F6C64]">[23:14:02.102] ORCHESTRATOR: Execution plan generated (3 tasks)</div>
                <div className="text-[#6F6C64]">[23:14:02.418] TASK_1: ArchitectAgent created schema specs (1.8s)</div>
                <div className="text-[#63C08A]">[23:14:03.110] TASK_2: BackendAgent streamed src/auth/pkce.ts (2,840 tokens)</div>
                <div className="text-[#F5A623]">[23:14:03.950] TASK_3: AST Security Scanner initialized...</div>
                <div className="text-[#63C08A]">[23:14:04.220] AUDIT: 0 CWE issues detected, constantTimeCompare verified</div>
                <div className="text-white flex items-center gap-2 pt-2">
                  <span className="text-[#F5A623]">modelvault&gt;</span>
                  <span>ready for review & pull request merge</span>
                  <span className="h-3 w-1.5 bg-[#F5A623] animate-pulse" />
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded bg-[#161820] border border-[#2D3036]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#63C08A]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Cryptographic Verification Passed</div>
                      <div className="text-[10px] text-[#6F6C64]">Policy: Strict Enterprise RuleSet v4</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#63C08A] bg-[#63C08A]/10 px-2 py-1 rounded">
                    Score 99/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#16171A] border border-[#1E2024]">
                    <span className="text-[#6F6C64] block text-[10px]">CWE-330 Entropy Check</span>
                    <span className="text-[#63C08A] font-semibold">Clean (crypto.subtle)</span>
                  </div>
                  <div className="p-2 rounded bg-[#16171A] border border-[#1E2024]">
                    <span className="text-[#6F6C64] block text-[10px]">Timing Attack Defense</span>
                    <span className="text-[#63C08A] font-semibold">constantTimeCompare()</span>
                  </div>
                  <div className="p-2 rounded bg-[#16171A] border border-[#1E2024]">
                    <span className="text-[#6F6C64] block text-[10px]">TypeScript Coverage</span>
                    <span className="text-white font-semibold">100% Strict</span>
                  </div>
                  <div className="p-2 rounded bg-[#16171A] border border-[#1E2024]">
                    <span className="text-[#6F6C64] block text-[10px]">Unit Test Harness</span>
                    <span className="text-[#63C08A] font-semibold">4 / 4 Passed (14ms)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Execution Bar */}
          <div className="border-t border-[#1E2024] bg-[#16171A] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#6F6C64] font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#63C08A]" />
              <span>Synthesized by Claude 3.7 + DeepSeek V3</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("security")}
                className="px-3 py-1 rounded border border-[#2D3036] text-[11px] font-mono text-[#A5A29A] hover:text-white hover:bg-[#1E2024] transition-colors"
              >
                Inspect Audit
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className="px-3 py-1 rounded bg-[#F5A623] text-white text-[11px] font-mono font-medium hover:bg-[#D98A12] transition-colors"
              >
                Approve & Merge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
