"use client"

import { useState, useEffect, useRef } from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCode2,
  Lock,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

export function VerificationSection() {
  const [activeMode, setActiveMode] = useState<"vulnerable" | "remediated">("remediated")
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
      id="verification"
      ref={sectionRef}
      className="py-24 px-6 bg-[#F6F4EF] text-[#15140F] border-b border-[#E2DDD3]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E2DDD3] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#6F6C64]">
              <span className="text-[#A4610A]">05</span>
              <span>/</span>
              <span>Zero-Trust Verification</span>
            </div>
            <h2 className="text-[30px] font-display font-medium leading-[1.08] tracking-[-0.03em] sm:text-[46px] text-[#15140F] leading-tight">
              A completed task is
              <br />
              <span className="text-[#A4610A]">not a verified task.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#6F6C64] max-w-md leading-relaxed">
            LLMs generate plausible code that frequently introduces subtle security holes. MODELVAULT intercepts all agent outputs with AST static taint analysis and automated remediation loops.
          </p>
        </div>

        {/* Verification Lifecycle Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-none bg-[#FFFEFB] border border-[#E2DDD3] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#6F6C64] uppercase">
              Step 01
            </span>
            <h4 className="font-bold text-sm text-[#15140F]">Agent Generates Code</h4>
            <p className="text-xs text-[#6F6C64] leading-relaxed">
              Model synthesizes implementation based on user prompt or ticket requirements.
            </p>
            <div className="text-[10px] font-mono text-[#6F6C64] pt-2 border-t border-[#E2DDD3]">
              Output: Candidate Commit
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#FFFEFB] border border-[#E2DDD3] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#A4610A] uppercase">
              Step 02
            </span>
            <h4 className="font-bold text-sm text-[#15140F]">AST Taint Scanner</h4>
            <p className="text-xs text-[#6F6C64] leading-relaxed">
              Scans AST trees for CWE vulnerabilities, secret leaks, timing attacks, and unsafe evals.
            </p>
            <div className="text-[10px] font-mono text-[#A4610A] pt-2 border-t border-[#E2DDD3] font-semibold">
              Findings: Flagged & Blocked
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#FFFEFB] border border-[#E2DDD3] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#6F6C64] uppercase">
              Step 03
            </span>
            <h4 className="font-bold text-sm text-[#15140F]">Auto-Remediation Loop</h4>
            <p className="text-xs text-[#6F6C64] leading-relaxed">
              Targeted remediation prompt sends compiler and AST diagnostics back to the model to repair.
            </p>
            <div className="text-[10px] font-mono text-[#1F7A4D] pt-2 border-t border-[#E2DDD3] font-semibold">
              Self-Healed: In 1.2s
            </div>
          </div>

          <div className="p-5 rounded-none bg-[#FFFEFB] border border-[#E2DDD3] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#1F7A4D] uppercase">
              Step 04
            </span>
            <h4 className="font-bold text-sm text-[#15140F]">Signed Certificate</h4>
            <p className="text-xs text-[#6F6C64] leading-relaxed">
              Generates an immutable cryptographic verification receipt before PR merge approval.
            </p>
            <div className="text-[10px] font-mono text-[#1F7A4D] pt-2 border-t border-[#E2DDD3] font-semibold">
              Verified: Ready for Review
            </div>
          </div>
        </div>

        {/* Live Interactive Code Comparison Demonstration */}
        <div className="rounded-none border border-[#E2DDD3] bg-[#FFFEFB] p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2DDD3] pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#1F7A4D]" />
              <div>
                <h3 className="font-bold text-base text-[#15140F]">
                  Interactive Verification Sandbox: CWE-89 SQL Injection Check
                </h3>
                <p className="text-xs text-[#6F6C64]">
                  See how MODELVAULT detects and remediates dangerous agent code automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center rounded-lg bg-[#E2DDD3] p-1 border border-[#E2DDD3]">
              <button
                onClick={() => setActiveMode("vulnerable")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeMode === "vulnerable"
                    ? "bg-[#FFFEFB] text-[#A4610A] border border-[#E2DDD3]"
                    : "text-[#6F6C64] hover:text-[#15140F]"
                }`}
              >
                ⚠ Vulnerable Input
              </button>
              <button
                onClick={() => setActiveMode("remediated")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeMode === "remediated"
                    ? "bg-[#FFFEFB] text-[#1F7A4D] border border-[#E2DDD3]"
                    : "text-[#6F6C64] hover:text-[#15140F]"
                }`}
              >
                ✓ Remediated Output
              </button>
            </div>
          </div>

          {/* Code Box */}
          <div className="rounded-lg bg-[#0D0E10] border border-[#2D3036] p-5 font-mono text-xs leading-relaxed text-[#A5A29A]">
            {activeMode === "vulnerable" ? (
              <div className="space-y-2">
                <div className="text-[#C23B2A] flex items-center gap-2 pb-2 border-b border-[#2D3036]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>CWE-89: SQL Injection detected by MODELVAULT AST Scanner</span>
                </div>
                <div className="text-[#6F6C64]">// Agent generated unescaped query string</div>
                <div><span className="text-[#A4610A]">export async function</span> <span className="text-white">findUserByEmail</span>(email: string) {'{'}</div>
                <div className="pl-4 bg-[#F5A623]/15 text-[#C23B2A] px-2 py-1 rounded border-l-2 border-[#F5A623]">
                  - return await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = &apos;$&#123;email&#125;&apos;`);
                </div>
                <div>{'}'}</div>
                <div className="pt-2 text-[11px] text-[#C23B2A]">
                  ❌ BLOCKED: Raw string interpolation in SQL query execution. Pipeline halted.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[#63C08A] flex items-center gap-2 pb-2 border-b border-[#2D3036]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Remediated via Automated AST Correction Loop (1.2s)</span>
                </div>
                <div className="text-[#6F6C64]">// Parameterized query with compile-time type safety</div>
                <div><span className="text-[#A4610A]">export async function</span> <span className="text-white">findUserByEmail</span>(email: string) {'{'}</div>
                <div className="pl-4 bg-[#63C08A]/15 text-[#63C08A] px-2 py-1 rounded border-l-2 border-[#63C08A]">
                  + return await prisma.$queryRaw`SELECT * FROM users WHERE email = $&#123;email&#125;`;
                </div>
                <div>{'}'}</div>
                <div className="pt-2 text-[11px] text-[#63C08A]">
                  ✅ PASSED: SQL parameters safely bound. Cryptographic certificate generated: cert_9024a1.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
