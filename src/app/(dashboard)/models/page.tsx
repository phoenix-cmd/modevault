"use client"

import { useEffect, useState } from "react"
import { Database, Play, TriangleAlert } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatBand } from "@/components/ui/stat-band"
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

type Tab = "catalog" | "benchmarks" | "calculator"

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "catalog", label: "Catalog" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "calculator", label: "Cost calculator" },
]

export default function ModelLibraryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("catalog")
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
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      <PageHeader
        eyebrow="Intelligence · Model registry"
        title="Models"
        description="Token unit economics, latency and throughput across the models available to your workspaces."
      />

      {catalogSource !== "loading" && (
        <div
          className={
            catalogSource === "database"
              ? "flex items-center gap-2 border-y border-line py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3"
              : "flex items-center gap-2 border-y border-warning/30 py-2.5 font-mono text-[10px] uppercase tracking-[0.08em] text-warning"
          }
        >
          {catalogSource === "database" ? (
            <Database className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={1.8} />
          ) : (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
          )}
          <span>
            {catalogSource === "database"
              ? `Live catalog from the model registry · ${models.length} models`
              : "Model registry is empty or unavailable — showing the built-in reference catalog"}
          </span>
        </div>
      )}

      <section className="border-t border-line pt-5">
        <div className="-mb-px flex overflow-x-auto border-b border-line" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`-mb-px shrink-0 border-b-2 px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-ink-3 hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {activeTab === "catalog" && (
          <div className="py-5">
            {models.length === 0 ? (
              <div className="border-y border-line py-12">
                <p className="text-[13px] font-medium text-ink">
                  {catalogSource === "loading" ? "Loading model catalog…" : "No models available"}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                  {catalogSource === "loading"
                    ? "Fetching the model registry."
                    : "Seed the model catalog to compare pricing and context windows."}
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto border-t border-line md:block">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Provider</th>
                        <th className="text-right">Context</th>
                        <th className="text-right">Input / 1M</th>
                        <th className="text-right">Output / 1M</th>
                        <th className="hidden text-right lg:table-cell">Cached / 1M</th>
                        <th className="hidden text-right xl:table-cell">Speed</th>
                        <th className="hidden text-right xl:table-cell">Latency</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((m) => (
                        <tr key={m.id}>
                          <td>
                            <p className="text-[12.5px] font-medium text-ink">{m.name}</p>
                            <p className="max-w-[280px] truncate text-[11px] text-ink-3">{m.bestFor}</p>
                          </td>
                          <td className="whitespace-nowrap text-[12px] text-ink-2">{m.provider}</td>
                          <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">{m.context}</td>
                          <td className="text-right font-mono text-[11px] text-ink tabular-nums">${m.inputPricePerM.toFixed(2)}</td>
                          <td className="text-right font-mono text-[11px] text-ink tabular-nums">${m.outputPricePerM.toFixed(2)}</td>
                          <td className="hidden text-right font-mono text-[11px] text-ink-3 tabular-nums lg:table-cell">${m.cachedPricePerM.toFixed(2)}</td>
                          <td className="hidden text-right font-mono text-[11px] text-ink-2 tabular-nums xl:table-cell">{m.speedTokensPerSec} t/s</td>
                          <td className="hidden text-right font-mono text-[11px] text-ink-2 tabular-nums xl:table-cell">{m.latencyMs} ms</td>
                          <td>
                            <span className="badge bg-surface-2 text-ink-3">{m.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <ul className="border-t border-line md:hidden">
                  {models.map((m) => (
                    <li key={m.id} className="border-b border-line py-4 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink">{m.name}</p>
                          <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-3">
                            {m.provider} · {m.context} context
                          </p>
                        </div>
                        <span className="badge shrink-0 bg-surface-2 text-ink-3">{m.status}</span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-ink-2">{m.bestFor}</p>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        {[
                          ["Input", `$${m.inputPricePerM.toFixed(2)}`],
                          ["Output", `$${m.outputPricePerM.toFixed(2)}`],
                          ["Cached", `$${m.cachedPricePerM.toFixed(2)}`],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="metric-label">{label} / 1M</p>
                            <p className="mt-1 font-mono text-[11px] text-ink tabular-nums">{value}</p>
                          </div>
                        ))}
                      </div>
                      <details className="mt-2.5">
                        <summary className="cursor-pointer list-none font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3 select-none">
                          Latency &amp; throughput specs
                        </summary>
                        <div className="mt-2 space-y-1.5 border-t border-line/70 pt-2 font-mono text-[10.5px] text-ink-3">
                          <div className="flex justify-between gap-3">
                            <span>Throughput</span>
                            <span className="tabular-nums text-ink-2">{m.speedTokensPerSec} t/s</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Latency</span>
                            <span className="tabular-nums text-ink-2">{m.latencyMs} ms</span>
                          </div>
                          {m.bestFor && <p className="pt-1 font-sans text-[11.5px] text-ink-2">{m.bestFor}</p>}
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {activeTab === "benchmarks" && !activeModel && (
          <div className="border-y border-line py-12">
            <p className="text-[13px] font-medium text-ink">
              {catalogSource === "loading" ? "Loading model catalog…" : "No models available"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
              {catalogSource === "loading"
                ? "Fetching the model registry."
                : "Seed the model catalog or add models to run benchmarks."}
            </p>
          </div>
        )}

        {activeTab === "benchmarks" && activeModel && (
          <div className="space-y-8 py-5">
            <section className="border-t border-line pt-5">
              <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
                <div>
                  <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">
                    Benchmark preview
                  </h2>
                  <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                    Simulated locally · no provider request is sent
                  </p>
                </div>

                <label className="flex w-full flex-col gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                  Target
                  <select
                    value={selectedBenchmarkModel}
                    onChange={(e) => setSelectedBenchmarkModel(e.target.value)}
                    className="select select-sm w-full font-sans text-[12px] normal-case tracking-normal sm:w-auto"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
                <input
                  type="text"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  placeholder="Enter a test prompt or code refactoring challenge…"
                  className="field flex-1"
                />
                <button onClick={handleRunBenchmark} disabled={benchmarking} className="btn-primary">
                  <Play className="h-3 w-3 fill-current" strokeWidth={1.8} />
                  {benchmarking ? "Evaluating…" : "Run preview"}
                </button>
              </div>
            </section>

            <StatBand
              columns={4}
              items={[
                { label: "First token", value: `${activeModel.latencyMs} ms`, meta: "Catalog median" },
                { label: "Throughput", value: `${activeModel.speedTokensPerSec} t/s`, meta: "Peak stream burst" },
                {
                  label: "Input / 1M",
                  value: `$${activeModel.inputPricePerM.toFixed(2)}`,
                  meta: `Cached $${activeModel.cachedPricePerM.toFixed(2)}`,
                },
                { label: "Context", value: activeModel.context, meta: "Token window" },
              ]}
            />

            <section className="border-t border-line pt-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3 pb-4">
                <div>
                  <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Reference output</h2>
                  <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                    Stored sample · {activeModel.name}
                  </p>
                </div>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-ink-3">Not a live response</span>
              </div>

              <pre className="overflow-x-auto border border-line bg-canvas p-4 font-mono text-[11px] leading-relaxed text-ink-2">
                {activeModel.sampleResponse}
              </pre>
            </section>
          </div>
        )}

        {activeTab === "calculator" && (
          <div className="space-y-8 py-5">
            <section className="border-t border-line pt-5">
              <div className="pb-5">
                <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Monthly budget forecaster</h2>
                <p className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.14em] text-ink-3">
                  Simulated spend · 75% input / 25% output
                </p>
              </div>

              <div className="border-t border-line pt-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="metric-label">Monthly volume</span>
                  <span className="font-mono text-[13px] tabular-nums text-accent">
                    {monthlyTokensMillions}M tokens
                    <span className="ml-2 text-ink-3">~{formatNumber(monthlyTokensMillions * 1000000)}</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={monthlyTokensMillions}
                  onChange={(e) => setMonthlyTokensMillions(Number(e.target.value))}
                  className="mt-4 w-full accent-accent"
                />
                <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">
                  <span>1M · startup</span>
                  <span className="hidden sm:inline">25M · growth</span>
                  <span className="hidden sm:inline">50M · scale-up</span>
                  <span>100M · enterprise</span>
                </div>
              </div>
            </section>

            <div className="grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
              {models.map((m) => {
                const inputCost = monthlyTokensMillions * 0.75 * m.inputPricePerM
                const outputCost = monthlyTokensMillions * 0.25 * m.outputPricePerM
                const totalMonth = inputCost + outputCost

                return (
                  <div key={m.id} className="space-y-3 bg-surface p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-[12px] font-medium text-ink">{m.name}</h3>
                      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-3">{m.provider}</span>
                    </div>

                    <p className="font-mono text-[24px] font-medium leading-none tracking-[-0.045em] text-ink tabular-nums">
                      ${totalMonth.toFixed(0)}
                      <span className="ml-1 text-[10px] font-normal tracking-normal text-ink-3">/mo</span>
                    </p>

                    <div className="space-y-1 border-t border-line pt-3 font-mono text-[10px] text-ink-3">
                      <div className="flex justify-between gap-3">
                        <span>Input ({monthlyTokensMillions * 0.75}M)</span>
                        <span className="tabular-nums text-ink-2">${inputCost.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between gap-3">
                        <span>Output ({monthlyTokensMillions * 0.25}M)</span>
                        <span className="tabular-nums text-ink-2">${outputCost.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
