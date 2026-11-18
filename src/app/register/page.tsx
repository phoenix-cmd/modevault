"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { GlassCard } from "@/components/ui/glass-card"

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <GlassCard className="w-full max-w-md p-6">
        <PageHeader title="Create your MODELVAULT account" description="Start managing your AI ecosystem." />
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field w-full" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field w-full" required />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-medium text-ink-2">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="field w-full" required minLength={8} />
          </label>
          {error && <p className="text-[12px] text-danger">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account..." : "Create account"}
          </button>
          <a href="/api/auth/github" className="btn-secondary w-full text-center">
            Continue with GitHub
          </a>
          <p className="text-[11.5px] text-ink-3">
            Already have an account? <a href="/login" className="text-accent hover:underline">Sign in</a>
          </p>
        </form>
      </GlassCard>
    </div>
  )
}
