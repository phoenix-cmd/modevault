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
    <div className="w-full rounded-xl border border-[#2B313D] bg-[#0E1015] shadow-2xl overflow-hidden text-left">
      {/* Window Titlebar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1E222A] bg-[#12141A] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]/80" />
          </div>
          <div className="h-3.5 w-px bg-[#26282E]" />
          <div className="flex items-center gap-2 font-mono text-xs text-[#A0A6AF]">
            <GitBranch className="h-3.5 w-3.5 text-[#D5222D]" />
            <span className="text-white font-medium">modelvault</span>
            <span className="text-[#5C616B]">/</span>
            <span>feat/oauth-pkce-verifier</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1A1D24] text-[#A0A6AF] border border-[#2A2E38]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#27C93F] animate-pulse" />
            <span>3 AGENTS ACTIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[#737982]">
            <span>BURN:</span>
            <span className="text-white font-medium">4,260 tkn ($0.0134)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Agent Roster + Right Code/Inspect View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
        {/* Left Column: Live Agent Coordination (5 cols) */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1E222A] bg-[#0B0C10] p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#737982]">
                Active Agent Mesh
              </span>
              <span className="text-[11px] font-mono text-[#D5222D] flex items-center gap-1">
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
                        ? "border-[#D5222D]/60 bg-[#161820] shadow-sm"
                        : "border-[#1E222A] bg-[#12141A]/60 hover:bg-[#15171F]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">
                          {agent.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1F232B] text-[#A0A6AF]">
                          {agent.role}
                        </span>
                      </div>
                      {agent.status === "completed" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#27C93F]">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>DONE</span>
                        </span>
                      )}
                      {agent.status === "running" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#D5222D]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#D5222D] animate-ping" />
                          <span>STREAMING</span>
                        </span>
                      )}
                      {agent.status === "queued" && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-[#737982]">
                          <Clock className="h-3 w-3" />
                          <span>QUEUED</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#A0A6AF] line-clamp-2 leading-relaxed">
                      {agent.task}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#1E222A] flex items-center justify-between text-[10px] font-mono text-[#5C616B]">
                      <span>Model: {agent.model}</span>
                      <span className="text-white/80">{agent.tokens}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Execution Status Banner */}
          <div className="p-2.5 rounded-md border border-[#242933] bg-[#12141A] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#A0A6AF]">
              <ShieldCheck className="h-4 w-4 text-[#27C93F]" />
              <span className="text-[11px] font-mono">AST Gate: Enforced</span>
            </div>
            <span className="text-[10px] font-mono text-[#27C93F] bg-[#27C93F]/10 px-2 py-0.5 rounded border border-[#27C93F]/20">
              0 Violations
            </span>
          </div>
        </div>

        {/* Right Column: Code Diff / Live Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-[#0E1015] flex flex-col justify-between">
          {/* Editor Header / Tab Switcher */}
          <div className="flex items-center justify-between border-b border-[#1E222A] bg-[#12141A] px-4">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("diff")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "diff"
                    ? "border-[#D5222D] text-white font-medium bg-[#0E1015]"
                    : "border-transparent text-[#737982] hover:text-[#A0A6AF]"
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5" />
                <span>src/auth/pkce.ts</span>
              </button>

              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "terminal"
                    ? "border-[#D5222D] text-white font-medium bg-[#0E1015]"
                    : "border-transparent text-[#737982] hover:text-[#A0A6AF]"
                }`}
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Agent Logs</span>
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-1.5 py-2.5 px-3 text-xs font-mono border-b-2 transition-colors ${
                  activeTab === "security"
                    ? "border-[#D5222D] text-white font-medium bg-[#0E1015]"
                    : "border-transparent text-[#737982] hover:text-[#A0A6AF]"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-[#27C93F]" />
                <span>Verification Report</span>
              </button>
            </div>

            <span className="hidden sm:inline-block text-[10px] font-mono text-[#5C616B]">
              TypeScript 5.8 (Strict)
            </span>
          </div>

          {/* Main Content Area */}
          <div className="p-4 flex-1 font-mono text-xs overflow-x-auto leading-relaxed">
            {activeTab === "diff" && (
              <div className="space-y-1">
                <div className="text-[#5C616B] text-[11px] pb-2 border-b border-[#1E222A] flex justify-between">
                  <span>@@ -14,6 +14,19 @@ export interface PkceChallenge</span>
                  <span className="text-[#27C93F]">+13 lines added</span>
                </div>
                <div className="text-[#737982] pl-2">  method: 'S256' | 'plain';</div>
                <div className="text-[#737982] pl-2">  createdAt: Date;</div>
                <div className="text-[#737982] pl-2">{'}'}</div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  + export async function verifyCodeChallenge(
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   verifier: string,
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   challenge: string
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  + ): Promise&lt;boolean&gt; {'{'}
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   const raw = new TextEncoder().encode(verifier);
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   const hash = await crypto.subtle.digest(&apos;SHA-256&apos;, raw);
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   const computed = toBase64Url(new Uint8Array(hash));
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  +   return constantTimeCompare(computed, challenge);
                </div>
                <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                  + {'}'}
                </div>
                <div className="text-[#737982] pl-2"> </div>
              </div>
            )}

            {activeTab === "terminal" && (
              <div className="space-y-1.5 text-[11px] text-[#A0A6AF]">
                <div className="text-[#5C616B]">[23:14:02.102] ORCHESTRATOR: Execution plan generated (3 tasks)</div>
                <div className="text-[#5C616B]">[23:14:02.418] TASK_1: ArchitectAgent created schema specs (1.8s)</div>
                <div className="text-[#54E285]">[23:14:03.110] TASK_2: BackendAgent streamed src/auth/pkce.ts (2,840 tokens)</div>
                <div className="text-[#E2B755]">[23:14:03.950] TASK_3: AST Security Scanner initialized...</div>
                <div className="text-[#54E285]">[23:14:04.220] AUDIT: 0 CWE issues detected, constantTimeCompare verified</div>
                <div className="text-white flex items-center gap-2 pt-2">
                  <span className="text-[#D5222D]">modelvault&gt;</span>
                  <span>ready for review & pull request merge</span>
                  <span className="h-3 w-1.5 bg-[#D5222D] animate-pulse" />
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded bg-[#161820] border border-[#2B313D]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#27C93F]" />
                    <div>
                      <div className="text-xs font-semibold text-white">Cryptographic Verification Passed</div>
                      <div className="text-[10px] text-[#737982]">Policy: Strict Enterprise RuleSet v4</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#27C93F] bg-[#27C93F]/10 px-2 py-1 rounded">
                    Score 99/100
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-[#12141A] border border-[#1E222A]">
                    <span className="text-[#737982] block text-[10px]">CWE-330 Entropy Check</span>
                    <span className="text-[#27C93F] font-semibold">Clean (crypto.subtle)</span>
                  </div>
                  <div className="p-2 rounded bg-[#12141A] border border-[#1E222A]">
                    <span className="text-[#737982] block text-[10px]">Timing Attack Defense</span>
                    <span className="text-[#27C93F] font-semibold">constantTimeCompare()</span>
                  </div>
                  <div className="p-2 rounded bg-[#12141A] border border-[#1E222A]">
                    <span className="text-[#737982] block text-[10px]">TypeScript Coverage</span>
                    <span className="text-white font-semibold">100% Strict</span>
                  </div>
                  <div className="p-2 rounded bg-[#12141A] border border-[#1E222A]">
                    <span className="text-[#737982] block text-[10px]">Unit Test Harness</span>
                    <span className="text-[#27C93F] font-semibold">4 / 4 Passed (14ms)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Execution Bar */}
          <div className="border-t border-[#1E222A] bg-[#12141A] px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#737982] font-mono text-[11px]">
              <span className="h-2 w-2 rounded-full bg-[#27C93F]" />
              <span>Synthesized by Claude 3.7 + DeepSeek V3</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("security")}
                className="px-3 py-1 rounded border border-[#2B313D] text-[11px] font-mono text-[#A0A6AF] hover:text-white hover:bg-[#1A1D24] transition-colors"
              >
                Inspect Audit
              </button>
              <button
                onClick={() => setActiveTab("diff")}
                className="px-3 py-1 rounded bg-[#D5222D] text-white text-[11px] font-mono font-medium hover:bg-[#B81C25] transition-colors shadow-xs"
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
