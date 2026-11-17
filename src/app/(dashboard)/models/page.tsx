"use client"

import { useState } from "react"
import {
  Cpu,
  Zap,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Play,
  Clock,
  Coins,
  CheckCircle2,
  Sliders,
  Layers,
  ArrowRight,
  TrendingDown,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { formatNumber, formatCurrency } from "@/lib/utils"

interface ModelEntry {
  id: string
  name: string
  provider: string
  context: string
  contextTokens: number
  inputPricePerM: number
  outputPricePerM: number
  cachedPricePerM: number
  speedTokensPerSec: number
  latencyMs: number
  bestFor: string
  status: string
  sampleResponse: string
}

const MODELS: ModelEntry[] = [
  {
    id: "claude-3-7-sonnet",
    name: "Claude 3.7 Sonnet",
    provider: "Anthropic",
    context: "200K",
    contextTokens: 200000,
    inputPricePerM: 3.0,
    outputPricePerM: 15.0,
    cachedPricePerM: 0.3,
    speedTokensPerSec: 52,
    latencyMs: 820,
    bestFor: "Complex software architecture, hybrid thinking, refactoring & AST analysis",
    status: "Production Ready",
    sampleResponse: `// Claude 3.7 Sonnet: Atomic Idempotency Middleware
export async function withIdempotency(req: NextRequest, handler: Function) {
  const key = req.headers.get("Idempotency-Key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  const lock = await prisma.idempotencyRecord.create({ data: { key, status: "pending" } });
  try {
    const res = await handler(req);
    await prisma.idempotencyRecord.update({ where: { key }, data: { status: "completed", response: JSON.stringify(res) } });
    return res;
  } catch (err) {
    await prisma.idempotencyRecord.delete({ where: { key } });
    throw err;
  }
}`,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    context: "128K",
    contextTokens: 128000,
    inputPricePerM: 2.5,
    outputPricePerM: 10.0,
    cachedPricePerM: 1.25,
    speedTokensPerSec: 88,
    latencyMs: 510,
    bestFor: "Full-stack code generation, multimodal reasoning, tool calling, real-time chat",
    status: "Production Ready",
    sampleResponse: `// GPT-4o: Resilient Deduplication Handler
export async function handleCheckout(req: NextRequest) {
  const idempotencyKey = req.headers.get("Idempotency-Key");
  if (!idempotencyKey) return NextResponse.json({ error: "Key required" }, { status: 400 });
  const existing = await cache.get(idempotencyKey);
  if (existing) return NextResponse.json(JSON.parse(existing));
  const result = await processPayment(await req.json());
  await cache.set(idempotencyKey, JSON.stringify(result), "EX", 120);
  return NextResponse.json(result, { status: 201 });
}`,
  },
  {
    id: "gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    context: "2,000K",
    contextTokens: 2000000,
    inputPricePerM: 1.25,
    outputPricePerM: 5.0,
    cachedPricePerM: 0.31,
    speedTokensPerSec: 64,
    latencyMs: 740,
    bestFor: "Repository-wide context comprehension, long video/audio analysis, cross-file AST",
    status: "Production Ready",
    sampleResponse: `// Gemini 2.5 Pro: Whole-Repository Context Aware Lock
export class IdempotentSessionManager {
  constructor(private readonly prisma: PrismaClient) {}
  async executeIdempotent<T>(key: string, fn: () => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      const prior = await tx.billingRecord.findUnique({ where: { idempotencyKey: key } });
      if (prior) return JSON.parse(prior.cachedPayload) as T;
      const data = await fn();
      await tx.billingRecord.create({ data: { idempotencyKey: key, cachedPayload: JSON.stringify(data) } });
      return data;
    });
  }
}`,
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "OpenRouter",
    context: "128K",
    contextTokens: 128000,
    inputPricePerM: 0.27,
    outputPricePerM: 1.1,
    cachedPricePerM: 0.07,
    speedTokensPerSec: 72,
    latencyMs: 620,
    bestFor: "Extreme cost efficiency, high-volume code generation, automated test suites",
    status: "Open Weights",
    sampleResponse: `// DeepSeek V3: Ultra Low-Cost Token Handler
export async function verifyTokenBudget(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });
  const session = await db.tokens.findFirst({ where: { token, valid: true } });
  return session ? new Response("OK") : new Response("Forbidden", { status: 403 });
}`,
  },
]

export default function ModelLibraryPage() {
  const [activeTab, setActiveTab] = useState<"catalog" | "benchmarks" | "calculator">("benchmarks")
  const [selectedBenchmarkModel, setSelectedBenchmarkModel] = useState<string>("claude-3-7-sonnet")
  const [testPrompt, setTestPrompt] = useState("Implement atomic idempotency key validation on /api/checkout")
  const [benchmarking, setBenchmarking] = useState(false)

  // Unit Economics Calculator State
  const [monthlyTokensMillions, setMonthlyTokensMillions] = useState(20) // 20M tokens

  const handleRunBenchmark = () => {
    setBenchmarking(true)
    setTimeout(() => {
      setBenchmarking(false)
    }, 600)
  }

  const activeModel = MODELS.find((m) => m.id === selectedBenchmarkModel) || MODELS[0]

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Model Intelligence & Pricing Matrix"
        description="Official token unit economics, real-time benchmark test bench, and monthly cost simulation."
      />

      {/* Tabs */}
      <div className="flex border-b border-[#E8EAED] text-xs font-semibold">
        <button
          onClick={() => setActiveTab("benchmarks")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "benchmarks"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Interactive Benchmark Test Bench
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "calculator"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Unit Economics Calculator
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-[#D5222D] text-[#17191C]"
              : "border-transparent text-[#737982] hover:text-[#17191C]"
          }`}
        >
          Model Matrix & Specifications
        </button>
      </div>

      {/* Tab 1: Interactive Benchmark Test Bench */}
      {activeTab === "benchmarks" && (
        <div className="space-y-6">
          <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8EAED]">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#040404] text-white">
                  <Zap className="h-3.5 w-3.5 text-[#D5222D]" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#17191C]">
                  Live Agent Model Test Bench
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#737982]">Target Engine:</span>
                <select
                  value={selectedBenchmarkModel}
                  onChange={(e) => setSelectedBenchmarkModel(e.target.value)}
                  className="rounded-lg border border-[#E8EAED] bg-[#F2F3F5] px-3 py-1 font-semibold text-[#17191C] outline-none"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.provider})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="Enter test prompt or pick code refactoring challenge..."
                className="flex-1 rounded-lg border border-[#E8EAED] bg-[#F8F9FB] px-3.5 py-2 text-xs text-[#17191C] outline-none focus:border-[#D5222D]/50 focus:bg-white"
              />
              <button
                onClick={handleRunBenchmark}
                disabled={benchmarking}
                className="flex items-center gap-1.5 rounded-lg bg-[#040404] px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-[#D5222D] text-[#D5222D]" />
                <span>{benchmarking ? "Evaluating..." : "Run Test"}</span>
              </button>
            </div>
          </GlassCard>

          {/* Benchmark Metrics Comparison Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#737982]">
                <Clock className="h-3.5 w-3.5 text-[#D5222D]" />
                <span>First Token Latency</span>
              </div>
              <p className="text-xl font-bold font-mono text-[#17191C]">
                {activeModel.latencyMs} ms
              </p>
              <p className="text-[11px] text-[#1F7A4D] font-medium">99.4% uptime SLA</p>
            </GlassCard>

            <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#737982]">
                <Zap className="h-3.5 w-3.5 text-[#D5222D]" />
                <span>Throughput</span>
              </div>
              <p className="text-xl font-bold font-mono text-[#17191C]">
                {activeModel.speedTokensPerSec} tok/sec
              </p>
              <p className="text-[11px] text-[#737982]">Peak stream burst</p>
            </GlassCard>

            <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#737982]">
                <Coins className="h-3.5 w-3.5 text-[#D5222D]" />
                <span>Input / 1M Tokens</span>
              </div>
              <p className="text-xl font-bold font-mono text-[#17191C]">
                ${activeModel.inputPricePerM.toFixed(2)}
              </p>
              <p className="text-[11px] text-[#D5222D] font-medium">Cache: ${activeModel.cachedPricePerM.toFixed(2)}</p>
            </GlassCard>

            <GlassCard className="p-4 border-[#E8EAED] bg-[#FFFFFF] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-[#737982]">
                <Layers className="h-3.5 w-3.5 text-[#D5222D]" />
                <span>Context Window</span>
              </div>
              <p className="text-xl font-bold font-mono text-[#17191C]">
                {activeModel.context}
              </p>
              <p className="text-[11px] text-[#737982]">Full repository AST</p>
            </GlassCard>
          </div>

          {/* Model Output Inspector */}
          <GlassCard className="p-5 border-[#E8EAED] bg-[#FFFFFF] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8EAED]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#17191C]">Model Code Synthesis Output</span>
                <span className="rounded bg-[#F2F3F5] px-2 py-0.5 text-[10px] font-mono font-bold text-[#17191C]">
                  {activeModel.name}
                </span>
              </div>
              <span className="text-[11px] text-[#1F7A4D] font-medium">0 syntax defects detected</span>
            </div>

            <div className="rounded-xl border border-[#E8EAED] bg-[#040404] p-4 text-[#FDFDFD] font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
              <pre className="text-emerald-400">{activeModel.sampleResponse}</pre>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 2: Unit Economics Calculator */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <GlassCard className="p-6 border-[#E8EAED] bg-[#FFFFFF] space-y-6">
            <div>
              <h3 className="text-sm font-bold text-[#17191C]">Monthly AI Development Budget Forecaster</h3>
              <p className="text-xs text-[#737982] mt-0.5">
                Simulate monthly expenditure based on anticipated token volumes across coding agents, review pipelines, and test synthesis.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-[#17191C]">Monthly Volume:</span>
                <span className="font-mono text-sm font-bold text-[#D5222D]">
                  {monthlyTokensMillions} Million Tokens (~{formatNumber(monthlyTokensMillions * 1000000)})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={monthlyTokensMillions}
                onChange={(e) => setMonthlyTokensMillions(Number(e.target.value))}
                className="w-full accent-[#D5222D]"
              />
              <div className="flex justify-between text-[11px] text-[#9AA0A8]">
                <span>1M (Startup team)</span>
                <span>25M (Growth org)</span>
                <span>50M (Scale-up)</span>
                <span>100M (Enterprise fleet)</span>
              </div>
            </div>

            {/* Provider Cost Projection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-[#E8EAED]">
              {MODELS.map((m) => {
                // Assume 75% input tokens, 25% output tokens
                const inputCost = (monthlyTokensMillions * 0.75) * m.inputPricePerM
                const outputCost = (monthlyTokensMillions * 0.25) * m.outputPricePerM
                const totalMonth = inputCost + outputCost

                return (
                  <div key={m.id} className="rounded-xl border border-[#E8EAED] bg-[#F8F9FB] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#17191C]">{m.name}</h4>
                      <span className="text-[10px] text-[#737982] font-mono">{m.provider}</span>
                    </div>

                    <p className="text-2xl font-bold font-mono text-[#17191C]">
                      ${totalMonth.toFixed(0)}<span className="text-xs font-normal text-[#737982]">/mo</span>
                    </p>

                    <div className="text-[11px] text-[#737982] space-y-0.5 pt-1 border-t border-[#E8EAED]">
                      <div className="flex justify-between">
                        <span>Input ({monthlyTokensMillions * 0.75}M):</span>
                        <span className="font-mono text-[#17191C]">${inputCost.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Output ({monthlyTokensMillions * 0.25}M):</span>
                        <span className="font-mono text-[#17191C]">${outputCost.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 3: Model Matrix & Specifications */}
      {activeTab === "catalog" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODELS.map((m) => (
            <GlassCard
              key={m.name}
              className="p-5 border-[#E8EAED] bg-[#FFFFFF] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#040404] text-white">
                      <Cpu className="h-3.5 w-3.5 text-[#D5222D]" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-[#17191C]">{m.name}</h3>
                      <p className="text-[10px] text-[#737982]">{m.provider}</p>
                    </div>
                  </div>

                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#F2F3F5] text-[#17191C]">
                    {m.context} Context
                  </span>
                </div>

                <p className="mt-3 text-xs text-[#737982] leading-relaxed">
                  {m.bestFor}
                </p>

                <div className="mt-4 pt-3 border-t border-[#E8EAED] space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-[#737982]">
                    <span>Input / 1M:</span>
                    <span className="font-mono text-[#17191C] font-semibold">${m.inputPricePerM.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#737982]">
                    <span>Output / 1M:</span>
                    <span className="font-mono text-[#1F7A4D] font-semibold">${m.outputPricePerM.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#737982]">
                    <span>Prompt Cache / 1M:</span>
                    <span className="font-mono text-[#D5222D] font-semibold">${m.cachedPricePerM.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E8EAED] flex items-center justify-between text-[11px] text-[#9AA0A8]">
                <span>{m.speedTokensPerSec} tok/sec ({m.latencyMs}ms)</span>
                <span className="text-[#1F7A4D] font-medium">{m.status}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
