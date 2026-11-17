"use client"

import { Zap, ExternalLink } from "lucide-react"

interface ModelItem {
  provider: string
  model: string
  context: string
  inputPerM: string
  outputPerM: string
  cachedPerM: string
  bestFor: string
}

interface ModelComparisonTableProps {
  models: ModelItem[]
}

export function ModelComparisonTable({ models }: ModelComparisonTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            Market Model Economics & Token Unit Pricing
          </h2>
          <p className="text-xs text-zinc-500">
            Official benchmark rates per million tokens across leading frontier providers
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.06] glass">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-white/[0.06] bg-white/[0.02] uppercase tracking-wider text-[11px] text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-medium">Provider</th>
              <th className="px-5 py-3.5 font-medium">Model</th>
              <th className="px-5 py-3.5 font-medium">Context Window</th>
              <th className="px-5 py-3.5 font-medium text-right">Input / 1M</th>
              <th className="px-5 py-3.5 font-medium text-right">Output / 1M</th>
              <th className="px-5 py-3.5 font-medium text-right">Prompt Cache / 1M</th>
              <th className="px-5 py-3.5 font-medium">Recommended Use Case</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {models.map((m, idx) => (
              <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3 font-medium text-zinc-200">
                  {m.provider}
                </td>
                <td className="px-5 py-3 font-mono font-semibold text-violet-300">
                  {m.model}
                </td>
                <td className="px-5 py-3 font-mono text-zinc-400">{m.context}</td>
                <td className="px-5 py-3 text-right font-mono text-zinc-300">
                  {m.inputPerM}
                </td>
                <td className="px-5 py-3 text-right font-mono font-medium text-emerald-400">
                  {m.outputPerM}
                </td>
                <td className="px-5 py-3 text-right font-mono text-cyan-400">
                  {m.cachedPerM}
                </td>
                <td className="px-5 py-3 text-zinc-400">{m.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
