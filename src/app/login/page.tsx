"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Cpu } from "lucide-react"

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
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent/20 selection:text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl">
        <div className="hidden w-[42%] flex-col justify-between border-r border-line px-10 py-10 lg:flex">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface-2 text-ink">
              <Cpu className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="font-display text-sm font-semibold tracking-[0.06em]">
              MODEL<span className="text-accent">VAULT</span>
            </span>
          </Link>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              Workspace access
            </p>
            <h1 className="mt-4 font-display text-[34px] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
              Return to the command center.
            </h1>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-2">
              Subscriptions, agent runs, spend telemetry, and reviews — in one
              editorial workspace.
            </p>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Secured access · local workspace session
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-surface-2 text-ink">
                  <Cpu className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <span className="font-display text-sm font-semibold tracking-[0.06em]">
                  MODEL<span className="text-accent">VAULT</span>
                </span>
              </Link>
            </div>

            <div className="border-t border-line pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                Sign in
              </p>
              <h2 className="mt-3 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                Continue to your workspace
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                Use your workspace credentials, or continue with GitHub if it is
                configured.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field"
                  autoComplete="current-password"
                  required
                />
              </label>

              {error && (
                <div className="border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] font-medium text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <span>{loading ? "Signing in…" : "Sign in"}</span>
                {!loading && <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>

              <a href="/api/auth/github" className="btn-secondary w-full justify-center">
                Continue with GitHub
              </a>
            </form>

            <div className="mt-6 space-y-2 border-t border-line pt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
                Demo access
              </p>
              <p className="text-[12px] text-ink-2">
                <span className="font-mono text-[11px] text-ink">demo@modelvault.dev</span>
                <span className="mx-2 text-ink-3">/</span>
                <span className="font-mono text-[11px] text-ink">password</span>
              </p>
            </div>

            <p className="mt-6 text-[12px] text-ink-3">
              New to MODELVAULT?{" "}
              <Link href="/register" className="font-medium text-accent hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
