/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node seed script */
// MODELVAULT — Database Seed Script
// Seeds providers and creates a demo user with sample subscriptions

const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Seeding MODELVAULT database...")

  // ─── Create demo user ──────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "demo@modelvault.dev" },
    update: {},
    create: {
      id: "user_demo_001",
      email: "demo@modelvault.dev",
      name: "Demo User",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
  })
  console.log("✓ Demo user created")

  // ─── Create providers ──────────────────────────────────────────────
  const providers = [
    { slug: "openai", name: "OpenAI", brandColor: "#10a37f", website: "https://openai.com", hasApi: true, hasConsumer: true },
    { slug: "anthropic", name: "Anthropic", brandColor: "#d4a574", website: "https://anthropic.com", hasApi: true, hasConsumer: true },
    { slug: "google", name: "Google", brandColor: "#4285f4", website: "https://gemini.google.com", hasApi: true, hasConsumer: true },
    { slug: "github-copilot", name: "GitHub Copilot", brandColor: "#6e40c9", website: "https://github.com/features/copilot", hasApi: false, hasConsumer: true },
    { slug: "cursor", name: "Cursor", brandColor: "#00d4aa", website: "https://cursor.com", hasApi: false, hasConsumer: true },
    { slug: "perplexity", name: "Perplexity", brandColor: "#20b2aa", website: "https://perplexity.ai", hasApi: true, hasConsumer: true },
    { slug: "openrouter", name: "OpenRouter", brandColor: "#6366f1", website: "https://openrouter.ai", hasApi: true, hasConsumer: false },
    { slug: "windsurf", name: "Windsurf", brandColor: "#059669", website: "https://windsurf.com", hasApi: false, hasConsumer: true },
    { slug: "huggingface", name: "Hugging Face", brandColor: "#ff9d00", website: "https://huggingface.co", hasApi: true, hasConsumer: false },
  ]

  for (const p of providers) {
    await prisma.provider.upsert({
      where: { slug: p.slug },
      update: p,
      create: { id: `prov_${p.slug}`, ...p },
    })
  }
  console.log("✓ Providers seeded")

  // ─── Create sample subscriptions ───────────────────────────────────
  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const nextWeek = new Date(now)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const subscriptions = [
    {
      id: "sub_001",
      userId: user.id,
      providerId: "prov_openai",
      customPlanName: "ChatGPT Plus",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1700,
      currency: "INR",
      startDate: new Date("2024-03-15"),
      renewalDate: new Date("2026-12-15"),
      quotaMessages: 80,
      usedMessages: 52,
      quotaResetDate: new Date("2026-12-01"),
      quotaResetPeriod: "monthly",
      dataSource: "manual",
    },
    {
      id: "sub_002",
      userId: user.id,
      providerId: "prov_anthropic",
      customPlanName: "Claude Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1700,
      currency: "INR",
      startDate: new Date("2024-06-01"),
      renewalDate: new Date("2026-12-01"),
      quotaMessages: null,
      usedMessages: 0,
      quotaResetDate: new Date("2026-12-01"),
      quotaResetPeriod: "monthly",
      dataSource: "manual",
      notes: "Usage tracked as 5x multiplier, exact message count unavailable",
    },
    {
      id: "sub_003",
      userId: user.id,
      providerId: "prov_google",
      customPlanName: "Gemini Advanced",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1700,
      currency: "INR",
      startDate: new Date("2024-09-01"),
      renewalDate: new Date("2026-12-01"),
      quotaMessages: null,
      usedMessages: 0,
      dataSource: "manual",
    },
    {
      id: "sub_004",
      userId: user.id,
      providerId: "prov_github-copilot",
      customPlanName: "Copilot Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 850,
      currency: "INR",
      startDate: new Date("2024-01-10"),
      renewalDate: new Date("2026-12-10"),
      quotaRequests: null,
      usedRequests: 0,
      dataSource: "manual",
    },
    {
      id: "sub_005",
      userId: user.id,
      providerId: "prov_cursor",
      customPlanName: "Cursor Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1700,
      currency: "INR",
      startDate: new Date("2024-11-01"),
      renewalDate: new Date("2026-12-01"),
      quotaRequests: 500,
      usedRequests: 312,
      quotaResetDate: new Date("2026-12-01"),
      quotaResetPeriod: "monthly",
      dataSource: "manual",
    },
    {
      id: "sub_006",
      userId: user.id,
      providerId: "prov_perplexity",
      customPlanName: "Perplexity Pro",
      type: "consumer",
      status: "active",
      billingCycle: "yearly",
      price: 17000,
      currency: "INR",
      startDate: new Date("2025-06-15"),
      renewalDate: new Date("2026-06-15"),
      quotaRequests: 300,
      usedRequests: 89,
      quotaResetDate: new Date("2026-12-01"),
      quotaResetPeriod: "daily",
      dataSource: "manual",
    },
    {
      id: "sub_007",
      userId: user.id,
      providerId: "prov_windsurf",
      customPlanName: "Windsurf Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1250,
      currency: "INR",
      startDate: new Date("2025-03-01"),
      renewalDate: new Date("2026-12-01"),
      dataSource: "manual",
    },
  ]

  for (const sub of subscriptions) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      update: sub,
      create: sub,
    })
  }
  console.log("✓ Sample subscriptions created")

  // ─── Create API accounts ───────────────────────────────────────────
  const apiAccounts = [
    {
      id: "api_001",
      userId: user.id,
      providerId: "prov_openai",
      accountName: "OpenAI API - Main",
      apiKeyLastFour: "sk7x",
      prepaidBalance: 42.50,
      totalSpent: 157.50,
      currency: "USD",
      rateLimit: 500,
      rateLimitTokens: 30000,
      integrationStatus: "manual",
    },
    {
      id: "api_002",
      userId: user.id,
      providerId: "prov_anthropic",
      accountName: "Anthropic API",
      apiKeyLastFour: "an3k",
      prepaidBalance: 28.00,
      totalSpent: 72.00,
      currency: "USD",
      rateLimit: 1000,
      rateLimitTokens: 40000,
      integrationStatus: "manual",
    },
    {
      id: "api_003",
      userId: user.id,
      providerId: "prov_openrouter",
      accountName: "OpenRouter",
      apiKeyLastFour: "or9z",
      prepaidBalance: 15.30,
      totalSpent: 34.70,
      currency: "USD",
      integrationStatus: "manual",
    },
    {
      id: "api_004",
      userId: user.id,
      providerId: "prov_google",
      accountName: "Gemini API",
      apiKeyLastFour: "gm2a",
      prepaidBalance: 0,
      totalSpent: 8.40,
      currency: "USD",
      rateLimit: 15,
      integrationStatus: "manual",
    },
  ]

  for (const api of apiAccounts) {
    await prisma.apiAccount.upsert({
      where: { id: api.id },
      update: api,
      create: api,
    })
  }
  console.log("✓ API accounts created")

  // ─── Create API usage records ──────────────────────────────────────
  const models = [
    { accountId: "api_001", model: "gpt-4o", costPer1k: 0.005 },
    { accountId: "api_001", model: "gpt-4o-mini", costPer1k: 0.00015 },
    { accountId: "api_001", model: "o1-preview", costPer1k: 0.015 },
    { accountId: "api_002", model: "claude-3.5-sonnet", costPer1k: 0.003 },
    { accountId: "api_002", model: "claude-3-haiku", costPer1k: 0.00025 },
    { accountId: "api_003", model: "meta-llama/llama-3.1-70b", costPer1k: 0.0008 },
    { accountId: "api_003", model: "anthropic/claude-3.5-sonnet", costPer1k: 0.003 },
    { accountId: "api_004", model: "gemini-1.5-pro", costPer1k: 0.00125 },
  ]

  // Generate 30 days of usage data
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    date.setHours(0, 0, 0, 0)

    for (const m of models) {
      const inputTokens = Math.floor(Math.random() * 50000) + 1000
      const outputTokens = Math.floor(Math.random() * 20000) + 500
      const cachedTokens = Math.floor(Math.random() * 5000)
      const totalTokens = inputTokens + outputTokens
      const cost = parseFloat(((totalTokens / 1000) * m.costPer1k).toFixed(4))
      const requestCount = Math.floor(Math.random() * 100) + 5

      await prisma.apiUsageRecord.create({
        data: {
          apiAccountId: m.accountId,
          date,
          model: m.model,
          inputTokens,
          outputTokens,
          cachedTokens,
          totalTokens,
          cost,
          currency: "USD",
          requestCount,
          dataSource: "manual",
        },
      })
    }
  }
  console.log("✓ API usage records created (30 days)")

  // ─── Create notifications ─────────────────────────────────────────
  const notifications = [
    {
      userId: user.id,
      type: "quota_warning",
      title: "ChatGPT Plus — 65% quota used",
      message: "You've used 52 of 80 messages this period. Quota resets on Dec 1.",
      severity: "info",
      isRead: false,
    },
    {
      userId: user.id,
      type: "quota_warning",
      title: "Cursor Pro — 62% requests used",
      message: "312 of 500 fast premium requests used this month.",
      severity: "warning",
      isRead: false,
    },
    {
      userId: user.id,
      type: "renewal_reminder",
      title: "7 subscriptions renewing in December",
      message: "Total estimated renewal cost: ₹10,600",
      severity: "info",
      isRead: true,
    },
    {
      userId: user.id,
      type: "credit_low",
      title: "OpenRouter credits below $20",
      message: "Remaining balance: $15.30. Consider topping up.",
      severity: "warning",
      isRead: false,
    },
  ]

  for (const n of notifications) {
    await prisma.notification.create({ data: n })
  }
  console.log("✓ Notifications created")

  // ─── Create billing records ────────────────────────────────────────
  for (let monthsAgo = 5; monthsAgo >= 0; monthsAgo--) {
    const billingDate = new Date()
    billingDate.setMonth(billingDate.getMonth() - monthsAgo)
    billingDate.setDate(1)

    // Subscription payments
    for (const sub of subscriptions) {
      if (sub.billingCycle === "yearly" && monthsAgo !== 0) continue
      await prisma.billingRecord.create({
        data: {
          userId: user.id,
          subscriptionId: sub.id,
          type: "subscription_payment",
          amount: sub.billingCycle === "yearly" ? sub.price : sub.price,
          currency: sub.currency,
          billingDate,
          description: `${sub.customPlanName} — ${sub.billingCycle} payment`,
        },
      })
    }

    // API topups
    if (monthsAgo % 2 === 0) {
      await prisma.billingRecord.create({
        data: {
          userId: user.id,
          type: "api_topup",
          amount: 4200,
          currency: "INR",
          billingDate,
          description: "OpenAI API credit top-up ($50)",
        },
      })
    }
  }
  console.log("✓ Billing records created")

  // ─── Exchange rates ────────────────────────────────────────────────
  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: "USD", toCurrency: "INR" } },
    update: { rate: 84.50, source: "Manual estimate (Nov 2026)" },
    create: { fromCurrency: "USD", toCurrency: "INR", rate: 84.50, source: "Manual estimate (Nov 2026)" },
  })
  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency: "INR", toCurrency: "USD" } },
    update: { rate: 0.01183, source: "Manual estimate (Nov 2026)" },
    create: { fromCurrency: "INR", toCurrency: "USD", rate: 0.01183, source: "Manual estimate (Nov 2026)" },
  })
  console.log("✓ Exchange rates set")

  console.log("\n✅ MODELVAULT database seeded successfully!")
  console.log("   Demo login: demo@modelvault.dev")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
