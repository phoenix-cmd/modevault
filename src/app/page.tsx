"use client"

import Link from "next/link"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  FolderGit2,
  GitBranch,
  Layers,
  Play,
  ShieldCheck,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent/15 selection:text-ink">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-charcoal text-[#FDFDFD] shadow-sm">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
            <span className="text-sm font-bold tracking-[0.08em] text-ink">
              MODEL<span className="text-accent">VAULT</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-ink-2">
            <Link href="#agents" className="hover:text-ink transition-colors">Agents</Link>
            <Link href="#workflows" className="hover:text-ink transition-colors">Workflows</Link>
            <Link href="#diff-review" className="hover:text-ink transition-colors">Code Review</Link>
            <Link href="#intelligence" className="hover:text-ink transition-colors">Resource Intelligence</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/overview"
              className="flex items-center gap-1.5 rounded-lg bg-charcoal px-4 py-2 text-xs font-semibold text-[#FDFDFD] hover:bg-[#202020] active:scale-[0.98] transition-all shadow-sm"
            >
              <span>Launch Command Center</span>
              <ArrowRight className="h-3.5 w-3.5 text-accent" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1 text-xs font-semibold text-ink shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span>Next-Generation AI Software Development Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-ink max-w-4xl mx-auto leading-[1.08]">
          Your AI team. <br className="hidden sm:inline" />
          <span className="text-accent">One command center.</span>
        </h1>

        <p className="text-base sm:text-lg text-ink-2 max-w-2xl mx-auto leading-relaxed">
          Orchestrate multi-agent coding teams, automate visual development workflows, inspect live AST diffs, and audit token expenditures from a single intelligent workspace.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href="/overview"
            className="flex items-center gap-2 rounded-xl bg-charcoal px-6 py-3 text-sm font-semibold text-[#FDFDFD] hover:bg-[#202020] active:scale-[0.98] transition-all shadow-md"
          >
            <span>Open Command Center</span>
            <ArrowRight className="h-4 w-4 text-accent" />
          </Link>
          <Link
            href="/agents"
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-2 transition-all shadow-xs"
          >
            <Bot className="h-4 w-4 text-ink-2" />
            <span>Explore Coding Agents</span>
          </Link>
        </div>

        {/* Hero Interactive Command Center Showcase */}
        <div className="mt-12 rounded-2xl border border-line bg-surface p-2 shadow-xl overflow-hidden max-w-5xl mx-auto">
          <div className="rounded-xl border border-line bg-charcoal text-[#FDFDFD] p-5 text-left font-mono text-xs overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.1] text-zinc-400 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="ml-2 font-semibold text-white">MODELVAULT Orchestrator v1.0.0</span>
              </div>
              <span className="text-success">DAG Status: Optimal</span>
            </div>

            <div className="mt-4 space-y-2 text-[11.5px] leading-relaxed">
              <p className="text-muted-slate">$ modelvault dispatch --team &quot;fullstack-duo&quot; --task &quot;Add idempotency lock on checkout&quot;</p>
              <p className="text-success">✓ Cloud sandbox container provisioned (port :3001, nodejs-20)</p>
              <p className="text-zinc-300">
                <span className="text-accent">[Claude Code 3.7]</span> Analyzed AST for 42 repository files in 180ms
              </p>
              <p className="text-zinc-300">
                <span className="text-[#3B82F6]">[Codex 5.2]</span> Synthesized IdempotencyRecord database wrapper and atomic middleware (+32 lines)
              </p>
              <p className="text-zinc-300">
                <span className="text-[#06B6D4]">[OpenCode QA]</span> Executed test assertions: 8 passed, 0 failures. Diff ready for approval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars Section */}
      <section id="agents" className="py-20 bg-surface border-t border-line">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink">
              Engineered for Autonomous Software Teams
            </h2>
            <p className="text-sm text-ink-2">
              Combine frontier AI coding agents with real git worktrees, persistent cloud sandboxes, and mandatory human approval gates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-line bg-canvas p-6 space-y-3 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-charcoal text-white flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink">Universal Agent Registry</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Connect Claude Code, Codex, Gemini CLI, Cursor Cloud, and Aider through a single standardized adapter interface.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-canvas p-6 space-y-3 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-charcoal text-white flex items-center justify-center">
                <Workflow className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink">Visual DAG Automation</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Design multi-agent development pipelines visually with React Flow. Chain architects, developers, testers, and reviewers.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-canvas p-6 space-y-3 shadow-xs">
              <div className="h-9 w-9 rounded-lg bg-charcoal text-white flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-accent" />
              </div>
              <h3 className="text-base font-bold text-ink">Zero-Risk Human Gateways</h3>
              <p className="text-xs text-ink-2 leading-relaxed">
                Every code mutation is isolated in a Git worktree. Review side-by-side diffs and enforce approval before merging into main.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-surface py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">MODELVAULT</span>
            <span>•</span>
            <span>Your AI ecosystem. One command center.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/overview" className="hover:text-ink">Command Center</Link>
            <Link href="/projects" className="hover:text-ink">Projects</Link>
            <Link href="/agents" className="hover:text-ink">Agent Center</Link>
            <Link href="/settings" className="hover:text-ink">Settings</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
