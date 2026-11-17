import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { SubscriptionData } from "./types"

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

/** Monthly-equivalent value for a subscription price. */
export function getMonthlyEquivalent(
  price: number,
  billingCycle: string
): number {
  if (billingCycle === "yearly") return price / 12
  return price
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

export interface PrimaryUsage {
  used: number
  quota: number
  unit: string
}

/** The first metered quota on a subscription, if any. */
export function getPrimaryUsage(sub: SubscriptionData): PrimaryUsage | null {
  if (sub.quotaMessages && sub.quotaMessages > 0) {
    return { used: sub.usedMessages, quota: sub.quotaMessages, unit: "messages" }
  }
  if (sub.quotaRequests && sub.quotaRequests > 0) {
    return { used: sub.usedRequests, quota: sub.quotaRequests, unit: "requests" }
  }
  if (sub.quotaTokens && sub.quotaTokens > 0) {
    return { used: sub.usedTokens, quota: sub.quotaTokens, unit: "tokens" }
  }
  if (sub.quotaCredits && sub.quotaCredits > 0) {
    return { used: sub.usedCredits, quota: sub.quotaCredits, unit: "credits" }
  }
  return null
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return "text-danger"
  if (percentage >= 75) return "text-warning"
  return "text-success"
}

export function getUsageBarColor(percentage: number): string {
  if (percentage >= 90) return "bg-danger"
  if (percentage >= 75) return "bg-warning"
  return "bg-success"
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active": return "text-success"
    case "connected": return "text-success"
    case "paused": return "text-warning"
    case "expired": return "text-danger"
    case "error": return "text-danger"
    case "cancelled": return "text-ink-3"
    case "trial": return "text-accent"
    case "manual": return "text-info"
    default: return "text-ink-2"
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "active": return "bg-success-soft text-success"
    case "connected": return "bg-success-soft text-success"
    case "paused": return "bg-warning-soft text-warning"
    case "expired": return "bg-danger-soft text-danger"
    case "error": return "bg-danger-soft text-danger"
    case "cancelled": return "bg-surface-2 text-ink-3"
    case "trial": return "bg-accent-soft text-accent"
    case "manual": return "bg-info-soft text-info"
    case "not_connected": return "bg-surface-2 text-ink-3"
    default: return "bg-surface-2 text-ink-2"
  }
}
