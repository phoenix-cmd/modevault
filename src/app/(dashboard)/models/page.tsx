"use client"

import { Cpu, Zap, Sparkles, ExternalLink, ShieldCheck } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

export default function ModelLibraryPage() {
  const models = [
    {
      name: "Claude 3.7 Sonnet",
      provider: "Anthropic",
      context: "200K",
      inputPrice: "$3.00",
      outputPrice: "$15.00",
      cachedPrice: "$0.30",
      bestFor: "Complex software architecture, hybrid thinking, refactoring",
      speed: "Fast (45 tok/s)",
      status: "Production Ready",
    },
    {
      name: "GPT-4o",
      provider: "OpenAI",
      context: "128K",
      inputPrice: "$2.50",
      outputPrice: "$10.00",
      cachedPrice: "$1.25",
      bestFor: "Full-stack code generation, multimodal reasoning, tool use",
      speed: "Ultra-Fast (85 tok/s)",
      status: "Production Ready",
    },
    {
      name: "Gemini 2.5 Pro",
      provider: "Google",
      context: "2,000K",
      inputPrice: "$1.25",
      outputPrice: "$5.00",
      cachedPrice: "$0.31",
      bestFor: "Repository-wide context comprehension, long video/code analysis",
      speed: "Fast (60 tok/s)",
      status: "Production Ready",
    },
    {
      name: "o1 Deep Reasoning",
      provider: "OpenAI",
      context: "200K",
      inputPrice: "$15.00",
      outputPrice: "$60.00",
      cachedPrice: "$7.50",
      bestFor: "Algorithm design, concurrency bug isolation, math proofs",
      speed: "Deliberate (Thinking Mode)",
      status: "Specialized Tier",
    },
    {
      name: "Meta Llama 3.3 70B",
      provider: "OpenRouter",
      context: "128K",
      inputPrice: "$0.40",
      outputPrice: "$0.40",
      cachedPrice: "—",
      bestFor: "Cost-effective automated linting, test generation, documentation",
      speed: "Ultra-Fast (110 tok/s)",
      status: "Open Weights",
    },
    {
      name: "Sonar Pro",
      provider: "Perplexity",
      context: "200K",
      inputPrice: "$3.00",
      outputPrice: "$15.00",
      cachedPrice: "—",
      bestFor: "Live web research, API documentation citation, dependency lookup",
      speed: "Fast (55 tok/s)",
      status: "Search Augmented",
    },
  ]

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      <PageHeader
        title="Model Library & Pricing Matrix"
        description="Official token unit economics, context window benchmarks, and runtime latency profiles."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
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
                  <span className="font-mono text-[#17191C] font-semibold">{m.inputPrice}</span>
                </div>
                <div className="flex justify-between text-[#737982]">
                  <span>Output / 1M:</span>
                  <span className="font-mono text-[#1F7A4D] font-semibold">{m.outputPrice}</span>
                </div>
                <div className="flex justify-between text-[#737982]">
                  <span>Prompt Cache / 1M:</span>
                  <span className="font-mono text-[#D5222D] font-semibold">{m.cachedPrice}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E8EAED] flex items-center justify-between text-[11px] text-[#9AA0A8]">
              <span>{m.speed}</span>
              <span className="text-[#1F7A4D] font-medium">{m.status}</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
