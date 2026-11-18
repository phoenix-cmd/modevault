/* eslint-disable @typescript-eslint/no-require-imports -- standalone Node seed script */
// MODELVAULT — Database Seed Script
// Seeds organizations, workspaces, projects, agents, subscriptions, and executions

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🔄 Seeding MODELVAULT database...")

  // ─── Create demo user ──────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "demo@modelvault.dev" },
    create: {
      id: "user_demo_001",
      email: "demo@modelvault.dev",
      name: "Alex Kumar",
      passwordHash: bcrypt.hashSync("password", 10),
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
    update: {
      passwordHash: bcrypt.hashSync("password", 10),
    },
  })
  console.log("✓ Demo user created")

  // ─── Create organization & workspace ───────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: {},
    create: {
      id: "org_acme_001",
      name: "Acme Engineering",
      slug: "acme",
      plan: "enterprise",
    },
  })

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    },
  })

  const workspace = await prisma.workspace.upsert({
    where: { id: "ws_core_001" },
    update: {},
    create: {
      id: "ws_core_001",
      organizationId: org.id,
      name: "Core Platform",
      slug: "core-platform",
      isDefault: true,
    },
  })
  console.log("✓ Organization & Workspace initialized")

  // ─── Create Agent Registry ─────────────────────────────────────────
  const agents = [
    {
      id: "agent_claude_code",
      name: "Claude Code 3.7",
      provider: "Anthropic",
      runtimeType: "claude_code",
      model: "claude-3-7-sonnet",
      role: "lead_architect",
      capabilitiesJson: JSON.stringify(["file_edit", "shell_exec", "diff_inspect", "git_ops"]),
      isDefault: true,
    },
    {
      id: "agent_codex",
      name: "Codex 5.2",
      provider: "OpenAI",
      runtimeType: "codex",
      model: "gpt-4o",
      role: "backend_engineer",
      capabilitiesJson: JSON.stringify(["file_edit", "shell_exec", "test_runner"]),
      isDefault: true,
    },
    {
      id: "agent_gemini_cli",
      name: "Gemini CLI 2.5",
      provider: "Google",
      runtimeType: "gemini_cli",
      model: "gemini-2.5-pro",
      role: "frontend_engineer",
      capabilitiesJson: JSON.stringify(["file_edit", "preview_server", "ui_generate"]),
      isDefault: false,
    },
    {
      id: "agent_opencode",
      name: "OpenCode Reviewer",
      provider: "OpenCode",
      runtimeType: "opencode",
      model: "claude-3-5-sonnet",
      role: "qa_reviewer",
      capabilitiesJson: JSON.stringify(["diff_inspect", "code_review", "linter"]),
      isDefault: false,
    },
    {
      id: "agent_cursor_cloud",
      name: "Cursor Cloud Agent",
      provider: "Cursor",
      runtimeType: "cursor_cloud",
      model: "claude-3-5-sonnet",
      role: "fullstack_developer",
      capabilitiesJson: JSON.stringify(["file_edit", "diff_inspect", "shell_exec"]),
      isDefault: false,
    },
  ]

  for (const ag of agents) {
    await prisma.agentDefinition.upsert({
      where: { id: ag.id },
      update: ag,
      create: ag,
    })
  }
  console.log("✓ Agent Registry seeded")

  // ─── Create Demo Projects ──────────────────────────────────────────
  const project1 = await prisma.project.upsert({
    where: { id: "proj_fintech_001" },
    update: {},
    create: {
      id: "proj_fintech_001",
      workspaceId: workspace.id,
      name: "Fintech Checkout Engine",
      slug: "fintech-checkout",
      description: "High-throughput payment gateway client with real-time webhook verifications",
      framework: "nextjs",
      language: "typescript",
      repositoryUrl: "https://github.com/acme-corp/fintech-checkout",
      defaultBranch: "main",
      status: "ready",
    },
  })

  await prisma.projectSource.upsert({
    where: { id: "source_fintech_001" },
    update: {},
    create: {
      id: "source_fintech_001",
      projectId: project1.id,
      type: "git_clone",
      branch: "main",
      manifestJson: JSON.stringify({
        name: "fintech-checkout",
        framework: "Next.js 16",
        entry: "src/app/page.tsx",
        dependencies: ["stripe", "prisma", "zod", "tailwind"],
        fileCount: 42,
      }),
    },
  })

  await prisma.projectEnvironment.upsert({
    where: { id: "env_fintech_001" },
    update: {},
    create: {
      id: "env_fintech_001",
      projectId: project1.id,
      runtime: "nodejs-20",
      buildCommand: "npm run build",
      startCommand: "npm run start",
      runPort: 3001,
      status: "running",
    },
  })

  const project2 = await prisma.project.upsert({
    where: { id: "proj_ai_analytics_002" },
    update: {},
    create: {
      id: "proj_ai_analytics_002",
      workspaceId: workspace.id,
      name: "Multi-Model Telemetry Hub",
      slug: "telemetry-hub",
      description: "Distributed token ingestion pipeline with Kafka consumers and ClickHouse aggregation",
      framework: "python",
      language: "python",
      repositoryUrl: "https://github.com/acme-corp/telemetry-hub",
      defaultBranch: "main",
      status: "ready",
    },
  })

  await prisma.projectEnvironment.upsert({
    where: { id: "env_telemetry_001" },
    update: {},
    create: {
      id: "env_telemetry_001",
      projectId: project2.id,
      runtime: "python-3.11",
      buildCommand: "pip install -r requirements.txt",
      startCommand: "python main.py",
      runPort: 3002,
      status: "stopped",
    },
  })
  console.log("✓ Projects & Environments initialized")

  // ─── Create Sample Execution with Tasks & Diff Artifact ────────────
  const execution = await prisma.execution.upsert({
    where: { id: "exec_trade_001" },
    update: {},
    create: {
      id: "exec_trade_001",
      projectId: project1.id,
      workspaceId: workspace.id,
      userId: user.id,
      title: "Add resilient idempotency key handling to Stripe checkout session API",
      prompt: "Implement atomic idempotency key validation on `/api/checkout` to prevent duplicate billing charges during network timeouts. Include unit tests and database lock.",
      status: "awaiting_approval",
      targetBranch: "feature/checkout-idempotency",
      totalTokens: 42800,
      inputTokens: 31200,
      outputTokens: 11600,
      estimatedCost: 0.185,
      durationMs: 84000,
      planJson: JSON.stringify({
        goal: "Atomic idempotency key validation for checkout",
        stages: [
          { name: "Architecture & Schema", agent: "Claude Code 3.7", status: "completed" },
          { name: "API Route Implementation", agent: "Codex 5.2", status: "completed" },
          { name: "Unit & Edge-Case Tests", agent: "Gemini CLI 2.5", status: "completed" },
          { name: "Security & QA Diff Review", agent: "OpenCode Reviewer", status: "awaiting_approval" },
        ],
      }),
    },
  })

  // Execution Tasks
  const task1 = await prisma.executionTask.upsert({
    where: { id: "task_exec_001" },
    update: {},
    create: {
      id: "task_exec_001",
      executionId: execution.id,
      title: "Design Idempotency Schema & Lock Table",
      description: "Add IdempotencyRecord model with TTL index and in-flight status flag",
      agentRole: "Lead Architect",
      agentName: "Claude Code 3.7",
      status: "completed",
      orderIndex: 0,
    },
  })

  const task2 = await prisma.executionTask.upsert({
    where: { id: "task_exec_002" },
    update: {},
    create: {
      id: "task_exec_002",
      executionId: execution.id,
      title: "Implement checkout POST middleware with deduplication lock",
      description: "Check if Idempotency-Key header is present; return cached response if request already completed",
      agentRole: "Backend Engineer",
      agentName: "Codex 5.2",
      status: "completed",
      orderIndex: 1,
    },
  })

  const task3 = await prisma.executionTask.upsert({
    where: { id: "task_exec_003" },
    update: {},
    create: {
      id: "task_exec_003",
      executionId: execution.id,
      title: "Diff Inspection and Automated Security Sign-off",
      description: "Verify timing attack resistance and database transaction rollbacks",
      agentRole: "QA Reviewer",
      agentName: "OpenCode Reviewer",
      status: "running",
      orderIndex: 2,
    },
  })

  // Sample Agent Events
  const events = [
    {
      executionId: execution.id,
      taskId: task1.id,
      seq: 1,
      eventType: "tool_call",
      level: "info",
      payloadJson: JSON.stringify({
        tool: "read_file",
        path: "src/app/api/checkout/route.ts",
        status: "success",
        durationMs: 120,
      }),
    },
    {
      executionId: execution.id,
      taskId: task2.id,
      seq: 2,
      eventType: "terminal",
      level: "info",
      payloadJson: JSON.stringify({
        command: "npm test -- tests/idempotency.test.ts",
        output: "PASS tests/idempotency.test.ts\n  ✓ deduplicates rapid double-click requests (48 ms)\n  ✓ rejects expired keys after 24h TTL (12 ms)",
        exitCode: 0,
      }),
    },
    {
      executionId: execution.id,
      taskId: task3.id,
      seq: 3,
      eventType: "diff_ready",
      level: "action",
      payloadJson: JSON.stringify({
        summary: "Modified 2 files (+48 lines, -6 lines)",
        branch: "feature/checkout-idempotency",
      }),
    },
  ]

  for (let i = 0; i < events.length; i++) {
    await prisma.agentEvent.upsert({
      where: { id: `event_exec_${i + 1}` },
      update: events[i],
      create: {
        id: `event_exec_${i + 1}`,
        ...events[i],
      },
    })
  }

  // Realistic Git Diff Artifact
  await prisma.executionArtifact.upsert({
    where: { id: "artifact_diff_001" },
    update: {},
    create: {
      id: "artifact_diff_001",
      executionId: execution.id,
      type: "git_diff",
      path: "src/app/api/checkout/route.ts",
      summary: "Add Idempotency-Key validation header and atomic database transaction wrapper",
      content: `--- a/src/app/api/checkout/route.ts
+++ b/src/app/api/checkout/route.ts
@@ -14,6 +14,35 @@ export async function POST(req: NextRequest) {
   try {
+    const idempotencyKey = req.headers.get("Idempotency-Key");
+    if (!idempotencyKey) {
+      return NextResponse.json({ error: "Missing Idempotency-Key header" }, { status: 400 });
+    }
+
+    // Check existing execution lock
+    const existingLock = await prisma.idempotencyRecord.findUnique({
+      where: { key: idempotencyKey }
+    });
+    if (existingLock && existingLock.status === "completed") {
+      return NextResponse.json(JSON.parse(existingLock.responseBody), { status: 200 });
+    }
+
     const body = await req.json();
     const session = await stripe.checkout.sessions.create({
       customer_email: body.email,
       line_items: body.items,
       mode: "payment",
+      metadata: { idempotencyKey },
       success_url: \`\${origin}/success?session_id={CHECKOUT_SESSION_ID}\`,
       cancel_url: \`\${origin}/cancel\`,
     });
+
+    await prisma.idempotencyRecord.create({
+      data: { key: idempotencyKey, status: "completed", responseBody: JSON.stringify({ sessionId: session.id }) }
+    });
+
     return NextResponse.json({ sessionId: session.id });
   } catch (err: any) {
     return NextResponse.json({ error: err.message }, { status: 500 });
   }
 }`,
    },
  })
  console.log("✓ Sample Multi-Agent Execution & Diff Artifact created")

  // ─── Existing Providers, Subscriptions, API Accounts & Billing ──────
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

  // AI model catalog
  const models = [
    {
      slug: "claude-3-7-sonnet",
      name: "Claude 3.7 Sonnet",
      providerSlug: "anthropic",
      providerName: "Anthropic",
      contextTokens: 200000,
      inputPricePerM: 3.0,
      outputPricePerM: 15.0,
      cachedPricePerM: 0.3,
      speedTokensPerSec: 52,
      latencyMs: 820,
      bestFor: "Complex software architecture, hybrid thinking, refactoring & AST analysis",
      status: "Production Ready",
      sampleResponse: "// Claude 3.7 Sonnet: Atomic Idempotency Middleware\nexport async function withIdempotency(req, handler) {\n  const key = req.headers.get(\"Idempotency-Key\")\n  if (!key) throw new Error(\"Missing key\")\n  return handler(req)\n}",
    },
    {
      slug: "gpt-4o",
      name: "GPT-4o",
      providerSlug: "openai",
      providerName: "OpenAI",
      contextTokens: 128000,
      inputPricePerM: 2.5,
      outputPricePerM: 10.0,
      cachedPricePerM: 1.25,
      speedTokensPerSec: 88,
      latencyMs: 510,
      bestFor: "Full-stack code generation, multimodal reasoning, tool calling",
      status: "Production Ready",
      sampleResponse: "// GPT-4o: Streaming route handler\nexport async function POST(req) {\n  const body = await req.json()\n  return Response.json({ ok: true, body })\n}",
    },
    {
      slug: "gemini-2-5-pro",
      name: "Gemini 2.5 Pro",
      providerSlug: "google",
      providerName: "Google",
      contextTokens: 1000000,
      inputPricePerM: 1.25,
      outputPricePerM: 10.0,
      cachedPricePerM: 0.315,
      speedTokensPerSec: 64,
      latencyMs: 690,
      bestFor: "Million-token repository analysis and long-context synthesis",
      status: "Production Ready",
      sampleResponse: "// Gemini 2.5 Pro: repository-wide refactor map\nconst files = await repo.list()\nconst plan = files.map((f) => ({ file: f, action: \"inspect\" }))",
    },
    {
      slug: "codex-5-2",
      name: "Codex 5.2",
      providerSlug: "openai",
      providerName: "OpenAI",
      contextTokens: 400000,
      inputPricePerM: 2.0,
      outputPricePerM: 8.0,
      cachedPricePerM: 0.5,
      speedTokensPerSec: 74,
      latencyMs: 610,
      bestFor: "Autonomous implementation and test-driven code repair",
      status: "Production Ready",
      sampleResponse: "// Codex 5.2: patch generator\nexport function applyPatch(source, patch) {\n  return patch.reduce((acc, hunk) => hunk.apply(acc), source)\n}",
    },
    {
      slug: "claude-haiku-4",
      name: "Claude Haiku 4",
      providerSlug: "anthropic",
      providerName: "Anthropic",
      contextTokens: 200000,
      inputPricePerM: 0.8,
      outputPricePerM: 4.0,
      cachedPricePerM: 0.08,
      speedTokensPerSec: 120,
      latencyMs: 310,
      bestFor: "High-volume classification, routing, and fast code review",
      status: "Production Ready",
      sampleResponse: "// Claude Haiku 4: fast intent router\nexport const routeIntent = (text) => text.includes(\"deploy\") ? \"ops\" : \"dev\"",
    },
    {
      slug: "deepseek-v3-2",
      name: "DeepSeek V3.2",
      providerSlug: "openrouter",
      providerName: "OpenRouter",
      contextTokens: 163840,
      inputPricePerM: 0.27,
      outputPricePerM: 1.1,
      cachedPricePerM: 0.07,
      speedTokensPerSec: 95,
      latencyMs: 540,
      bestFor: "Cost-sensitive batch generation and open-weight experimentation",
      status: "Production Ready",
      sampleResponse: "// DeepSeek V3.2: batch summarizer\nfor (const row of rows) {\n  summaries.push(await summarize(row))\n}",
    },
  ]

  for (const m of models) {
    await prisma.aiModel.upsert({
      where: { slug: m.slug },
      update: m,
      create: { id: `model_${m.slug}`, ...m },
    })
  }
  console.log("✓ AI model catalog seeded")

  // Subscriptions
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
      notes: "5x usage allowance over free tier",
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
      id: "sub_003",
      userId: user.id,
      providerId: "prov_google",
      customPlanName: "Google AI Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1950,
      currency: "INR",
      startDate: new Date("2024-08-10"),
      renewalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      quotaMessages: 1000,
      usedMessages: 940,
      quotaTokens: 2000000,
      usedTokens: 1480000,
      quotaResetDate: new Date("2026-12-01"),
      quotaResetPeriod: "monthly",
      dataSource: "manual",
      notes: "Gemini Advanced + 2TB storage bundle",
    },
    {
      id: "sub_004",
      userId: user.id,
      providerId: "prov_github-copilot",
      customPlanName: "GitHub Copilot Business",
      type: "consumer",
      status: "active",
      billingCycle: "yearly",
      price: 22800,
      currency: "INR",
      startDate: new Date("2025-01-15"),
      renewalDate: new Date("2026-12-20"),
      quotaRequests: 300,
      usedRequests: 60,
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
      billingCycle: "monthly",
      price: 1700,
      currency: "INR",
      startDate: new Date("2024-09-05"),
      renewalDate: new Date("2026-12-05"),
      quotaRequests: 600,
      usedRequests: 310,
      quotaResetPeriod: "monthly",
      dataSource: "manual",
    },
    {
      id: "sub_007",
      userId: user.id,
      providerId: "prov_openrouter",
      customPlanName: "OpenRouter Credits",
      type: "api",
      status: "active",
      billingCycle: "monthly",
      price: 2500,
      currency: "INR",
      startDate: new Date("2025-02-01"),
      renewalDate: new Date("2026-12-01"),
      quotaCredits: 50,
      usedCredits: 8,
      quotaResetPeriod: "billing_cycle",
      dataSource: "manual",
    },
    {
      id: "sub_008",
      userId: user.id,
      providerId: "prov_windsurf",
      customPlanName: "Windsurf Pro",
      type: "consumer",
      status: "active",
      billingCycle: "monthly",
      price: 1275,
      currency: "INR",
      startDate: new Date("2024-10-01"),
      renewalDate: new Date("2026-12-01"),
      quotaCredits: 500,
      usedCredits: 0,
      quotaResetPeriod: "monthly",
      dataSource: "manual",
      createdAt: new Date("2025-01-01"),
      notes: "Duplicate IDE license — kept for evaluation",
    },
  ]

  for (const sub of subscriptions) {
    await prisma.subscription.upsert({
      where: { id: sub.id },
      update: sub,
      create: sub,
    })
  }

  // API accounts
  const apiAccounts = [
    {
      id: "api_001",
      userId: user.id,
      providerId: "prov_openai",
      accountName: "OpenAI API - Production",
      apiKeyLastFour: "sk7x",
      prepaidBalance: 42.50,
      totalSpent: 157.50,
      currency: "USD",
      rateLimit: 500,
      rateLimitTokens: 30000,
      integrationStatus: "connected",
    },
    {
      id: "api_002",
      userId: user.id,
      providerId: "prov_anthropic",
      accountName: "Anthropic API - Agent Runner",
      apiKeyLastFour: "an3k",
      prepaidBalance: 28.00,
      totalSpent: 72.00,
      currency: "USD",
      rateLimit: 1000,
      rateLimitTokens: 40000,
      integrationStatus: "connected",
    },
    {
      id: "api_003",
      userId: user.id,
      providerId: "prov_google",
      accountName: "Google AI Studio",
      apiKeyLastFour: "go9p",
      prepaidBalance: 12.40,
      totalSpent: 36.20,
      currency: "USD",
      rateLimit: 600,
      rateLimitTokens: 25000,
      integrationStatus: "connected",
    },
    {
      id: "api_004",
      userId: user.id,
      providerId: "prov_openrouter",
      accountName: "OpenRouter Sandbox",
      apiKeyLastFour: "or2q",
      prepaidBalance: 0,
      totalSpent: 0,
      currency: "USD",
      rateLimit: 200,
      integrationStatus: "manual",
      createdAt: new Date("2025-01-05"),
    },
  ]

  for (const api of apiAccounts) {
    await prisma.apiAccount.upsert({
      where: { id: api.id },
      update: api,
      create: api,
    })
  }

  // Billing history — 6 months of subscription payments and API top-ups.
  const billingSubs = [
    { id: "sub_001", amount: 1700, label: "ChatGPT Plus" },
    { id: "sub_002", amount: 1700, label: "Claude Pro" },
    { id: "sub_003", amount: 1950, label: "Google AI Pro" },
    { id: "sub_004", amount: 1900, label: "GitHub Copilot Business (annual / 12)" },
    { id: "sub_005", amount: 1700, label: "Cursor Pro" },
    { id: "sub_006", amount: 1700, label: "Perplexity Pro" },
    { id: "sub_007", amount: 2500, label: "OpenRouter Credits" },
  ]

  let billingIndex = 0
  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    const monthDate = new Date()
    monthDate.setMonth(monthDate.getMonth() - monthOffset)
    monthDate.setDate(5)
    for (const sub of billingSubs) {
      billingIndex += 1
      await prisma.billingRecord.upsert({
        where: { id: `bill_sub_${billingIndex}` },
        update: {},
        create: {
          id: `bill_sub_${billingIndex}`,
          userId: user.id,
          subscriptionId: sub.id,
          type: "subscription_payment",
          amount: sub.amount,
          currency: "INR",
          billingDate: monthDate,
          description: `${sub.label} renewal`,
        },
      })
    }
    if (monthOffset % 2 === 0) {
      billingIndex += 1
      await prisma.billingRecord.upsert({
        where: { id: `bill_api_${billingIndex}` },
        update: {},
        create: {
          id: `bill_api_${billingIndex}`,
          userId: user.id,
          type: "api_topup",
          amount: 5000,
          currency: "USD",
          billingDate: monthDate,
          description: "Prepaid API credit top-up",
        },
      })
    }
  }
  console.log("✓ Billing history seeded")

  // API usage — daily model traffic for the last 30 days across connected accounts.
  const usageAccounts = [
    { id: "api_001", model: "gpt-4o", share: 50, inputPrice: 2.5, outputPrice: 10 },
    { id: "api_002", model: "claude-3-7-sonnet", share: 30, inputPrice: 3, outputPrice: 15 },
    { id: "api_003", model: "gemini-2-5-pro", share: 20, inputPrice: 1.25, outputPrice: 10 },
  ]

  let usageIndex = 0
  for (const account of usageAccounts) {
    for (let i = 0; i < account.share; i += 1) {
      usageIndex += 1
      const daysAgo = i % 30
      const usageDate = new Date()
      usageDate.setDate(usageDate.getDate() - daysAgo)
      const inputTokens = 18000 + ((usageIndex * 317) % 42000)
      const outputTokens = 4000 + ((usageIndex * 193) % 12000)
      const cachedTokens = Math.round(inputTokens * 0.25)
      const cost =
        ((inputTokens - cachedTokens) / 1_000_000) * account.inputPrice +
        (cachedTokens / 1_000_000) * account.inputPrice * 0.1 +
        (outputTokens / 1_000_000) * account.outputPrice
      await prisma.apiUsageRecord.upsert({
        where: { id: `usage_api_${usageIndex}` },
        update: {},
        create: {
          id: `usage_api_${usageIndex}`,
          apiAccountId: account.id,
          date: usageDate,
          model: account.model,
          inputTokens,
          outputTokens,
          cachedTokens,
          totalTokens: inputTokens + outputTokens,
          cost: Number(cost.toFixed(4)),
          currency: "USD",
          requestCount: 40 + ((usageIndex * 13) % 220),
          dataSource: "manual",
        },
      })
    }
  }
  console.log("✓ API usage history seeded")

  const notifications = [
    {
      id: "notif_quota_google",
      type: "quota_warning",
      title: "Google AI Pro quota at 94%",
      message: "940 of 1,000 tracked messages used. Resets on the next billing cycle.",
      severity: "critical",
      actionUrl: "/subscriptions",
    },
    {
      id: "notif_renewal_google",
      type: "renewal_reminder",
      title: "Google AI Pro renews soon",
      message: "Renewal is due within 3 days at ₹1,950/month.",
      severity: "warning",
      actionUrl: "/subscriptions",
    },
    {
      id: "notif_credit_openai",
      type: "credit_low",
      title: "OpenAI prepaid balance running low",
      message: "OpenAI API - Production has $42.50 remaining. Top up to avoid throttling.",
      severity: "warning",
      actionUrl: "/api-usage",
    },
    {
      id: "notif_execution",
      type: "execution_complete",
      title: "Agent execution completed",
      message: "Claude Code completed the idempotency middleware task on branch feature/checkout-idempotency.",
      severity: "info",
      actionUrl: "/agents",
    },
  ]

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: {},
      create: { userId: user.id, ...notification },
    })
  }
  console.log("✓ Notifications seeded")

  // ─── Seed Workflow Definitions ─────────────────────────────────────────
  const workflows = [
    {
      id: "wf_pr_review",
      name: "Autonomous PR Review & Security Gate",
      description: "Triggered on pull request: scans AST, flags CVE patterns with Claude 3.7, and requests human sign-off before merge.",
      category: "security",
      isTemplate: true,
      nodesJson: JSON.stringify([
        { id: "1", type: "trigger", position: { x: 50, y: 150 }, data: { label: "GitHub Pull Request", type: "trigger", description: "Webhook: opened or synchronized" } },
        { id: "2", type: "agent", position: { x: 280, y: 80 }, data: { label: "AST & Dependency Scan", type: "agent", description: "Static AST analyzer & license check" } },
        { id: "3", type: "agent", position: { x: 280, y: 220 }, data: { label: "Security & Vulnerability", type: "agent", description: "Claude 3.7 Sonnet deep reasoning" } },
        { id: "4", type: "approval", position: { x: 540, y: 150 }, data: { label: "Human Review Gate", type: "approval", description: "Require tech lead approval on diff" } },
        { id: "5", type: "action", position: { x: 780, y: 150 }, data: { label: "Merge & Deploy Preview", type: "action", description: "Fast-forward merge and trigger sandbox preview" } },
      ]),
      edgesJson: JSON.stringify([
        { id: "e1-2", source: "1", target: "2", animated: true },
        { id: "e1-3", source: "1", target: "3", animated: true },
        { id: "e2-4", source: "2", target: "4" },
        { id: "e3-4", source: "3", target: "4" },
        { id: "e4-5", source: "4", target: "5", animated: true },
      ]),
    },
    {
      id: "wf_feature_pipeline",
      name: "Full-Stack Feature Engineering Pipeline",
      description: "Decomposes feature specifications into parallel UI and backend worker tasks, executing integration tests in cloud worktree.",
      category: "development",
      isTemplate: true,
      nodesJson: JSON.stringify([
        { id: "1", type: "trigger", position: { x: 50, y: 150 }, data: { label: "Feature Prompt / Jira", type: "trigger", description: "Incoming feature ticket or manual prompt" } },
        { id: "2", type: "agent", position: { x: 280, y: 150 }, data: { label: "Lead Architect (DAG Planner)", type: "agent", description: "Claude 3.7 creates execution DAG" } },
        { id: "3", type: "agent", position: { x: 540, y: 60 }, data: { label: "Frontend Engineer", type: "agent", description: "Synthesize React & Tailwind components" } },
        { id: "4", type: "agent", position: { x: 540, y: 240 }, data: { label: "Backend Engineer", type: "agent", description: "Prisma schema & API route synthesis" } },
        { id: "5", type: "action", position: { x: 780, y: 150 }, data: { label: "Test Runner & Preview", type: "action", description: "Run test suite and provision live sandbox" } },
      ]),
      edgesJson: JSON.stringify([
        { id: "e1-2", source: "1", target: "2", animated: true },
        { id: "e2-3", source: "2", target: "3", animated: true },
        { id: "e2-4", source: "2", target: "4", animated: true },
        { id: "e3-5", source: "3", target: "5" },
        { id: "e4-5", source: "4", target: "5" },
      ]),
    },
  ]

  for (const wf of workflows) {
    await prisma.workflowDefinition.upsert({
      where: { id: wf.id },
      update: wf,
      create: wf,
    })
  }
  console.log("✓ Workflow templates seeded")

  // ─── Seed Review Comments for Initial Execution ─────────────────────────
  await prisma.reviewComment.upsert({
    where: { id: "rc_001" },
    update: {},
    create: {
      id: "rc_001",
      executionId: execution.id,
      filePath: "src/lib/services/api-client.ts",
      lineNumber: 182,
      authorName: "Sarah Chen (Principal Eng)",
      comment: "Good use of AbortSignal.timeout(). Ensure we log warning telemetry when retry attempt >= 2.",
      status: "open",
    },
  })
  console.log("✓ Review comments seeded")

  console.log("\n✅ MODELVAULT multi-agent platform database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
