"use client"

import { useState } from "react"

const FILES = [
  "src/app/api/billing/webhook/route.ts",
  "src/lib/billing/idempotency.ts",
  "tests/webhook.test.ts",
]

export function DevelopmentStudio() {
  const [selectedFile, setSelectedFile] = useState(FILES[0])
  const [bottomTab, setBottomTab] = useState<"terminal" | "activity" | "git">("terminal")
  const [mobilePane, setMobilePane] = useState<"files" | "code" | "preview" | "terminal">("code")

  return (
    <section
      id="studio"
      className="scroll-mt-20 border-b border-[var(--rig-paper-18)] py-16 sm:py-28"
    >
      <div className="rig-container">
        <div className="flex flex-col justify-between gap-6 border-b border-[var(--rig-paper-18)] pb-10 lg:flex-row lg:items-end">
          <div>
            <span className="rig-badge mb-6">Development Studio</span>
            <h2 className="rig-display text-[clamp(1.9rem,4.5vw,3.9rem)] font-bold leading-[0.95] text-[var(--rig-paper)]">
              Inspect every line, diff,
              <br />
              <span className="text-[var(--rig-paper-50)]">and running preview.</span>
            </h2>
          </div>
          <p className="max-w-md text-[0.95rem] leading-[1.68] text-[var(--rig-paper-75)]">
            File tree, code editor, live agent stream, terminal output, staged Git changes, and live sandbox preview combined in one restrained surface.
          </p>
        </div>

        {/* Mobile pane switcher */}
        <div className="mt-6 grid grid-cols-4 gap-2 lg:hidden" role="group" aria-label="Studio mobile panes">
          {(["files", "code", "preview", "terminal"] as const).map((pane) => (
            <button
              key={pane}
              type="button"
              onClick={() => setMobilePane(pane)}
              aria-pressed={mobilePane === pane}
              className={`min-h-[44px] border px-2 py-2 rig-mono text-[10.5px] uppercase tracking-[0.08em] transition-colors ${
                mobilePane === pane
                  ? "border-[var(--rig-blue)] bg-[var(--rig-blue-dim)] text-[var(--rig-paper)]"
                  : "border-[var(--rig-paper-18)] text-[var(--rig-paper-50)]"
              }`}
            >
              {pane}
            </button>
          ))}
        </div>

        {/* Studio Workspace Container */}
        <div className="mt-6 border border-[var(--rig-paper-18)] bg-[#0f1413]">
          {/* Studio Topbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rig-paper-18)] bg-[#0a0d0c] px-4 py-2.5 rig-mono text-[11px]">
            <div className="flex items-center gap-3">
              <span className="text-[var(--rig-blue)] font-bold">MV STUDIO</span>
              <span className="text-[var(--rig-paper-30)]">/</span>
              <span className="text-[var(--rig-paper)]">billing-core</span>
              <span className="hidden text-[var(--rig-paper-40)] sm:inline">
                branch: feat/webhook-idempotency
              </span>
            </div>
            <span className="hidden uppercase tracking-[0.1em] text-[var(--rig-paper-40)] sm:inline">
              Illustrative Studio Interface
            </span>
          </div>

          {/* 3-Column IDE Upper Surface */}
          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
            {/* File Explorer */}
            <div
              className={`border-b border-[var(--rig-paper-12)] bg-[#0b0f0e] p-3 lg:block lg:border-b-0 lg:border-r ${
                mobilePane !== "files" ? "hidden lg:block" : ""
              }`}
            >
              <p className="mb-2.5 px-2 rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-paper-40)]">
                Explorer
              </p>
              <div className="space-y-1">
                {FILES.map((file) => {
                  const active = selectedFile === file
                  return (
                    <button
                      key={file}
                      type="button"
                      onClick={() => {
                        setSelectedFile(file)
                        setMobilePane("code")
                      }}
                      className={`flex min-h-[44px] w-full items-center truncate px-2.5 py-1.5 text-left rig-mono text-[11px] transition-colors lg:min-h-0 ${
                        active
                          ? "border-l-2 border-[var(--rig-blue)] bg-[var(--rig-blue-dim)] text-[var(--rig-paper)]"
                          : "text-[var(--rig-paper-50)] hover:text-[var(--rig-paper)]"
                      }`}
                    >
                      {file.split("/").pop()}
                    </button>
                  )
                })}
              </div>
              <div className="mt-6 border-t border-[var(--rig-paper-12)] pt-3 px-2">
                <p className="rig-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rig-paper-40)]">
                  Git Changes (2)
                </p>
                <p className="mt-1.5 rig-mono text-[10.5px] text-[var(--rig-green)]">
                  M route.ts (+18/-4)
                </p>
                <p className="mt-1 rig-mono text-[10.5px] text-[var(--rig-blue)]">
                  A idempotency.ts
                </p>
              </div>
            </div>

            {/* Code Editor */}
            <div
              className={`border-b border-[var(--rig-paper-12)] p-4 lg:border-b-0 ${
                mobilePane !== "code" ? "hidden lg:block" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-[var(--rig-paper-12)] pb-2 rig-mono text-[10.5px] text-[var(--rig-paper-50)]">
                <span>{selectedFile}</span>
                <span>TypeScript</span>
              </div>
              <div className="space-y-1 overflow-x-auto rig-mono text-[11.5px] leading-[22px]">
                <div className="flex gap-3 text-[var(--rig-paper-50)]">
                  <span className="w-6 text-right select-none text-[#646b76]">01</span>
                  <code><span className="text-[var(--rig-blue)]">export async function</span> POST(req: Request) {"{"}</code>
                </div>
                <div className="flex gap-3 text-[var(--rig-paper-75)]">
                  <span className="w-6 text-right select-none text-[#646b76]">02</span>
                  <code>  const raw = await req.text();</code>
                </div>
                <div className="flex gap-3 bg-[#56d887]/10 text-[#a8dcb1]">
                  <span className="w-6 text-right select-none text-[#646b76]">03</span>
                  <code>  const verified = verifyWebhookSignature(raw, req.headers);</code>
                </div>
                <div className="flex gap-3 text-[var(--rig-paper-75)]">
                  <span className="w-6 text-right select-none text-[#646b76]">04</span>
                  <code>  if (!verified) return Response.json({"{"} error: &quot;Invalid&quot; {"}"}, {"{"} status: 401 {"}"});</code>
                </div>
                <div className="flex gap-3 text-[var(--rig-paper-75)]">
                  <span className="w-6 text-right select-none text-[#646b76]">05</span>
                  <code>  await processIdempotentInvoice(JSON.parse(raw));</code>
                </div>
                <div className="flex gap-3 text-[var(--rig-paper-50)]">
                  <span className="w-6 text-right select-none text-[#646b76]">06</span>
                  <code>  return Response.json({"{"} received: true {"}"});</code>
                </div>
                <div className="flex gap-3 text-[var(--rig-paper-50)]">
                  <span className="w-6 text-right select-none text-[#646b76]">07</span>
                  <code>{"}"}</code>
                </div>
              </div>
            </div>

            {/* Live Sandbox Preview */}
            <div
              className={`border-t border-[var(--rig-paper-12)] bg-[#121817] p-4 lg:border-t-0 lg:border-l ${
                mobilePane !== "preview" ? "hidden lg:block" : ""
              }`}
            >
              <div className="mb-3 flex items-center justify-between border-b border-[var(--rig-paper-12)] pb-2 rig-mono text-[10.5px]">
                <span className="text-[var(--rig-paper-50)]">LIVE PREVIEW</span>
                <span className="text-[var(--rig-green)]">:3001 ALIVE</span>
              </div>
              <div className="border border-[var(--rig-paper-18)] bg-[#161e1d] p-4">
                <div className="flex items-center justify-between border-b border-[var(--rig-paper-12)] pb-2.5">
                  <span className="rig-mono text-[10px] uppercase tracking-[0.1em] text-[var(--rig-blue)]">
                    Webhook Inspector
                  </span>
                  <span className="rig-mono text-[10px] text-[var(--rig-green)]">200 OK</span>
                </div>
                <p className="mt-3 text-[13px] font-semibold text-[var(--rig-paper)]">
                  Invoice #INV-2091 processed
                </p>
                <p className="mt-1 rig-mono text-[11px] text-[var(--rig-paper-50)]">
                  Idempotency key locked · HMAC valid
                </p>
                <div className="mt-4 border-t border-[var(--rig-paper-12)] pt-2.5 flex justify-between rig-mono text-[10.5px] text-[var(--rig-paper-40)]">
                  <span>Replay safe</span>
                  <span>14ms</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Drawer: Terminal / Agent Activity / Git */}
          <div
            className={`border-t border-[var(--rig-paper-18)] bg-[#0a0d0c] ${
              mobilePane === "terminal" ? "block" : "hidden lg:block"
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--rig-paper-12)] px-4">
              <div className="flex gap-5">
                {(
                  [
                    { id: "terminal", label: "Terminal" },
                    { id: "activity", label: "Agent Activity" },
                    { id: "git", label: "Git Changes" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setBottomTab(t.id)}
                    className={`border-b-2 py-2 rig-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                      bottomTab === t.id
                        ? "border-[var(--rig-blue)] text-[var(--rig-paper)]"
                        : "border-transparent text-[var(--rig-paper-40)] hover:text-[var(--rig-paper)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="hidden rig-mono text-[10px] text-[var(--rig-paper-40)] sm:inline">
                Sandbox Node 20
              </span>
            </div>

            <div className="p-4 rig-mono text-[11px] leading-relaxed">
              {bottomTab === "terminal" && (
                <div className="space-y-1 text-[var(--rig-paper-75)]">
                  <p className="text-[var(--rig-paper-40)]">$ npm run test -- tests/webhook.test.ts</p>
                  <p className="text-[var(--rig-green)]">PASS tests/webhook.test.ts (4 assertions in 38ms)</p>
                </div>
              )}
              {bottomTab === "activity" && (
                <div className="space-y-1 text-[var(--rig-paper-75)]">
                  <p>[14:02:11] Implementation agent edited src/app/api/billing/webhook/route.ts</p>
                  <p className="text-[var(--rig-blue)]">[14:02:13] Verifier confirmed HMAC guard before parse</p>
                </div>
              )}
              {bottomTab === "git" && (
                <div className="space-y-1 text-[var(--rig-paper-75)]">
                  <p>branch: feat/webhook-idempotency (clean index)</p>
                  <p className="text-[var(--rig-green)]">2 files staged · ready for human diff approval</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
