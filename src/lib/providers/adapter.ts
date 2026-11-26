import crypto from "node:crypto"
import { getProviderCapability, type ProviderCapabilitySpec } from "@/lib/providers/capabilities"

export interface AdapterCredential {
  providerSlug: string
  apiKey?: string | null
  bridgeEndpoint?: string | null
}

export interface AdapterVerificationResult {
  ok: boolean
  status: "success" | "warning" | "error"
  message: string
  durationMs: number
  modelsDiscovered?: number
  creditsRemaining?: number
  creditsUsed?: number
  accountLabel?: string
  dataSource: "live_api_sync" | "manual" | "unsupported"
}

export interface UsagePeriod {
  startDate: Date
  endDate: Date
}

export interface AdapterUsageResult {
  supported: boolean
  dataSource: "live_api_sync" | "manual" | "unsupported"
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  requests: number
  cost: number
  currency: string
  breakdownByModel?: Array<{ model: string; inputTokens: number; outputTokens: number; cost: number; requests: number }>
  rawReferenceHash: string | null
  errorMessage?: string
}

export interface AdapterCreditsResult {
  supported: boolean
  dataSource: "live_api_sync" | "manual" | "unsupported"
  creditsRemaining: number | null
  creditsUsed: number | null
  currency: string
  rawReferenceHash: string | null
  errorMessage?: string
}

export interface AdapterInvoicesResult {
  supported: boolean
  dataSource: "live_api_sync" | "manual" | "unsupported"
  invoices: Array<{ id: string; amount: number; currency: string; date: string; status: string; url?: string | null }>
  errorMessage?: string
}

export interface ReplenishTriggerInput {
  amount: number
  currency: string
  idempotencyKey: string
  paymentMethodRef?: string | null
}

export interface AdapterReplenishResult {
  supported: boolean
  mode: "programmatic_recharge" | "manual_alert"
  status: "pending" | "confirmed" | "manual_required" | "failed"
  providerRef?: string | null
  checkoutUrl?: string | null
  message: string
}

export interface CodingToolDefinition {
  name: string
  description: string
  parameters: {
    type: "object"
    properties: Record<string, { type: string; description: string }>
    required: string[]
  }
}

export interface CodingMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  toolCallId?: string
  toolName?: string
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
}

export interface CodingSessionInput {
  model: string
  messages: CodingMessage[]
  tools: CodingToolDefinition[]
  maxTokens?: number
  timeoutMs?: number
}

export interface AdapterCodingResponse {
  content: string
  toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }>
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
  model: string
  durationMs: number
}

export interface ProviderAdapter {
  getCapabilityStatus(): ProviderCapabilitySpec
  verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult>
  fetchUsage(cred: AdapterCredential, period: UsagePeriod): Promise<AdapterUsageResult>
  fetchCredits(cred: AdapterCredential): Promise<AdapterCreditsResult>
  fetchInvoices(cred: AdapterCredential): Promise<AdapterInvoicesResult>
  triggerReplenishment(cred: AdapterCredential, opts: ReplenishTriggerInput): Promise<AdapterReplenishResult>
  startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse>
}

export function hashPayload(value: unknown): string {
  return crypto
    .createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value), "utf8")
    .digest("hex")
    .slice(0, 32)
}

export function validateLoopbackBridgeUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    throw new Error("Bridge endpoint must be a valid URL (e.g. http://127.0.0.1:4100)")
  }
  if (parsed.protocol !== "http:") {
    throw new Error("Local bridge URL must use http:// on loopback only")
  }
  if (parsed.username || parsed.password) {
    throw new Error("Local bridge URL must not embed credentials")
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Local bridge URL is restricted to localhost or 127.0.0.1")
  }
  const port = parsed.port ? Number.parseInt(parsed.port, 10) : 80
  if (!Number.isFinite(port) || port < 1024 || port > 65535) {
    throw new Error("Local bridge port must be between 1024 and 65535")
  }
  const selfPort = Number.parseInt(process.env.PORT || "3000", 10)
  if (Number.isFinite(selfPort) && port === selfPort) {
    throw new Error("Local bridge port cannot match the MODELVAULT server port")
  }
  return parsed
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3
): Promise<Response> {
  let lastError: unknown = null
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(8000),
      })
      if (res.status !== 429 && res.status < 500) {
        return res
      }
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    if (i < attempts - 1) {
      const backoffMs = 350 * Math.pow(2, i)
      await new Promise((resolve) => setTimeout(resolve, backoffMs))
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed")
}

function safeJsonArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return {}
    }
  }
  return {}
}

async function callOpenAiCompatibleChat(
  endpoint: string,
  apiKey: string,
  input: CodingSessionInput,
  extraHeaders: Record<string, string> = {}
): Promise<AdapterCodingResponse> {
  const startedAt = Date.now()
  const serializedMessages = input.messages.map((m) => {
    if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      }
    }
    if (m.role === "tool") {
      return {
        role: "tool",
        tool_call_id: m.toolCallId || "tool_0",
        content: m.content,
      }
    }
    return { role: m.role, content: m.content }
  })

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens ?? 1800,
      messages: serializedMessages,
      ...(input.tools.length > 0
        ? {
            tools: input.tools.map((t) => ({
              type: "function",
              function: {
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              },
            })),
            tool_choice: "auto",
          }
        : {}),
    }),
    signal: AbortSignal.timeout(input.timeoutMs ?? 25000),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Provider API error (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = (await res.json()) as {
    model?: string
    choices?: Array<{
      message?: {
        content?: string | null
        tool_calls?: Array<{
          id?: string
          function?: { name?: string; arguments?: string | Record<string, unknown> }
        }>
      }
    }>
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      total_tokens?: number
      prompt_tokens_details?: { cached_tokens?: number }
    }
  }

  const message = data.choices?.[0]?.message
  const toolCalls = (message?.tool_calls || [])
    .filter((tc) => tc.function?.name)
    .map((tc, idx) => ({
      id: tc.id || `call_${idx}_${Date.now()}`,
      name: tc.function!.name!,
      arguments: safeJsonArgs(tc.function?.arguments),
    }))
  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  const cachedTokens = data.usage?.prompt_tokens_details?.cached_tokens ?? 0

  return {
    content: message?.content || "",
    toolCalls,
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens: data.usage?.total_tokens ?? inputTokens + outputTokens,
    model: data.model || input.model,
    durationMs: Math.max(1, Date.now() - startedAt),
  }
}

class OpenRouterAdapter implements ProviderAdapter {
  getCapabilityStatus() {
    return getProviderCapability("openrouter")
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return { ok: false, status: "warning", message: "No OpenRouter key provided", durationMs: 1, dataSource: "manual" }
    }
    try {
      const res = await fetchWithRetry("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but OpenRouter verification returned HTTP ${res.status}`,
          durationMs,
          dataSource: "unsupported",
        }
      }
      const json = (await res.json()) as {
        data?: { usage?: number; limit?: number | null; label?: string }
      }
      const credits = await this.fetchCredits(cred)
      const usage = credits.creditsUsed ?? Number(json.data?.usage ?? 0)
      const remaining = credits.creditsRemaining ?? undefined
      return {
        ok: true,
        status: "success",
        message:
          remaining !== undefined
            ? `Verified OpenRouter key ($${usage.toFixed(2)} used · $${remaining.toFixed(2)} remaining)`
            : `Verified OpenRouter key ($${usage.toFixed(2)} used)`,
        durationMs,
        creditsUsed: usage,
        creditsRemaining: remaining,
        accountLabel: json.data?.label,
        dataSource: "live_api_sync",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Key saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchCredits(cred: AdapterCredential): Promise<AdapterCreditsResult> {
    const key = cred.apiKey?.trim()
    if (!key) {
      return {
        supported: false,
        dataSource: "manual",
        creditsRemaining: null,
        creditsUsed: null,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: "No OpenRouter API key stored",
      }
    }
    try {
      const creditsRes = await fetchWithRetry("https://openrouter.ai/api/v1/credits", {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (creditsRes.ok) {
        const json = (await creditsRes.json()) as {
          data?: { total_credits?: number; total_usage?: number }
        }
        const totalCredits = Number(json.data?.total_credits ?? 0)
        const totalUsage = Number(json.data?.total_usage ?? 0)
        return {
          supported: true,
          dataSource: "live_api_sync",
          creditsRemaining: Math.max(0, Number((totalCredits - totalUsage).toFixed(4))),
          creditsUsed: Number(totalUsage.toFixed(4)),
          currency: "USD",
          rawReferenceHash: hashPayload(json),
        }
      }
      const keyRes = await fetchWithRetry("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!keyRes.ok) {
        return {
          supported: true,
          dataSource: "unsupported",
          creditsRemaining: null,
          creditsUsed: null,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage: `OpenRouter returned HTTP ${keyRes.status}`,
        }
      }
      const keyJson = (await keyRes.json()) as {
        data?: { usage?: number; limit?: number | null }
      }
      const used = Number(keyJson.data?.usage ?? 0)
      const limit = keyJson.data?.limit ?? null
      return {
        supported: true,
        dataSource: "live_api_sync",
        creditsRemaining: limit !== null ? Math.max(0, Number((limit - used).toFixed(4))) : null,
        creditsUsed: Number(used.toFixed(4)),
        currency: "USD",
        rawReferenceHash: hashPayload(keyJson),
      }
    } catch (err) {
      return {
        supported: true,
        dataSource: "unsupported",
        creditsRemaining: null,
        creditsUsed: null,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: err instanceof Error ? err.message : "OpenRouter credits sync failed",
      }
    }
  }

  async fetchUsage(cred: AdapterCredential, _period: UsagePeriod): Promise<AdapterUsageResult> {
    const key = cred.apiKey?.trim()
    if (!key) {
      return {
        supported: false,
        dataSource: "manual",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: "No OpenRouter API key connected",
      }
    }
    try {
      const res = await fetchWithRetry("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!res.ok) {
        return {
          supported: true,
          dataSource: "unsupported",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 0,
          cost: 0,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage: `OpenRouter usage check returned HTTP ${res.status}`,
        }
      }
      const json = (await res.json()) as {
        data?: { usage?: number; usage_monthly?: number; usage_weekly?: number; usage_daily?: number }
      }
      const spend = Number(json.data?.usage_monthly ?? json.data?.usage ?? 0)
      return {
        supported: true,
        dataSource: "live_api_sync",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: Number(spend.toFixed(4)),
        currency: "USD",
        rawReferenceHash: hashPayload(json),
      }
    } catch (err) {
      return {
        supported: true,
        dataSource: "unsupported",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: err instanceof Error ? err.message : "OpenRouter usage fetch failed",
      }
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return {
      supported: false,
      dataSource: "manual",
      invoices: [],
      errorMessage: "OpenRouter invoices are managed in the OpenRouter billing console.",
    }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: this.getCapabilityStatus().billingUrl,
      message: "OpenRouter has no public programmatic top-up endpoint; use Stripe checkout webhook or top up in OpenRouter.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    if (!cred.apiKey?.trim()) throw new Error("OpenRouter API key is required for coding session")
    return callOpenAiCompatibleChat("https://openrouter.ai/api/v1/chat/completions", cred.apiKey.trim(), input, {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "MODELVAULT Studio",
    })
  }
}

class OpenAiAdapter implements ProviderAdapter {
  getCapabilityStatus() {
    return getProviderCapability("openai")
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return { ok: false, status: "warning", message: "No OpenAI API key provided", durationMs: 1, dataSource: "manual" }
    }
    try {
      const res = await fetchWithRetry("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but OpenAI verification returned HTTP ${res.status}`,
          durationMs,
          dataSource: "unsupported",
        }
      }
      const data = (await res.json()) as { data?: unknown[] }
      const count = Array.isArray(data.data) ? data.data.length : 0
      return {
        ok: true,
        status: "success",
        message: `Verified OpenAI key (${count} models accessible)`,
        durationMs,
        modelsDiscovered: count,
        dataSource: "live_api_sync",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Key saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchUsage(cred: AdapterCredential, period: UsagePeriod): Promise<AdapterUsageResult> {
    const key = cred.apiKey?.trim()
    if (!key) {
      return {
        supported: false,
        dataSource: "manual",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: "No OpenAI API key connected",
      }
    }
    const startSec = Math.floor(period.startDate.getTime() / 1000)
    const endSec = Math.floor(period.endDate.getTime() / 1000)
    try {
      const [usageRes, costsRes] = await Promise.all([
        fetchWithRetry(
          `https://api.openai.com/v1/organization/usage/completions?start_time=${startSec}&end_time=${endSec}&group_by=model`,
          { headers: { Authorization: `Bearer ${key}` } }
        ),
        fetchWithRetry(
          `https://api.openai.com/v1/organization/costs?start_time=${startSec}&end_time=${endSec}`,
          { headers: { Authorization: `Bearer ${key}` } }
        ),
      ])

      if (usageRes.status === 401 || usageRes.status === 403 || usageRes.status === 404) {
        return {
          supported: false,
          dataSource: "unsupported",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 0,
          cost: 0,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage:
            "OpenAI usage/cost API requires an Organization Admin API key (sk-admin-...). Standard project keys support Studio coding & model verification only.",
        }
      }
      if (!usageRes.ok) {
        return {
          supported: true,
          dataSource: "unsupported",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 0,
          cost: 0,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage: `OpenAI usage API returned HTTP ${usageRes.status}`,
        }
      }

      const usageJson = (await usageRes.json()) as {
        data?: Array<{
          results?: Array<{
            model?: string
            input_tokens?: number
            output_tokens?: number
            input_cached_tokens?: number
            num_model_requests?: number
          }>
        }>
      }
      let inputTokens = 0
      let outputTokens = 0
      let cachedTokens = 0
      let requests = 0
      const byModel = new Map<string, { model: string; inputTokens: number; outputTokens: number; cost: number; requests: number }>()

      for (const bucket of usageJson.data || []) {
        for (const r of bucket.results || []) {
          const inTok = r.input_tokens ?? 0
          const outTok = r.output_tokens ?? 0
          const cachedTok = r.input_cached_tokens ?? 0
          const reqs = r.num_model_requests ?? 0
          inputTokens += inTok
          outputTokens += outTok
          cachedTokens += cachedTok
          requests += reqs
          const modelName = r.model || "gpt-4o"
          const prev = byModel.get(modelName) || { model: modelName, inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 }
          prev.inputTokens += inTok
          prev.outputTokens += outTok
          prev.requests += reqs
          byModel.set(modelName, prev)
        }
      }

      let cost = 0
      if (costsRes.ok) {
        const costsJson = (await costsRes.json()) as {
          data?: Array<{ results?: Array<{ amount?: { value?: number } }> }>
        }
        for (const bucket of costsJson.data || []) {
          for (const r of bucket.results || []) {
            cost += Number(r.amount?.value ?? 0)
          }
        }
      }

      return {
        supported: true,
        dataSource: "live_api_sync",
        inputTokens,
        outputTokens,
        cachedTokens,
        requests,
        cost: Number(cost.toFixed(4)),
        currency: "USD",
        breakdownByModel: Array.from(byModel.values()),
        rawReferenceHash: hashPayload(usageJson),
      }
    } catch (err) {
      return {
        supported: true,
        dataSource: "unsupported",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: err instanceof Error ? err.message : "OpenAI usage sync failed",
      }
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "OpenAI does not expose prepaid wallet credit balances via public API.",
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return {
      supported: false,
      dataSource: "manual",
      invoices: [],
      errorMessage: "OpenAI invoices are available only in platform.openai.com billing settings.",
    }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: this.getCapabilityStatus().billingUrl,
      message: "OpenAI billing lacks a programmatic top-up API; top up manually or route via configured webhook checkout.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    if (!cred.apiKey?.trim()) throw new Error("OpenAI API key is required for coding session")
    return callOpenAiCompatibleChat("https://api.openai.com/v1/chat/completions", cred.apiKey.trim(), input)
  }
}

class AnthropicAdapter implements ProviderAdapter {
  getCapabilityStatus() {
    return getProviderCapability("anthropic")
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return { ok: false, status: "warning", message: "No Anthropic API key provided", durationMs: 1, dataSource: "manual" }
    }
    try {
      const res = await fetchWithRetry("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but Anthropic verification returned HTTP ${res.status}`,
          durationMs,
          dataSource: "unsupported",
        }
      }
      const data = (await res.json()) as { data?: unknown[] }
      const count = Array.isArray(data.data) ? data.data.length : 0
      return {
        ok: true,
        status: "success",
        message: `Verified Anthropic key (${count} Claude models accessible)`,
        durationMs,
        modelsDiscovered: count,
        dataSource: "live_api_sync",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Key saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchUsage(cred: AdapterCredential, period: UsagePeriod): Promise<AdapterUsageResult> {
    const key = cred.apiKey?.trim()
    if (!key) {
      return {
        supported: false,
        dataSource: "manual",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: "No Anthropic API key connected",
      }
    }
    try {
      const params = new URLSearchParams({
        starting_at: period.startDate.toISOString(),
        ending_at: period.endDate.toISOString(),
      })
      const res = await fetchWithRetry(
        `https://api.anthropic.com/v1/organizations/usage_report/messages?${params.toString()}`,
        {
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
        }
      )
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return {
          supported: false,
          dataSource: "unsupported",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 0,
          cost: 0,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage:
            "Anthropic usage report requires an Organization Admin key (sk-ant-admin-...). Standard keys support Studio coding & model verification.",
        }
      }
      if (!res.ok) {
        return {
          supported: true,
          dataSource: "unsupported",
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          requests: 0,
          cost: 0,
          currency: "USD",
          rawReferenceHash: null,
          errorMessage: `Anthropic usage report returned HTTP ${res.status}`,
        }
      }
      const json = (await res.json()) as {
        data?: Array<{
          results?: Array<{
            uncached_input_tokens?: number
            cache_read_input_tokens?: number
            output_tokens?: number
            model?: string
          }>
        }>
      }
      let inputTokens = 0
      let outputTokens = 0
      let cachedTokens = 0
      for (const bucket of json.data || []) {
        for (const r of bucket.results || []) {
          inputTokens += r.uncached_input_tokens ?? 0
          cachedTokens += r.cache_read_input_tokens ?? 0
          outputTokens += r.output_tokens ?? 0
        }
      }
      return {
        supported: true,
        dataSource: "live_api_sync",
        inputTokens,
        outputTokens,
        cachedTokens,
        requests: (json.data || []).length,
        cost: 0,
        currency: "USD",
        rawReferenceHash: hashPayload(json),
      }
    } catch (err) {
      return {
        supported: true,
        dataSource: "unsupported",
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        requests: 0,
        cost: 0,
        currency: "USD",
        rawReferenceHash: null,
        errorMessage: err instanceof Error ? err.message : "Anthropic usage sync failed",
      }
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Anthropic Console does not expose prepaid credit balances via API.",
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return {
      supported: false,
      dataSource: "manual",
      invoices: [],
      errorMessage: "Anthropic invoices are downloadable from console.anthropic.com.",
    }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: this.getCapabilityStatus().billingUrl,
      message: "Anthropic Console has no public auto-recharge API; top up manually or confirm via webhook.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    const key = cred.apiKey?.trim()
    if (!key) throw new Error("Anthropic API key is required for coding session")
    const startedAt = Date.now()
    const systemText = input.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n")

    const messages = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
          const blocks: Array<Record<string, unknown>> = []
          if (m.content) blocks.push({ type: "text", text: m.content })
          for (const tc of m.toolCalls) {
            blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.arguments })
          }
          return { role: "assistant", content: blocks }
        }
        if (m.role === "tool") {
          return {
            role: "user",
            content: [{ type: "tool_result", tool_use_id: m.toolCallId || "tool_0", content: m.content }],
          }
        }
        return { role: m.role === "assistant" ? "assistant" : "user", content: m.content }
      })

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens ?? 1800,
        ...(systemText ? { system: systemText } : {}),
        messages,
        ...(input.tools.length > 0
          ? {
              tools: input.tools.map((t) => ({
                name: t.name,
                description: t.description,
                input_schema: t.parameters,
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 25000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 200)}`)
    }

    const data = (await res.json()) as {
      model?: string
      content?: Array<{ type?: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>
      usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number }
    }

    const textParts: string[] = []
    const toolCalls: AdapterCodingResponse["toolCalls"] = []
    for (const block of data.content || []) {
      if (block.type === "text" && block.text) textParts.push(block.text)
      if (block.type === "tool_use" && block.name) {
        toolCalls.push({
          id: block.id || `tool_${toolCalls.length}`,
          name: block.name,
          arguments: safeJsonArgs(block.input),
        })
      }
    }

    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0
    const cachedTokens = data.usage?.cache_read_input_tokens ?? 0

    return {
      content: textParts.join("\n"),
      toolCalls,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens: inputTokens + outputTokens,
      model: data.model || input.model,
      durationMs: Math.max(1, Date.now() - startedAt),
    }
  }
}

class GoogleGeminiAdapter implements ProviderAdapter {
  getCapabilityStatus() {
    return getProviderCapability("google")
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return { ok: false, status: "warning", message: "No Google AI Studio key provided", durationMs: 1, dataSource: "manual" }
    }
    try {
      const res = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        {}
      )
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but Google Gemini verification returned HTTP ${res.status}`,
          durationMs,
          dataSource: "unsupported",
        }
      }
      const data = (await res.json()) as { models?: unknown[] }
      const count = Array.isArray(data.models) ? data.models.length : 0
      return {
        ok: true,
        status: "success",
        message: `Verified Google AI key (${count} Gemini models accessible)`,
        durationMs,
        modelsDiscovered: count,
        dataSource: "live_api_sync",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Key saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchUsage(): Promise<AdapterUsageResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 0,
      cost: 0,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Google AI Studio API keys do not expose billing usage; track manually or via Cloud Billing.",
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Google Gemini keys do not return prepaid balances.",
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return { supported: false, dataSource: "manual", invoices: [], errorMessage: "View invoices in Google Cloud Billing." }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: this.getCapabilityStatus().billingUrl,
      message: "Top up Google Cloud / AI Studio billing directly in Google AI Studio.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    const key = cred.apiKey?.trim()
    if (!key) throw new Error("Google AI key is required for coding session")
    const startedAt = Date.now()
    const systemInstruction = input.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n")

    const contents = input.messages
      .filter((m) => m.role !== "system")
      .map((m) => {
        if (m.role === "assistant" && m.toolCalls && m.toolCalls.length > 0) {
          const parts: Array<Record<string, unknown>> = []
          if (m.content) parts.push({ text: m.content })
          for (const tc of m.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.arguments } })
          }
          return { role: "model", parts }
        }
        if (m.role === "tool") {
          return {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: m.toolName || "tool",
                  response: { result: m.content },
                },
              },
            ],
          }
        }
        return {
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }
      })

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(key)}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
        contents,
        ...(input.tools.length > 0
          ? {
              tools: [
                {
                  functionDeclarations: input.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                  })),
                },
              ],
            }
          : {}),
        generationConfig: { maxOutputTokens: input.maxTokens ?? 1800 },
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 25000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string
            functionCall?: { name?: string; args?: Record<string, unknown> }
          }>
        }
      }>
      usageMetadata?: {
        promptTokenCount?: number
        candidatesTokenCount?: number
        cachedContentTokenCount?: number
        totalTokenCount?: number
      }
    }

    const parts = data.candidates?.[0]?.content?.parts || []
    const textParts: string[] = []
    const toolCalls: AdapterCodingResponse["toolCalls"] = []
    for (const part of parts) {
      if (part.text) textParts.push(part.text)
      if (part.functionCall?.name) {
        toolCalls.push({
          id: `gemini_call_${toolCalls.length}`,
          name: part.functionCall.name,
          arguments: safeJsonArgs(part.functionCall.args),
        })
      }
    }

    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0
    const cachedTokens = data.usageMetadata?.cachedContentTokenCount ?? 0
    return {
      content: textParts.join("\n"),
      toolCalls,
      inputTokens,
      outputTokens,
      cachedTokens,
      totalTokens: data.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens,
      model: input.model,
      durationMs: Math.max(1, Date.now() - startedAt),
    }
  }
}

class HuggingFaceAdapter implements ProviderAdapter {
  getCapabilityStatus() {
    return getProviderCapability("huggingface")
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return { ok: false, status: "warning", message: "No Hugging Face token provided", durationMs: 1, dataSource: "manual" }
    }
    try {
      const res = await fetchWithRetry("https://huggingface.co/api/whoami-v2", {
        headers: { Authorization: `Bearer ${key}` },
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Token saved encrypted, but Hugging Face returned HTTP ${res.status}`,
          durationMs,
          dataSource: "unsupported",
        }
      }
      const who = (await res.json()) as { name?: string }
      return {
        ok: true,
        status: "success",
        message: `Verified Hugging Face token for @${who.name || "user"}`,
        durationMs,
        accountLabel: who.name,
        dataSource: "live_api_sync",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Token saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchUsage(): Promise<AdapterUsageResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 0,
      cost: 0,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Hugging Face does not expose per-token billing via whoami API.",
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    return {
      supported: false,
      dataSource: "unsupported",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Hugging Face prepaid balances are managed in Billing settings.",
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return { supported: false, dataSource: "manual", invoices: [] }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: this.getCapabilityStatus().billingUrl,
      message: "Top up Hugging Face inference credits in Hugging Face Billing settings.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    if (!cred.apiKey?.trim()) throw new Error("Hugging Face token is required")
    return callOpenAiCompatibleChat("https://router.huggingface.co/v1/chat/completions", cred.apiKey.trim(), input)
  }
}

class LocalBridgeAdapter implements ProviderAdapter {
  constructor(private providerSlug: string) {}

  getCapabilityStatus() {
    const base = getProviderCapability(this.providerSlug)
    return {
      ...base,
      canCode: true,
      authMode: "local_bridge" as const,
      termsStatus: "limited" as const,
    }
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    if (!cred.bridgeEndpoint) {
      return { ok: false, status: "warning", message: "No local bridge URL configured", durationMs: 1, dataSource: "manual" }
    }
    try {
      const target = validateLoopbackBridgeUrl(cred.bridgeEndpoint)
      const res = await fetch(`${target.origin}/health`, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(4000),
      })
      return {
        ok: res.ok,
        status: res.ok ? "success" : "warning",
        message: res.ok
          ? `Connected to sanctioned local CLI bridge at ${target.origin}`
          : `Local bridge at ${target.origin} returned HTTP ${res.status}`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: res.ok ? "live_api_sync" : "unsupported",
      }
    } catch (err) {
      return {
        ok: false,
        status: "warning",
        message: `Local bridge unreachable (${err instanceof Error ? err.message : "offline"})`,
        durationMs: Math.max(1, Date.now() - startedAt),
        dataSource: "unsupported",
      }
    }
  }

  async fetchUsage(): Promise<AdapterUsageResult> {
    return {
      supported: false,
      dataSource: "manual",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 0,
      cost: 0,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: "Local CLI bridges report per-execution usage directly during runs.",
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    return {
      supported: false,
      dataSource: "manual",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return { supported: false, dataSource: "manual", invoices: [] }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: getProviderCapability(this.providerSlug).billingUrl,
      message: "Replenish consumer/CLI subscriptions in the provider portal.",
    }
  }

  async startCodingSession(cred: AdapterCredential, input: CodingSessionInput): Promise<AdapterCodingResponse> {
    if (!cred.bridgeEndpoint) {
      throw new Error("Local bridge URL is missing")
    }
    const startedAt = Date.now()
    const target = validateLoopbackBridgeUrl(cred.bridgeEndpoint)
    const res = await fetch(`${target.origin}/v1/chat/completions`, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(cred.apiKey ? { Authorization: `Bearer ${cred.apiKey.trim()}` } : {}),
      },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
        tools: input.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.parameters },
        })),
      }),
      signal: AbortSignal.timeout(input.timeoutMs ?? 25000),
    })
    if (!res.ok) {
      throw new Error(`Local bridge returned HTTP ${res.status}`)
    }
    const json = (await res.json()) as {
      content?: string
      choices?: Array<{ message?: { content?: string; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string | Record<string, unknown> } }> } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const message = json.choices?.[0]?.message
    const toolCalls = (message?.tool_calls || [])
      .filter((t) => t.function?.name)
      .map((t, idx) => ({
        id: t.id || `bridge_call_${idx}`,
        name: t.function!.name!,
        arguments: safeJsonArgs(t.function?.arguments),
      }))
    const inputTokens = json.usage?.prompt_tokens ?? 0
    const outputTokens = json.usage?.completion_tokens ?? 0
    return {
      content: message?.content || json.content || "",
      toolCalls,
      inputTokens,
      outputTokens,
      cachedTokens: 0,
      totalTokens: json.usage?.total_tokens ?? inputTokens + outputTokens,
      model: input.model,
      durationMs: Math.max(1, Date.now() - startedAt),
    }
  }
}

class ManualOrLimitedAdapter implements ProviderAdapter {
  constructor(private slug: string) {}

  getCapabilityStatus() {
    return getProviderCapability(this.slug)
  }

  async verifyCredentials(cred: AdapterCredential): Promise<AdapterVerificationResult> {
    const startedAt = Date.now()
    const key = cred.apiKey?.trim()
    if (!key) {
      return {
        ok: true,
        status: "success",
        message: `Updated ${this.slug} settings (manual tracking mode — no automated usage API)`,
        durationMs: 1,
        dataSource: "manual",
      }
    }

    if (this.slug === "github") {
      try {
        const res = await fetchWithRetry("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "MODELVAULT",
          },
        })
        const durationMs = Math.max(1, Date.now() - startedAt)
        if (!res.ok) {
          return {
            ok: false,
            status: "warning",
            message: `Token saved encrypted, but GitHub verification returned HTTP ${res.status}`,
            durationMs,
            dataSource: "unsupported",
          }
        }
        const gh = (await res.json()) as { login?: string }
        return {
          ok: true,
          status: "success",
          message: `Verified GitHub token for @${gh.login || "account"}`,
          durationMs,
          accountLabel: gh.login,
          dataSource: "live_api_sync",
        }
      } catch (err) {
        return {
          ok: false,
          status: "warning",
          message: `Token saved encrypted; GitHub check unreachable (${err instanceof Error ? err.message : "timeout"})`,
          durationMs: Math.max(1, Date.now() - startedAt),
          dataSource: "unsupported",
        }
      }
    }

    if (this.slug === "perplexity") {
      try {
        const res = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          }),
        })
        const durationMs = Math.max(1, Date.now() - startedAt)
        if (!res.ok) {
          return {
            ok: false,
            status: "warning",
            message: `Key saved encrypted, but Perplexity verification returned HTTP ${res.status}`,
            durationMs,
            dataSource: "unsupported",
          }
        }
        return {
          ok: true,
          status: "success",
          message: "Verified Perplexity Sonar API key",
          durationMs,
          modelsDiscovered: 4,
          dataSource: "live_api_sync",
        }
      } catch (err) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted; Perplexity check unreachable (${err instanceof Error ? err.message : "timeout"})`,
          durationMs: Math.max(1, Date.now() - startedAt),
          dataSource: "unsupported",
        }
      }
    }

    return {
      ok: true,
      status: "success",
      message: `Encrypted credential stored for ${this.slug} (no public usage/quota API available — manual tracking mode)`,
      durationMs: Math.max(1, Date.now() - startedAt),
      dataSource: "manual",
    }
  }

  async fetchUsage(): Promise<AdapterUsageResult> {
    const cap = this.getCapabilityStatus()
    return {
      supported: false,
      dataSource: cap.termsStatus === "unsupported" ? "unsupported" : "manual",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      requests: 0,
      cost: 0,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: cap.capabilitiesNote,
    }
  }

  async fetchCredits(): Promise<AdapterCreditsResult> {
    const cap = this.getCapabilityStatus()
    return {
      supported: false,
      dataSource: cap.termsStatus === "unsupported" ? "unsupported" : "manual",
      creditsRemaining: null,
      creditsUsed: null,
      currency: "USD",
      rawReferenceHash: null,
      errorMessage: cap.capabilitiesNote,
    }
  }

  async fetchInvoices(): Promise<AdapterInvoicesResult> {
    return { supported: false, dataSource: "manual", invoices: [] }
  }

  async triggerReplenishment(): Promise<AdapterReplenishResult> {
    const cap = this.getCapabilityStatus()
    return {
      supported: false,
      mode: "manual_alert",
      status: "manual_required",
      checkoutUrl: cap.billingUrl,
      message: `${cap.displayName} does not support programmatic top-up. Complete payment on the provider billing portal and record the receipt.`,
    }
  }

  async startCodingSession(): Promise<AdapterCodingResponse> {
    const cap = this.getCapabilityStatus()
    throw new Error(
      `${cap.displayName} is ${cap.termsStatus} for direct Studio execution (${cap.capabilitiesNote})`
    )
  }
}

export function getProviderAdapter(
  providerSlug: string,
  backendOverride?: "direct_api" | "local_bridge" | "manual_unsupported"
): ProviderAdapter {
  const slug = providerSlug.trim().toLowerCase()
  if (backendOverride === "local_bridge") {
    return new LocalBridgeAdapter(slug)
  }
  switch (slug) {
    case "openrouter":
      return new OpenRouterAdapter()
    case "openai":
      return new OpenAiAdapter()
    case "anthropic":
      return new AnthropicAdapter()
    case "google":
      return new GoogleGeminiAdapter()
    case "huggingface":
      return new HuggingFaceAdapter()
    default:
      return new ManualOrLimitedAdapter(slug)
  }
}
