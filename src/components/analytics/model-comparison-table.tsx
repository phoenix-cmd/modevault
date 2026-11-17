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
    <section className="panel overflow-hidden">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Model pricing</h2>
          <p className="panel-subtitle">
            Official benchmark rates per million tokens
          </p>
        </div>
        <span className="hidden text-[11px] text-ink-3 sm:block">
          USD · per 1M tokens
        </span>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="data-table">
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
                <td className="whitespace-nowrap font-medium text-ink">
                  {model.provider}
                </td>
                <td className="whitespace-nowrap font-mono text-[11.5px] text-ink-2">
                  {model.model}
                </td>
                <td className="whitespace-nowrap text-ink-3 tnum">
                  {model.context}
                </td>
                <td className="text-right text-ink-2 tnum">
                  {model.inputPerM}
                </td>
                <td className="text-right font-medium text-ink tnum">
                  {model.outputPerM}
                </td>
                <td className="hidden text-right text-ink-3 tnum lg:table-cell">
                  {model.cachedPerM}
                </td>
                <td className="hidden max-w-[220px] truncate text-ink-3 xl:table-cell">
                  {model.bestFor}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="row-divide md:hidden">
        {models.map((model, index) => (
          <div key={`${model.provider}-${model.model}-${index}`} className="px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11.5px] text-ink">
                  {model.model}
                </p>
                <p className="mt-0.5 text-[10.5px] text-ink-3">
                  {model.provider} · {model.context} context
                </p>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  Input
                </p>
                <p className="mt-0.5 text-[12px] text-ink-2 tnum">
                  {model.inputPerM}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  Output
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-ink tnum">
                  {model.outputPerM}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.06em] text-ink-3">
                  Cached
                </p>
                <p className="mt-0.5 text-[12px] text-ink-2 tnum">
                  {model.cachedPerM}
                </p>
              </div>
            </div>
            {model.bestFor && (
              <p className="mt-2 line-clamp-2 text-[10.5px] text-ink-3">
                {model.bestFor}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
