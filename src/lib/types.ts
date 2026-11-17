// MODELVAULT — Type Definitions

export type ProviderSlug =
  | "openai"
  | "anthropic"
  | "google"
  | "github-copilot"
  | "cursor"
  | "perplexity"
  | "openrouter"
  | "windsurf"
  | "huggingface"

export type SubscriptionType = "consumer" | "api"
export type SubscriptionStatus = "active" | "paused" | "expired" | "cancelled" | "trial"
export type BillingCycle = "monthly" | "yearly" | "custom"
export type DataSource = "manual" | "api_sync" | "estimated"
export type IntegrationStatus = "connected" | "manual" | "error" | "expired"
export type UsageUnit = "messages" | "tokens" | "requests" | "credits" | "percentage"
export type NotificationType = "quota_warning" | "renewal_reminder" | "credit_low" | "trial_expiring" | "sync_error" | "general"
export type NotificationSeverity = "info" | "warning" | "critical"

export interface ProviderInfo {
  slug: ProviderSlug
  name: string
  shortName: string
  brandColor: string
  gradientFrom: string
  gradientTo: string
  logoIcon: string // Lucide icon name or custom
  website: string
  hasApi: boolean
  hasConsumer: boolean
  plans: PlanInfo[]
}

export interface PlanInfo {
  name: string
  type: SubscriptionType
  priceMonthly: number | null
  priceYearly: number | null
  currency: string
  quotaMessages: number | null
  quotaTokens: number | null
  quotaRequests: number | null
  quotaCredits: number | null
  features: string[]
}

export interface SubscriptionData {
  id: string
  userId: string
  providerId: string
  providerSlug: ProviderSlug
  providerName: string
  planName: string
  type: SubscriptionType
  status: SubscriptionStatus
  billingCycle: BillingCycle
  price: number
  currency: string
  startDate: string
  renewalDate: string | null
  expiryDate: string | null
  quotaMessages: number | null
  quotaTokens: number | null
  quotaRequests: number | null
  quotaCredits: number | null
  usedMessages: number
  usedTokens: number
  usedRequests: number
  usedCredits: number
  quotaResetDate: string | null
  quotaResetPeriod: string | null
  dataSource: DataSource
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiAccountData {
  id: string
  userId: string
  providerId: string
  providerSlug: ProviderSlug
  providerName: string
  accountName: string | null
  apiKeyLastFour: string | null
  prepaidBalance: number
  totalSpent: number
  currency: string
  rateLimit: number | null
  rateLimitTokens: number | null
  integrationStatus: IntegrationStatus
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiUsageData {
  id: string
  apiAccountId: string
  date: string
  model: string | null
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
  cost: number
  currency: string
  requestCount: number
  dataSource: DataSource
}

/** Raw subscription row returned by /api/subscriptions (provider and plan included). */
export interface RawSubscription {
  id: string
  userId: string
  providerId: string
  provider: { slug: ProviderSlug; name: string } | null
  plan: { name: string } | null
  customPlanName: string | null
  type: SubscriptionType
  status: SubscriptionStatus
  billingCycle: BillingCycle
  price: number
  currency: string
  startDate: string
  renewalDate: string | null
  expiryDate: string | null
  quotaMessages: number | null
  quotaTokens: number | null
  quotaRequests: number | null
  quotaCredits: number | null
  usedMessages: number | null
  usedTokens: number | null
  usedRequests: number | null
  usedCredits: number | null
  quotaResetDate: string | null
  quotaResetPeriod: string | null
  dataSource: DataSource
  notes: string | null
  createdAt: string
  updatedAt: string
}

/** Raw developer account row returned by /api/api-accounts (provider included). */
export interface RawApiAccount {
  id: string
  userId: string
  providerId: string
  provider: { slug: ProviderSlug; name: string } | null
  accountName: string | null
  apiKeyLastFour: string | null
  prepaidBalance: number | null
  totalSpent: number | null
  currency: string | null
  rateLimit: number | null
  rateLimitTokens: number | null
  integrationStatus: IntegrationStatus
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
  createdAt: string
  updatedAt: string
}

/** API usage record enriched with its account and provider. */
export interface ApiUsageRecordData extends ApiUsageData {
  apiAccount?: {
    provider?: { name: string; slug: ProviderSlug } | null
  } | null
}

/** Aggregated totals returned by /api/api-usage/summary. */
export interface ApiUsageSummaryData {
  totalTokens: number
  totalCost: number
  totalRequests: number
  totalCachedTokens: number
  byModel: Array<{
    model: string
    tokens: number
    cost: number
    requests: number
    provider: string
  }>
  dailyTrend: Array<{
    date: string
    tokens: number
    cost: number
    requests: number
  }>
  byProvider: Array<{
    provider: string
    tokens: number
    cost: number
  }>
}

/** Billing record returned by /api/billing. */
export interface BillingRecordData {
  id: string
  type: string
  amount: number
  currency: string
  billingDate: string
  description: string | null
  invoiceUrl: string | null
  subscription?: {
    provider?: { name: string; slug: ProviderSlug } | null
  } | null
}

/** Totals returned by /api/billing/summary. */
export interface BillingSummaryData {
  totalSpentCurrentMonth: number
  totalSpentCurrentYear: number
  totalSpentAllTime: number
  monthlyHistory: Array<{
    month: string
    subscription: number
    api: number
    total: number
  }>
}

export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  severity: NotificationSeverity
  isRead: boolean
  actionUrl: string | null
  createdAt: string
}

export interface DashboardSummary {
  activeSubscriptions: number
  totalMonthlySpend: number
  totalAnnualSpend: number
  totalApiBalance: number
  upcomingRenewals: number
  currency: string
}

export interface SpendingDataPoint {
  month: string
  subscriptions: number
  api: number
  total: number
}

export interface ProviderSpendingData {
  provider: string
  providerSlug: ProviderSlug
  amount: number
  color: string
}

export interface ActivityItem {
  id: string
  type: "sync" | "usage_update" | "subscription_added" | "billing" | "renewal" | "alert"
  title: string
  description: string
  provider: string | null
  providerSlug: ProviderSlug | null
  timestamp: string
  severity: NotificationSeverity
}
