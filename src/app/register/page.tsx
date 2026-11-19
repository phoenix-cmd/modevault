"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Cpu } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || "Registration failed")
        return
      }
      router.push("/overview")
      router.refresh()
    } catch {
      setError("Registration failed")
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
              New workspace
            </p>
            <h1 className="mt-4 font-display text-[34px] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
              Create a home for your AI stack.
            </h1>
            <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-2">
              Track subscriptions, route agent work, monitor spend, and keep
              every review in one place.
            </p>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3">
            Start with a local workspace · no mock billing
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
                Create account
              </p>
              <h2 className="mt-3 font-display text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                Set up your workspace
              </h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                A name, email, and password are enough to get started.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="label">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field"
                  autoComplete="name"
                  required
                />
              </label>

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
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="mt-1.5 text-[10.5px] text-ink-3">
                  Minimum 8 characters.
                </p>
              </label>

              {error && (
                <div className="border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] font-medium text-danger">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                <span>{loading ? "Creating account…" : "Create account"}</span>
                {!loading && <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />}
              </button>

              <a href="/api/auth/github" className="btn-secondary w-full justify-center">
                Continue with GitHub
              </a>
            </form>

            <p className="mt-6 border-t border-line pt-5 text-[12px] text-ink-3">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
