"use client"

import Link from "next/link"
import { ArrowUpRight, GitBranch, ShieldCheck } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-[#050608] text-[#A5A29A] py-16 px-6 border-t border-[#161820]">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-[#161820]">
          {/* Logo & Vision (2 cols) */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#16171A] border border-[#2D3036] text-white">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 1.75 14 4.5 8 7.25 2 4.5 8 1.75Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 8 8 10.75 14 8"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 11.5 8 14.25 14 11.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-sm font-bold tracking-[0.08em] text-white">
                MODEL<span className="text-[#F5A623]">VAULT</span>
              </span>
            </Link>

            <p className="text-xs text-[#6F6C64] max-w-sm leading-relaxed">
              The AI development command center. Orchestrating autonomous coding agents, visual workflows, and cloud execution with enterprise rigor.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0D0E10] border border-[#1E2024] text-[10px] font-mono text-[#63C08A]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#63C08A] animate-pulse" />
                <span>All Systems Operational (12ms)</span>
              </span>
            </div>
          </div>

          {/* Platform Columns */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white font-semibold">
              Platform
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/overview" className="hover:text-white transition-colors">
                  Command Center
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:text-white transition-colors">
                  Multi-Agent Mesh
                </Link>
              </li>
              <li>
                <Link href="/workflows" className="hover:text-white transition-colors">
                  Pipeline Studio
                </Link>
              </li>
              <li>
                <Link href="/studio" className="hover:text-white transition-colors">
                  Cloud IDE Sandbox
                </Link>
              </li>
              <li>
                <Link href="/git" className="hover:text-white transition-colors">
                  Git Operations
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Resources */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white font-semibold">
              Governance
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/subscriptions" className="hover:text-white transition-colors">
                  Subscription Tracker
                </Link>
              </li>
              <li>
                <Link href="/api-usage" className="hover:text-white transition-colors">
                  API Token Telemetry
                </Link>
              </li>
              <li>
                <Link href="/models" className="hover:text-white transition-colors">
                  Unit Economics Bench
                </Link>
              </li>
              <li>
                <Link href="/permissions" className="hover:text-white transition-colors">
                  Role-Based Access
                </Link>
              </li>
              <li>
                <Link href="/billing" className="hover:text-white transition-colors">
                  Billing & Spend Caps
                </Link>
              </li>
            </ul>
          </div>

          {/* Integrations & Security */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white font-semibold">
              Enterprise
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/integrations" className="hover:text-white transition-colors">
                  Provider Integrations
                </Link>
              </li>
              <li>
                <span className="text-[#6F6C64]">SOC2 Type II Report</span>
              </li>
              <li>
                <span className="text-[#6F6C64]">Zero-Data Retention</span>
              </li>
              <li>
                <span className="text-[#6F6C64]">Self-Hosted Runners</span>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#6F6C64]">
          <div>
            © 2026 MODELVAULT Technologies Inc. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Whitepaper</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
