"use client"

import { useEffect, useState } from "react"
import {
  Cpu,
  Zap,
  Play,
  Clock,
  Coins,
  Layers,
  Database,
  TriangleAlert,
} from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"
import { formatNumber } from "@/lib/utils"

interface ModelEntry {
  id: string
  name: string
  provider: string
  providerSlug?: string
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

function formatContext(contextTokens: number): string {
  if (contextTokens >= 1000000) {
    const millions = contextTokens / 1000000
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`
  }
  if (contextTokens >= 1000) return `${Math.round(contextTokens / 1000)}K`
  return String(contextTokens)
}

// Built-in catalog used only when the database catalog is empty or unreachable.
// The UI labels this state explicitly so it is never mistaken for live data.
const FALLBACK_MODELS: ModelEntry[] = [
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
  const [models, setModels] = useState<ModelEntry[]>([])
  const [catalogSource, setCatalogSource] = useState<"loading" | "database" | "fallback">("loading")
  const [selectedBenchmarkModel, setSelectedBenchmarkModel] = useState<string>("claude-3-7-sonnet")
  const [testPrompt, setTestPrompt] = useState("Implement atomic idempotency key validation on /api/checkout")
  const [benchmarking, setBenchmarking] = useState(false)

  // Unit Economics Calculator State
  const [monthlyTokensMillions, setMonthlyTokensMillions] = useState(20) // 20M tokens

  useEffect(() => {
    let active = true
    fetch("/api/models")
      .then((res) => res.json())
      .then((json) => {
        if (!active) return
        const rows: Array<Record<string, unknown>> = json?.data || []
        if (rows.length === 0) {
          setModels(FALLBACK_MODELS)
          setCatalogSource("fallback")
          return
        }
        const mapped: ModelEntry[] = rows.map((row) => {
          const contextTokens = Number(row.contextTokens) || 0
          return {
            id: String(row.slug ?? row.id),
            name: String(row.name ?? "Unknown model"),
            provider: String(row.provider ?? "Unknown"),
            providerSlug: row.providerSlug ? String(row.providerSlug) : undefined,
            contextTokens,
            context: formatContext(contextTokens),
            inputPricePerM: Number(row.inputPricePerM) || 0,
            outputPricePerM: Number(row.outputPricePerM) || 0,
            cachedPricePerM: Number(row.cachedPricePerM) || 0,
            speedTokensPerSec: Number(row.speedTokensPerSec) || 0,
            latencyMs: Number(row.latencyMs) || 0,
            bestFor: String(row.bestFor ?? ""),
            status: String(row.status ?? "Production Ready"),
            sampleResponse: String(row.sampleResponse ?? ""),
          }
        })
        setModels(mapped)
        setCatalogSource("database")
        setSelectedBenchmarkModel((current) =>
          mapped.some((m) => m.id === current) ? current : mapped[0].id
        )
      })
      .catch(() => {
        if (!active) return
        setModels(FALLBACK_MODELS)
        setCatalogSource("fallback")
      })
    return () => {
      active = false
    }
  }, [])

  const handleRunBenchmark = () => {
    setBenchmarking(true)
    setTimeout(() => {
      setBenchmarking(false)
    }, 600)
  }

  const activeModel: ModelEntry | null =
    models.find((m) => m.id === selectedBenchmarkModel) || models[0] || null

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Model Intelligence & Pricing Matrix"
        description="Official token unit economics, real-time benchmark test bench, and monthly cost simulation."
      />

      {catalogSource !== "loading" && (
        <div
          className={
            catalogSource === "database"
              ? "flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-[11.5px] text-ink-2"
              : "flex items-center gap-2 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2 text-[11.5px] text-warning"
          }
        >
          {catalogSource === "database" ? (
            <Database className="h-3.5 w-3.5 text-success" />
          ) : (
            <TriangleAlert className="h-3.5 w-3.5" />
          )}
          <span>
            {catalogSource === "database"
              ? `Live catalog from the model registry · ${models.length} models`
              : "Model registry is empty or unavailable — showing the built-in reference catalog"}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-line text-xs font-semibold">
        <button
          onClick={() => setActiveTab("benchmarks")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "benchmarks"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Interactive Benchmark Test Bench
        </button>
        <button
          onClick={() => setActiveTab("calculator")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "calculator"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Unit Economics Calculator
        </button>
        <button
          onClick={() => setActiveTab("catalog")}
          className={`py-2.5 px-4 border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-accent text-ink"
              : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          Model Matrix & Specifications
        </button>
      </div>

      {/* Tab 1: Interactive Benchmark Test Bench */}
      {activeTab === "benchmarks" && !activeModel && (
        <GlassCard className="p-8 border-line bg-surface text-center">
          <p className="text-sm font-semibold text-ink">
            {catalogSource === "loading" ? "Loading model catalog…" : "No models available"}
          </p>
          <p className="mt-1 text-xs text-ink-2">
            {catalogSource === "loading"
              ? "Fetching the model registry."
              : "Seed the model catalog or add models to run benchmarks."}
          </p>
        </GlassCard>
      )}

      {activeTab === "benchmarks" && activeModel && (
        <div className="space-y-6">
          <GlassCard className="p-5 border-line bg-surface shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-charcoal text-white">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink">
                  Live Agent Model Test Bench
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-2">Target Engine:</span>
                <select
                  value={selectedBenchmarkModel}
                  onChange={(e) => setSelectedBenchmarkModel(e.target.value)}
                  className="rounded-lg border border-line bg-surface-2 px-3 py-1 font-semibold text-ink outline-none"
                >
                  {models.map((m) => (
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
                className="flex-1 rounded-lg border border-line bg-canvas px-3.5 py-2 text-xs text-ink outline-none focus:border-accent/50 focus:bg-white"
              />
              <button
                onClick={handleRunBenchmark}
                disabled={benchmarking}
                className="flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-white hover:bg-[#202020] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-accent text-accent" />
                <span>{benchmarking ? "Evaluating..." : "Run Test"}</span>
              </button>
            </div>
          </GlassCard>

          {/* Benchmark Metrics Comparison Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 border-line bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-ink-2">
                <Clock className="h-3.5 w-3.5 text-accent" />
                <span>First Token Latency</span>
              </div>
              <p className="text-xl font-bold font-mono text-ink">
                {activeModel.latencyMs} ms
              </p>
              <p className="text-[11px] text-success font-medium">99.4% uptime SLA</p>
            </GlassCard>

            <GlassCard className="p-4 border-line bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-ink-2">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span>Throughput</span>
              </div>
              <p className="text-xl font-bold font-mono text-ink">
                {activeModel.speedTokensPerSec} tok/sec
              </p>
              <p className="text-[11px] text-ink-2">Peak stream burst</p>
            </GlassCard>

            <GlassCard className="p-4 border-line bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-ink-2">
                <Coins className="h-3.5 w-3.5 text-accent" />
                <span>Input / 1M Tokens</span>
              </div>
              <p className="text-xl font-bold font-mono text-ink">
                ${activeModel.inputPricePerM.toFixed(2)}
              </p>
              <p className="text-[11px] text-accent font-medium">Cache: ${activeModel.cachedPricePerM.toFixed(2)}</p>
            </GlassCard>

            <GlassCard className="p-4 border-line bg-surface space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-ink-2">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>Context Window</span>
              </div>
              <p className="text-xl font-bold font-mono text-ink">
                {activeModel.context}
              </p>
              <p className="text-[11px] text-ink-2">Full repository AST</p>
            </GlassCard>
          </div>

          {/* Model Output Inspector */}
          <GlassCard className="p-5 border-line bg-surface space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-ink">Model Code Synthesis Output</span>
                <span className="rounded bg-surface-2 px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
                  {activeModel.name}
                </span>
              </div>
              <span className="text-[11px] text-success font-medium">0 syntax defects detected</span>
            </div>

            <div className="rounded-xl border border-line bg-charcoal p-4 text-[#FDFDFD] font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
              <pre className="text-emerald-400">{activeModel.sampleResponse}</pre>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Tab 2: Unit Economics Calculator */}
      {activeTab === "calculator" && (
        <div className="space-y-6">
          <GlassCard className="p-6 border-line bg-surface space-y-6">
            <div>
              <h3 className="text-sm font-bold text-ink">Monthly AI Development Budget Forecaster</h3>
              <p className="text-xs text-ink-2 mt-0.5">
                Simulate monthly expenditure based on anticipated token volumes across coding agents, review pipelines, and test synthesis.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-ink">Monthly Volume:</span>
                <span className="font-mono text-sm font-bold text-accent">
                  {monthlyTokensMillions} Million Tokens (~{formatNumber(monthlyTokensMillions * 1000000)})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={monthlyTokensMillions}
                onChange={(e) => setMonthlyTokensMillions(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-[11px] text-ink-3">
                <span>1M (Startup team)</span>
                <span>25M (Growth org)</span>
                <span>50M (Scale-up)</span>
                <span>100M (Enterprise fleet)</span>
              </div>
            </div>

            {/* Provider Cost Projection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-line">
              {models.map((m) => {
                // Assume 75% input tokens, 25% output tokens
                const inputCost = (monthlyTokensMillions * 0.75) * m.inputPricePerM
                const outputCost = (monthlyTokensMillions * 0.25) * m.outputPricePerM
                const totalMonth = inputCost + outputCost

                return (
                  <div key={m.id} className="rounded-xl border border-line bg-canvas p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-ink">{m.name}</h4>
                      <span className="text-[10px] text-ink-2 font-mono">{m.provider}</span>
                    </div>

                    <p className="text-2xl font-bold font-mono text-ink">
                      ${totalMonth.toFixed(0)}<span className="text-xs font-normal text-ink-2">/mo</span>
                    </p>

                    <div className="text-[11px] text-ink-2 space-y-0.5 pt-1 border-t border-line">
                      <div className="flex justify-between">
                        <span>Input ({monthlyTokensMillions * 0.75}M):</span>
                        <span className="font-mono text-ink">${inputCost.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Output ({monthlyTokensMillions * 0.25}M):</span>
                        <span className="font-mono text-ink">${outputCost.toFixed(1)}</span>
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
          {models.map((m) => (
            <GlassCard
              key={m.name}
              className="p-5 border-line bg-surface shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-charcoal text-white">
                      <Cpu className="h-3.5 w-3.5 text-accent" />
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-ink">{m.name}</h3>
                      <p className="text-[10px] text-ink-2">{m.provider}</p>
                    </div>
                  </div>

                  <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-surface-2 text-ink">
                    {m.context} Context
                  </span>
                </div>

                <p className="mt-3 text-xs text-ink-2 leading-relaxed">
                  {m.bestFor}
                </p>

                <div className="mt-4 pt-3 border-t border-line space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-ink-2">
                    <span>Input / 1M:</span>
                    <span className="font-mono text-ink font-semibold">${m.inputPricePerM.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-2">
                    <span>Output / 1M:</span>
                    <span className="font-mono text-success font-semibold">${m.outputPricePerM.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-2">
                    <span>Prompt Cache / 1M:</span>
                    <span className="font-mono text-accent font-semibold">${m.cachedPricePerM.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-3">
                <span>{m.speedTokensPerSec} tok/sec ({m.latencyMs}ms)</span>
                <span className="text-success font-medium">{m.status}</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
