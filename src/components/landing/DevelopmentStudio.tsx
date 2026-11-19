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
      className="py-24 px-6 bg-[#08090A] text-white border-b border-[#1E2024]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#1E2024] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#F5A623]">04</span>
              <span>/</span>
              <span>Development Studio</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-white leading-tight">
              Full-stack workspace.
              <br />
              <span className="text-[#A5A29A]">Integrated in your browser.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#A5A29A] max-w-md leading-relaxed">
            Inspect generated code, execute commands in an isolated web container, and interact with live running applications before a single commit touches production.
          </p>
        </div>

        {/* Studio Window Mockup */}
        <div className="rounded-none border border-[#2D3036] bg-[#0D0E10] overflow-hidden">
          {/* Studio Top Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-[#1E2024] bg-[#16171A] px-4 py-2.5 gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F56]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#63C08A]/80" />
              </div>
              <div className="h-3.5 w-px bg-[#2D3036]" />
              <span className="text-xs font-mono text-white font-medium">
                MODELVAULT Studio // modevault-checkout-service
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-[#16171A] p-0.5 border border-[#242832]">
                <button
                  onClick={() => setActiveTab("code")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "code"
                      ? "bg-[#2D3036] text-white font-medium"
                      : "text-[#6F6C64] hover:text-[#A5A29A]"
                  }`}
                >
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "preview"
                      ? "bg-[#2D3036] text-white font-medium"
                      : "text-[#6F6C64] hover:text-[#A5A29A]"
                  }`}
                >
                  Live Preview
                </button>
                <button
                  onClick={() => setActiveTab("diff")}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    activeTab === "diff"
                      ? "bg-[#2D3036] text-white font-medium"
                      : "text-[#6F6C64] hover:text-[#A5A29A]"
                  }`}
                >
                  Git Diff
                </button>
              </div>

              {activeTab === "preview" && (
                <div className="hidden sm:flex items-center rounded-md bg-[#16171A] p-0.5 border border-[#242832]">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`p-1 rounded ${deviceMode === "desktop" ? "bg-[#2D3036] text-white" : "text-[#6F6C64]"}`}
                    title="Desktop"
                  >
                    <Laptop className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`p-1 rounded ${deviceMode === "mobile" ? "bg-[#2D3036] text-white" : "text-[#6F6C64]"}`}
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
            <div className="hidden md:block md:col-span-3 border-r border-[#1E2024] bg-[#0A0B0D] p-3 font-mono text-xs text-[#A5A29A] space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-[#6F6C64] font-semibold px-2">
                Project Files
              </div>
              <div className="space-y-1">
                <div className="px-2 py-1 text-white font-medium flex items-center gap-1.5">
                  <span>📁</span>
                  <span>src/app/checkout</span>
                </div>
                <div className="pl-6 py-1 text-[#63C08A] bg-[#16171A] rounded flex items-center gap-1.5 font-medium border-l-2 border-[#63C08A]">
                  <FileCode2 className="h-3 w-3" />
                  <span>page.tsx</span>
                </div>
                <div className="pl-6 py-1 text-[#A5A29A] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>action.ts</span>
                </div>
                <div className="px-2 py-1 text-white font-medium flex items-center gap-1.5 mt-2">
                  <span>📁</span>
                  <span>src/lib</span>
                </div>
                <div className="pl-6 py-1 text-[#A5A29A] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>stripe.ts</span>
                </div>
                <div className="pl-6 py-1 text-[#A5A29A] hover:text-white flex items-center gap-1.5">
                  <FileCode2 className="h-3 w-3" />
                  <span>db.ts</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E2024] px-2 text-[10px] text-[#6F6C64]">
                <div>BRANCH: feat/checkout</div>
                <div>COMMITS: 3 staged</div>
              </div>
            </div>

            {/* Code / Preview / Diff Container (9 cols) */}
            <div className="md:col-span-9 bg-[#0D0E10] flex flex-col justify-between">
              {activeTab === "code" && (
                <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-[#A5A29A] space-y-1">
                  <div className="text-[#6F6C64] pb-2 border-b border-[#1E2024] flex justify-between">
                    <span>src/app/checkout/page.tsx</span>
                    <span>UTF-8 • TSX</span>
                  </div>
                  <div><span className="text-[#F5A623]">import</span> React <span className="text-[#F5A623]">from</span> <span className="text-[#63C08A]">&apos;react&apos;</span></div>
                  <div><span className="text-[#F5A623]">import</span> {'{'} loadStripe {'}'} <span className="text-[#F5A623]">from</span> <span className="text-[#63C08A]">&apos;@stripe/stripe-js&apos;</span></div>
                  <div><span className="text-[#F5A623]">import</span> {'{'} useCheckoutStore {'}'} <span className="text-[#F5A623]">from</span> <span className="text-[#63C08A]">&apos;@/lib/store&apos;</span></div>
                  <div className="py-1"> </div>
                  <div><span className="text-[#F5A623]">export default function</span> <span className="text-[#F1EFE9]">CheckoutView</span>() {'{'}</div>
                  <div className="pl-4"><span className="text-[#F5A623]">const</span> {'{'} items, totalAmount {'}'} = useCheckoutStore()</div>
                  <div className="pl-4"><span className="text-[#F5A623]">const</span> [loading, setLoading] = React.useState(<span className="text-[#63C08A]">false</span>)</div>
                  <div className="py-1"> </div>
                  <div className="pl-4"><span className="text-[#6F6C64]">// Agent generated secure payment intent handler</span></div>
                  <div className="pl-4"><span className="text-[#F5A623]">const</span> handlePayment = <span className="text-[#F5A623]">async</span> () =&gt; {'{'}</div>
                  <div className="pl-8">setLoading(<span className="text-[#63C08A]">true</span>)</div>
                  <div className="pl-8"><span className="text-[#F5A623]">const</span> res = <span className="text-[#F5A623]">await</span> fetch(<span className="text-[#63C08A]">&apos;/api/checkout/session&apos;</span>, {'{'} method: <span className="text-[#63C08A]">&apos;POST&apos;</span> {'}'})</div>
                  <div className="pl-8"><span className="text-[#F5A623]">const</span> session = <span className="text-[#F5A623]">await</span> res.json()</div>
                  <div className="pl-8">window.location.href = session.url</div>
                  <div className="pl-4">{'}'}</div>
                  <div className="py-1"> </div>
                  <div className="pl-4"><span className="text-[#F5A623]">return</span> (</div>
                  <div className="pl-8">&lt;<span className="text-[#F5A623]">div</span> className=<span className="text-[#63C08A]">&quot;max-w-xl mx-auto p-6 space-y-4&quot;</span>&gt;</div>
                  <div className="pl-12">&lt;<span className="text-[#F5A623]">h2</span> className=<span className="text-[#63C08A]">&quot;text-lg font-bold&quot;</span>&gt;Order Summary&lt;/<span className="text-[#F5A623]">h2</span>&gt;</div>
                  <div className="pl-8">&lt;/<span className="text-[#F5A623]">div</span>&gt;</div>
                  <div className="pl-4">)</div>
                  <div>{'}'}</div>
                </div>
              )}

              {activeTab === "preview" && (
                <div className="p-6 flex items-center justify-center bg-[#0A0B0D] min-h-[360px]">
                  <div
                    className={`rounded-lg border border-[#2D3036] bg-[#FFFEFB] text-[#15140F] p-6 transition-all ${
                      deviceMode === "mobile" ? "w-[340px]" : "w-full max-w-lg"
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-[#E2DDD3] mb-4">
                      <div>
                        <div className="font-bold text-sm">Order #8042</div>
                        <div className="text-[11px] text-[#6F6C64]">Enterprise AI Seat Package</div>
                      </div>
                      <span className="font-mono text-sm font-bold text-[#F5A623]">$1,200.00</span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-xs text-[#6F6C64]">
                        <span>4x Pro Coding Agent Licenses</span>
                        <span className="font-mono">$800.00</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#6F6C64]">
                        <span>Dedicated AST Verification Cluster</span>
                        <span className="font-mono">$400.00</span>
                      </div>
                    </div>

                    <button className="w-full py-2.5 rounded-md bg-[#08090A] text-white text-xs font-semibold hover:bg-[#202020] transition-colors flex items-center justify-center gap-2">
                      <span>Authorize Payment</span>
                      <span className="text-[#F5A623]">→</span>
                    </button>
                    <div className="text-center text-[10px] text-[#6F6C64] mt-2 font-mono">
                      🔒 End-to-End Encrypted via Stripe Sandbox
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "diff" && (
                <div className="p-4 font-mono text-xs leading-relaxed space-y-1">
                  <div className="text-[#6F6C64] pb-2 border-b border-[#1E2024]">
                    Comparing <span className="text-white">feat/checkout</span> with <span className="text-white">master</span>
                  </div>
                  <div className="text-[#6F6C64]">@@ -22,4 +22,12 @@</div>
                  <div className="bg-[#F5A623]/10 text-[#EF6A57] px-2 py-0.5 rounded border-l-2 border-[#F5A623]">
                    - const res = await axios.post(&apos;/api/pay&apos;)
                  </div>
                  <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                    + const res = await fetch(&apos;/api/checkout/session&apos;, {'{'}
                  </div>
                  <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                    +   headers: {'{'} &apos;x-idempotency-key&apos;: crypto.randomUUID() {'}'}
                  </div>
                  <div className="bg-[#63C08A]/10 text-[#63C08A] px-2 py-0.5 rounded border-l-2 border-[#63C08A]">
                    + {'}'})
                  </div>
                </div>
              )}

              {/* Bottom Integrated Terminal Bar */}
              <div className="border-t border-[#1E2024] bg-[#0A0B0D] p-3 font-mono text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#6F6C64]">
                  <Terminal className="h-3.5 w-3.5 text-[#F5A623]" />
                  <span>SANDBOX SHELL: npm run test passed (0 errors) • port 3000 alive</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[#A5A29A]">
                  <span>V8 isolate: 42MB</span>
                  <span className="text-[#63C08A]">● Connected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
