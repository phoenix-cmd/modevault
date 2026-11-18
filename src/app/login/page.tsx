"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <GlassCard className="w-full max-w-md p-6">
        <PageHeader
          title="Sign in to MODELVAULT"
          description="Use your workspace credentials to continue."
        />
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field w-full"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full"
              required
            />
          </label>
          {error && (
            <p className="text-[12px] text-danger">{error}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <a href="/api/auth/github" className="btn-secondary w-full text-center">
            Continue with GitHub
          </a>
          <p className="text-[11.5px] text-ink-3">
            Demo credentials: demo@modelvault.dev / password
          </p>
          <p className="text-[11.5px] text-ink-3">
            New here? <a href="/register" className="text-accent hover:underline">Create an account</a>
          </p>
        </form>
      </GlassCard>
    </div>
  )
}
