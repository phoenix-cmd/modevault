"use client"

import { useState, useEffect, useRef } from "react"
import {
  Code2,
  Cpu,
  Eye,
  FileCode2,
  FolderGit2,
  GitBranch,
  Laptop,
  Maximize2,
  Play,
  RotateCw,
  Search,
  Smartphone,
  SplitSquareVertical,
  Terminal,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

export function DevelopmentStudio() {
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "diff">("code")
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop")
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = createScrollObserver(sectionRef.current, () => {
      if (contentRef.current) {
        animateFadeUp(contentRef.current, 0, 700)
      }
    })
    return cleanup
  }, [])

  return (
    <section
      id="studio"
      ref={sectionRef}
      className="py-24 px-6 bg-[#08090C] text-white border-b border-[#1E222A]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1E222A] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#737982]">
              <span className="text-[#D5222D]">04</span>
              <span>/</span>
              <span>Development Studio</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Full-stack workspace.
              <br />
              <span className="text-[#8E95A2]">Integrated in your browser.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#8E95A2] max-w-md leading-relaxed">
            Inspect generated code, execute commands in an isolated web container, and interact with live running applications before a single commit touches production.
          </p>
        </div>

        {/* Studio Window Mockup */}
        <div className="rounded-xl border border-[#2B313D] bg-[#0E1015] shadow-2xl overflow-hidden">
          {/* Studio Top Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#1E222A] bg-[#12141A] px-4 py-2.5 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#27C93F]/80" />
              </div>
              <div className="h-3.5 w-px bg-[#26282E]" />
              <span className="text-xs font-mono text-white font-medium">
                MODELVAULT Studio // modevault-checkout-service
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-[#181B22] p-0.5 border border-[#242832]">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "code"
                      ? "bg-[#262A34] text-white font-medium"
                      : "text-[#737982] hover:text-[#A0A6AF]"
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "preview"
                      ? "bg-[#262A34] text-white font-medium"
                      : "text-[#737982] hover:text-[#A0A6AF]"
                  }`}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "diff"
                      ? "bg-[#262A34] text-white font-medium"
                      : "text-[#737982] hover:text-[#A0A6AF]"
                  }`}
                >
                  Git Diff
                </button>
              </div>

              {activeTab === "preview" && (
                <div className="hidden sm:flex items-center rounded-md bg-[#181B22] p-0.5 border border-[#242832]">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1 rounded ${deviceMode === "desktop" ? "bg-[#262A34] text-white" : "text-[#737982]"}`}
                    title="Desktop"
                  >
                    <Laptop className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1 rounded ${deviceMode === "mobile" ? "bg-[#262A34] text-white" : "text-[#737982]"}`}
                    title="Mobile"
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main IDE Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
            {/* File Tree Explorer (3 cols) */}
            <div className="hidden md:block md:col-span-3 border-r border-[#1E222A] bg-[#0A0B0E] p-3 font-mono text-xs text-[#8E95A2] space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-[#5C616B] font-semibold px-2">
                Project Files
              </div>
              <div className="space-y-1">
                <div className="px-2 py-1 text-white font-medium flex items-center gap-1.5">
                  <span>📁</span>
                  <span>src/app/checkout</span>
                </div>
                <div className="pl-6 py-1 text-[#27C93F] bg-[#161822] rounded flex items-center gap-1.5 font-medium border-l-2 border-[#27C93F]">
                  <FileCode2 className="h-3 w-3" />
                  <span>page.tsx</span>
                </div>
                <div className="pl-6 py-1 text-[#8E95A2] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>action.ts</span>
                </div>
                <div className="px-2 py-1 text-white font-medium flex items-center gap-1.5 mt-2">
                  <span>📁</span>
                  <span>src/lib</span>
                </div>
                <div className="pl-6 py-1 text-[#8E95A2] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>stripe.ts</span>
                </div>
                <div className="pl-6 py-1 text-[#8E95A2] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>db.ts</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E222A] px-2 text-[10px] text-[#5C616B]">
                <div>BRANCH: feat/checkout</div>
                <div>COMMITS: 3 staged</div>
              </div>
            </div>

            {/* Code / Preview / Diff Container (9 cols) */}
            <div className="md:col-span-9 bg-[#0E1015] flex flex-col justify-between">
              {activeTab === "code" && (
                <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-[#A0A6AF] space-y-1">
                  <div className="text-[#5C616B] pb-2 border-b border-[#1E222A] flex justify-between">
                    <span>src/app/checkout/page.tsx</span>
                    <span>UTF-8 • TSX</span>
                  </div>
                  <div><span className="text-[#D5222D]">import</span> React <span className="text-[#D5222D]">from</span> <span className="text-[#27C93F]">&apos;react&apos;</span></div>
                  <div><span className="text-[#D5222D]">import</span> {'{'} loadStripe {'}'} <span className="text-[#D5222D]">from</span> <span className="text-[#27C93F]">&apos;@stripe/stripe-js&apos;</span></div>
                  <div><span className="text-[#D5222D]">import</span> {'{'} useCheckoutStore {'}'} <span className="text-[#D5222D]">from</span> <span className="text-[#27C93F]">&apos;@/lib/store&apos;</span></div>
                  <div className="py-1"> </div>
                  <div><span className="text-[#D5222D]">export default function</span> <span className="text-[#E0E2E8]">CheckoutView</span>() {'{'}</div>
                  <div className="pl-4"><span className="text-[#D5222D]">const</span> {'{'} items, totalAmount {'}'} = useCheckoutStore()</div>
                  <div className="pl-4"><span className="text-[#D5222D]">const</span> [loading, setLoading] = React.useState(<span className="text-[#27C93F]">false</span>)</div>
                  <div className="py-1"> </div>
                  <div className="pl-4"><span className="text-[#5C616B]">// Agent generated secure payment intent handler</span></div>
                  <div className="pl-4"><span className="text-[#D5222D]">const</span> handlePayment = <span className="text-[#D5222D]">async</span> () =&gt; {'{'}</div>
                  <div className="pl-8">setLoading(<span className="text-[#27C93F]">true</span>)</div>
                  <div className="pl-8"><span className="text-[#D5222D]">const</span> res = <span className="text-[#D5222D]">await</span> fetch(<span className="text-[#27C93F]">&apos;/api/checkout/session&apos;</span>, {'{'} method: <span className="text-[#27C93F]">&apos;POST&apos;</span> {'}'})</div>
                  <div className="pl-8"><span className="text-[#D5222D]">const</span> session = <span className="text-[#D5222D]">await</span> res.json()</div>
                  <div className="pl-8">window.location.href = session.url</div>
                  <div className="pl-4">{'}'}</div>
                  <div className="py-1"> </div>
                  <div className="pl-4"><span className="text-[#D5222D]">return</span> (</div>
                  <div className="pl-8">&lt;<span className="text-[#E2B755]">div</span> className=<span className="text-[#27C93F]">&quot;max-w-xl mx-auto p-6 space-y-4&quot;</span>&gt;</div>
                  <div className="pl-12">&lt;<span className="text-[#E2B755]">h2</span> className=<span className="text-[#27C93F]">&quot;text-lg font-bold&quot;</span>&gt;Order Summary&lt;/<span className="text-[#E2B755]">h2</span>&gt;</div>
                  <div className="pl-8">&lt;/<span className="text-[#E2B755]">div</span>&gt;</div>
                  <div className="pl-4">)</div>
                  <div>{'}'}</div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="p-6 flex items-center justify-center bg-[#090A0D] min-h-[360px]">
                  <div
                    className={`rounded-lg border border-[#2B313D] bg-white text-[#17191C] p-6 shadow-xl transition-all ${
                      deviceMode === "mobile" ? "w-[340px]" : "w-full max-w-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#E8EAED] mb-4">
                      <div>
                        <div className="font-bold text-sm">Order #8042</div>
                        <div className="text-[11px] text-[#737982]">Enterprise AI Seat Package</div>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#D5222D]">$1,200.00</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs text-[#5C616B]">
                        <span>4x Pro Coding Agent Licenses</span>
                        <span className="font-mono">$800.00</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#5C616B]">
                        <span>Dedicated AST Verification Cluster</span>
                        <span className="font-mono">$400.00</span>
                      </div>
                    </div>

                    <button className="w-full py-2.5 rounded-md bg-[#08090C] text-white text-xs font-semibold hover:bg-[#202020] transition-colors flex items-center justify-center gap-2">
                      <span>Authorize Payment</span>
                      <span className="text-[#D5222D]">→</span>
                    </button>
                    <div className="text-center text-[10px] text-[#737982] mt-2 font-mono">
                      🔒 End-to-End Encrypted via Stripe Sandbox
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "diff" && (
                <div className="p-4 font-mono text-xs leading-relaxed space-y-1">
                  <div className="text-[#5C616B] pb-2 border-b border-[#1E222A]">
                    Comparing <span className="text-white">feat/checkout</span> with <span className="text-white">master</span>
                  </div>
                  <div className="text-[#737982]">@@ -22,4 +22,12 @@</div>
                  <div className="bg-[#D5222D]/10 text-[#FF7A85] px-2 py-0.5 rounded border-l-2 border-[#D5222D]">
                    - const res = await axios.post(&apos;/api/pay&apos;)
                  </div>
                  <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                    + const res = await fetch(&apos;/api/checkout/session&apos;, {'{'}
                  </div>
                  <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                    +   headers: {'{'} &apos;x-idempotency-key&apos;: crypto.randomUUID() {'}'}
                  </div>
                  <div className="bg-[#27C93F]/10 text-[#54E285] px-2 py-0.5 rounded border-l-2 border-[#27C93F]">
                    + {'}'})
                  </div>
                </div>
              )}

              {/* Bottom Integrated Terminal Bar */}
              <div className="border-t border-[#1E222A] bg-[#0A0B0E] p-3 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#737982]">
                  <Terminal className="h-3.5 w-3.5 text-[#D5222D]" />
                  <span>SANDBOX SHELL: npm run test passed (0 errors) • port 3000 alive</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#A0A6AF]">
                  <span>V8 isolate: 42MB</span>
                  <span className="text-[#27C93F]">● Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
