import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  }
  const symbol = symbols[currency] || currency + " "
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  if (days > 0 && days <= 30) return `in ${days} days`
  if (days < 0 && days >= -30) return `${Math.abs(days)} days ago`
  return formatDate(d)
}

export function getUsagePercentage(used: number | null | undefined, quota: number | null | undefined): number {
  if (!used || !quota || quota === 0) return 0
  return Math.min(Math.round((used / quota) * 100), 100)
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return "text-red-400"
  if (percentage >= 75) return "text-amber-400"
  return "text-emerald-400"
}

export function getUsageBarColor(percentage: number): string {
  if (percentage >= 90) return "bg-red-500"
  if (percentage >= 75) return "bg-amber-500"
  return "bg-emerald-500"
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "text-emerald-400"
    case "paused": return "text-amber-400"
    case "expired": return "text-red-400"
    case "cancelled": return "text-zinc-500"
    case "trial": return "text-violet-400"
    default: return "text-zinc-400"
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "active": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "paused": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    case "expired": return "bg-red-500/10 text-red-400 border-red-500/20"
    case "cancelled": return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
    case "trial": return "bg-violet-500/10 text-violet-400 border-violet-500/20"
    case "connected": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "manual": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    case "error": return "bg-red-500/10 text-red-400 border-red-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}
