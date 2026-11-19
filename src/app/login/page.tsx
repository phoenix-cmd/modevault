"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("demo@modelvault.dev")
  const [password, setPassword] = useState("password")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || "Login failed")
        return
      }
      router.push("/overview")
      router.refresh()
    } catch {
      setError("Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mkt min-h-screen">
      <div className="mkt-container flex min-h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--mkt-line)]">
          <Link href="/" className="flex items-center gap-3 text-[var(--mkt-ink)]">
            <span className="inline-flex h-7 w-7 items-center justify-center border border-[var(--mkt-line-strong)] bg-[var(--mkt-paper)]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="3.5" cy="8" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="12.5" cy="4" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="12.5" cy="12" r="1.25" stroke="currentColor" strokeWidth="1.2" />
                <path d="M4.7 7.4 11.3 4.7M4.7 8.6l6.6 2.7M12.5 5.3v5.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-display text-[15px] font-medium tracking-[-0.02em]">Modelvault</span>
          </Link>
          <Link href="/register" className="mkt-link text-[13px]">
            Create account
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
          <div className="max-w-xl">
            <p className="mkt-eyebrow flex items-center gap-3 text-[var(--mkt-accent)]">
              <span className="h-px w-8 bg-[var(--mkt-accent-border)]" aria-hidden />
              Access
            </p>
            <h1 className="mkt-display mt-6 text-[2.4rem] sm:text-[3.2rem]">
              Sign in to the
              <br />
              workspace.
            </h1>
            <p className="mkt-lead mt-5 max-w-md text-[15px]">
              Continue to projects, agent runs, workflows, and usage records.
            </p>
            <div className="mt-10 hidden border-t border-[var(--mkt-line)] pt-6 lg:block">
              <p className="mkt-note">Software development, orchestrated.</p>
            </div>
          </div>

          <div className="w-full border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-6 sm:p-7">
            <p className="mkt-eyebrow">Account sign in</p>
            <h2 className="mt-3 font-display text-[24px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
              Workspace credentials
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mkt-label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mkt-field"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="mkt-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mkt-field"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && (
                <div className="border border-[color:color-mix(in_srgb,var(--mkt-danger)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--mkt-danger)_8%,transparent)] px-3 py-2 text-[12px] text-[var(--mkt-danger)]">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="mkt-btn-primary w-full">
                <span>{loading ? "Signing in…" : "Sign in"}</span>
                {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
              </button>

              <a href="/api/auth/github" className="mkt-btn-secondary w-full">
                Continue with GitHub
              </a>
            </form>

            <div className="mt-6 border-t border-[var(--mkt-line)] pt-5">
              <p className="mkt-eyebrow">Demo access</p>
              <p className="mt-2 text-[13px] text-[var(--mkt-ink-2)]">
                <span className="mkt-mono text-[12px] text-[var(--mkt-ink)]">demo@modelvault.dev</span>
                <span className="mx-2 text-[var(--mkt-ink-3)]">/</span>
                <span className="mkt-mono text-[12px] text-[var(--mkt-ink)]">password</span>
              </p>
            </div>

            <p className="mt-5 text-[13px] text-[var(--mkt-ink-3)]">
              New to Modelvault?{" "}
              <Link href="/register" className="font-medium text-[var(--mkt-accent)] hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
