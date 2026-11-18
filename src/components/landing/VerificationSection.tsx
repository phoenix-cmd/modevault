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
      className="py-24 px-6 bg-[#F8F9FB] text-[#17191C] border-b border-[#E8EAED]"
    >
      <div ref={contentRef} className="max-w-6xl mx-auto space-y-16">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#E8EAED] pb-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-[#737982]">
              <span className="text-[#D5222D]">05</span>
              <span>/</span>
              <span>Zero-Trust Verification</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#17191C] leading-tight">
              A completed task is
              <br />
              <span className="text-[#D5222D]">not a verified task.</span>
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#5C616B] max-w-md leading-relaxed">
            LLMs generate plausible code that frequently introduces subtle security holes. MODELVAULT intercepts all agent outputs with AST static taint analysis and automated remediation loops.
          </p>
        </div>

        {/* Verification Lifecycle Walkthrough */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-[#E8EAED] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#737982] uppercase">
              Step 01
            </span>
            <h4 className="font-bold text-sm text-[#17191C]">Agent Generates Code</h4>
            <p className="text-xs text-[#5C616B] leading-relaxed">
              Model synthesizes implementation based on user prompt or ticket requirements.
            </p>
            <div className="text-[10px] font-mono text-[#737982] pt-2 border-t border-[#F2F3F5]">
              Output: Candidate Commit
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E8EAED] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#D5222D] uppercase">
              Step 02
            </span>
            <h4 className="font-bold text-sm text-[#17191C]">AST Taint Scanner</h4>
            <p className="text-xs text-[#5C616B] leading-relaxed">
              Scans AST trees for CWE vulnerabilities, secret leaks, timing attacks, and unsafe evals.
            </p>
            <div className="text-[10px] font-mono text-[#D5222D] pt-2 border-t border-[#F2F3F5] font-semibold">
              Findings: Flagged & Blocked
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E8EAED] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#737982] uppercase">
              Step 03
            </span>
            <h4 className="font-bold text-sm text-[#17191C]">Auto-Remediation Loop</h4>
            <p className="text-xs text-[#5C616B] leading-relaxed">
              Targeted remediation prompt sends compiler and AST diagnostics back to the model to repair.
            </p>
            <div className="text-[10px] font-mono text-[#1F7A4D] pt-2 border-t border-[#F2F3F5] font-semibold">
              Self-Healed: In 1.2s
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white border border-[#E8EAED] space-y-3">
            <span className="font-mono text-[10px] font-bold text-[#1F7A4D] uppercase">
              Step 04
            </span>
            <h4 className="font-bold text-sm text-[#17191C]">Signed Certificate</h4>
            <p className="text-xs text-[#5C616B] leading-relaxed">
              Generates an immutable cryptographic verification receipt before PR merge approval.
            </p>
            <div className="text-[10px] font-mono text-[#1F7A4D] pt-2 border-t border-[#F2F3F5] font-semibold">
              Verified: Ready for Review
            </div>
          </div>
        </div>

        {/* Live Interactive Code Comparison Demonstration */}
        <div className="rounded-xl border border-[#E8EAED] bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E8EAED] pb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#1F7A4D]" />
              <div>
                <h3 className="font-bold text-base text-[#17191C]">
                  Interactive Verification Sandbox: CWE-89 SQL Injection Check
                </h3>
                <p className="text-xs text-[#737982]">
                  See how MODELVAULT detects and remediates dangerous agent code automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center rounded-lg bg-[#F2F3F5] p-1 border border-[#E8EAED]">
              <button
                onClick={() => setActiveMode("vulnerable")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeMode === "vulnerable"
                    ? "bg-white text-[#D5222D] shadow-2xs border border-[#E8EAED]"
                    : "text-[#737982] hover:text-[#17191C]"
                }`}
              >
                ⚠ Vulnerable Input
              </button>
              <button
                onClick={() => setActiveMode("remediated")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  activeMode === "remediated"
                    ? "bg-white text-[#1F7A4D] shadow-2xs border border-[#E8EAED]"
                    : "text-[#737982] hover:text-[#17191C]"
                }`}
              >
                ✓ Remediated Output
              </button>
            </div>
          </div>

          {/* Code Box */}
          <div className="rounded-lg bg-[#0E1015] border border-[#2B313D] p-5 font-mono text-xs leading-relaxed text-[#A0A6AF]">
            {activeMode === "vulnerable" ? (
              <div className="space-y-2">
                <div className="text-[#FF7A85] flex items-center gap-2 pb-2 border-b border-[#2B313D]">
                  <AlertTriangle className="h-4 w-4" />
                  <span>CWE-89: SQL Injection detected by MODELVAULT AST Scanner</span>
                </div>
                <div className="text-[#5C616B]">// Agent generated unescaped query string</div>
                <div><span className="text-[#D5222D]">export async function</span> <span className="text-white">findUserByEmail</span>(email: string) {'{'}</div>
                <div className="pl-4 bg-[#D5222D]/15 text-[#FF7A85] px-2 py-1 rounded border-l-2 border-[#D5222D]">
                  - return await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = &apos;$&#123;email&#125;&apos;`);
                </div>
                <div>{'}'}</div>
                <div className="pt-2 text-[11px] text-[#FF7A85]">
                  ❌ BLOCKED: Raw string interpolation in SQL query execution. Pipeline halted.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[#54E285] flex items-center gap-2 pb-2 border-b border-[#2B313D]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Remediated via Automated AST Correction Loop (1.2s)</span>
                </div>
                <div className="text-[#5C616B]">// Parameterized query with compile-time type safety</div>
                <div><span className="text-[#D5222D]">export async function</span> <span className="text-white">findUserByEmail</span>(email: string) {'{'}</div>
                <div className="pl-4 bg-[#27C93F]/15 text-[#54E285] px-2 py-1 rounded border-l-2 border-[#27C93F]">
                  + return await prisma.$queryRaw`SELECT * FROM users WHERE email = $&#123;email&#125;`;
                </div>
                <div>{'}'}</div>
                <div className="pt-2 text-[11px] text-[#54E285]">
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
