"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { BrandMark } from "@/components/landing/Navbar"

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
    <div className="rig-page min-h-screen">
      <div className="rig-scanlines" aria-hidden="true" />
      <div className="rig-grain" aria-hidden="true" />
      <div className="h-[3px] w-full bg-[var(--rig-blue)]" aria-hidden="true" />

      <div className="rig-container relative z-10 flex min-h-[calc(100vh-3px)] flex-col">
        <header className="flex h-16 items-center justify-between border-b border-[var(--rig-paper-18)]">
          <Link href="/" aria-label="MODELVAULT Home">
            <BrandMark />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[44px] items-center rig-mono text-[11.5px] uppercase tracking-[0.08em] text-[var(--rig-paper-60)] transition-colors hover:text-[var(--rig-blue)]"
          >
            Sign in
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-8 py-8 sm:gap-12 sm:py-12 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-16">
          <div className="max-w-xl">
            <span className="rig-badge mb-6">
              <span className="rig-blink-dot" aria-hidden="true" />
              New Workspace
            </span>
            <h1 className="rig-display text-[clamp(2.1rem,5.5vw,3.6rem)] font-bold leading-[0.94] text-[var(--rig-paper)]">
              Create a workspace
              <br />
              for coordinated work.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-[1.68] text-[var(--rig-paper-75)]">
              Set up an account to organize repositories, agent executions, verification gates, and API spend in one system.
            </p>
          </div>

          <div className="w-full border border-[var(--rig-paper-18)] bg-[#101514] p-6 sm:p-8">
            <p className="rig-mono text-[10px] uppercase tracking-[0.14em] text-[var(--rig-blue)]">
              01 // Account Details
            </p>
            <h2 className="mt-2.5 rig-display text-[24px] font-semibold tracking-[-0.025em] text-[var(--rig-paper)]">
              Create your account
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-1.5 block rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-paper-50)]">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rig-field"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-paper-50)]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rig-field"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block rig-mono text-[10px] uppercase tracking-[0.12em] text-[var(--rig-paper-50)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rig-field"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="mt-1.5 rig-mono text-[10px] text-[var(--rig-paper-40)]">
                  Minimum 8 characters.
                </p>
              </label>

              {error && (
                <div className="border border-[var(--rig-red)]/40 bg-[#ed462d]/10 px-3 py-2 text-[12px] text-[#f0ae8d]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="rig-btn-chamfer rig-btn-blue min-h-[46px] w-full"
              >
                <span>{loading ? "Creating account…" : "Create account"}</span>
                {!loading && <ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
              </button>

              <a href="/api/auth/github" className="rig-btn-outline min-h-[46px] w-full">
                Continue with GitHub
              </a>
            </form>

            <p className="mt-6 border-t border-[var(--rig-paper-12)] pt-5 text-[13px] text-[var(--rig-paper-50)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[var(--rig-blue)] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
