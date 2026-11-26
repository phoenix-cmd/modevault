"use client"

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
    <section className="border-t border-line pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
        <div>
          <h2 className="font-display text-[15px] font-medium tracking-[-0.02em] text-ink">Model pricing</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">Reference benchmark rates per million tokens.</p>
        </div>
        <span className="hidden font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 sm:block">USD · per 1M tokens</span>
      </div>

      <div className="hidden overflow-x-auto border-t border-line md:block">
        <table className="data-table">
          <caption className="sr-only">Model pricing comparison per million input, output, and cached tokens</caption>
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Context</th>
              <th className="text-right">Input</th>
              <th className="text-right">Output</th>
              <th className="hidden text-right lg:table-cell">Cached</th>
              <th className="hidden xl:table-cell">Recommended for</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model, index) => (
              <tr key={`${model.provider}-${model.model}-${index}`}>
                <td className="whitespace-nowrap font-medium text-ink">{model.provider}</td>
                <td className="whitespace-nowrap font-mono text-[11.5px] text-ink-2">{model.model}</td>
                <td className="whitespace-nowrap font-mono text-[11px] text-ink-3 tabular-nums">{model.context}</td>
                <td className="text-right font-mono text-[11px] text-ink-2 tabular-nums">{model.inputPerM}</td>
                <td className="text-right font-mono text-[11px] font-medium text-ink tabular-nums">{model.outputPerM}</td>
                <td className="hidden text-right font-mono text-[11px] text-ink-3 tabular-nums lg:table-cell">{model.cachedPerM}</td>
                <td className="hidden max-w-[220px] truncate text-ink-3 xl:table-cell">{model.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line md:hidden">
        {models.map((model, index) => (
          <div key={`${model.provider}-${model.model}-${index}`} className="border-b border-line py-3.5 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11.5px] text-ink">{model.model}</p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">{model.provider} · {model.context} context</p>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-3">
              <div>
                <p className="metric-label">Input</p>
                <p className="mt-1 font-mono text-[11px] text-ink-2 tabular-nums">{model.inputPerM}</p>
              </div>
              <div>
                <p className="metric-label">Output</p>
                <p className="mt-1 font-mono text-[11px] font-medium text-ink tabular-nums">{model.outputPerM}</p>
              </div>
              <div>
                <p className="metric-label">Cached</p>
                <p className="mt-1 font-mono text-[11px] text-ink-2 tabular-nums">{model.cachedPerM}</p>
              </div>
            </div>
            {model.bestFor && <p className="mt-2 line-clamp-2 text-[10.5px] text-ink-3">{model.bestFor}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
