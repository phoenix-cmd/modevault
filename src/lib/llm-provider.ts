import { prisma } from "@/lib/db"
import { decryptSecret } from "@/lib/crypto"

export type LlmProviderName = "anthropic" | "openai" | "google" | "openrouter"

export interface ResolvedProviderKey {
  provider: LlmProviderName
  apiKey: string
  model: string
  source: "user_credential" | "server_env"
}

export interface LlmCompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  durationMs: number
  model: string
  provider: LlmProviderName
}

const DEFAULT_MODEL_BY_PROVIDER: Record<LlmProviderName, string> = {
  anthropic: "claude-3-5-sonnet-latest",
  openai: "gpt-4o-mini",
  google: "gemini-2.0-flash",
  openrouter: "openai/gpt-4o-mini",
}

const FALLBACK_RATES_PER_M: Record<string, { input: number; output: number }> = {
  anthropic: { input: 3.0, output: 15.0 },
  openai: { input: 2.5, output: 10.0 },
  google: { input: 1.25, output: 5.0 },
  openrouter: { input: 0.4, output: 1.2 },
}

/**
 * Resolve a live API key from the user's encrypted IntegrationCredential rows
 * (falling back to configured server environment keys when present).
 */
export async function resolveUserProviderKey(
  userId: string,
  preferredProviders: LlmProviderName[] = ["anthropic", "openai", "google", "openrouter"]
): Promise<ResolvedProviderKey | null> {
  const creds = await prisma.integrationCredential.findMany({
    where: {
      userId,
      providerSlug: { in: ["anthropic", "openai", "google", "openrouter"] },
      encryptedKey: { not: null },
      status: { not: "not_connected" },
    },
  })

  for (const preferred of preferredProviders) {
    const match = creds.find((c) => c.providerSlug === preferred && c.encryptedKey)
    if (match?.encryptedKey) {
      try {
        const apiKey = decryptSecret(match.encryptedKey).trim()
        if (apiKey) {
          return {
            provider: preferred,
            apiKey,
            model: DEFAULT_MODEL_BY_PROVIDER[preferred],
            source: "user_credential",
          }
        }
      } catch {
        // Ignore undecryptable legacy key
      }
    }
  }

  for (const anyCred of creds) {
    if (!anyCred.encryptedKey) continue
    const slug = anyCred.providerSlug as LlmProviderName
    if (!(slug in DEFAULT_MODEL_BY_PROVIDER)) continue
    try {
      const apiKey = decryptSecret(anyCred.encryptedKey).trim()
      if (apiKey) {
        return {
          provider: slug,
          apiKey,
          model: DEFAULT_MODEL_BY_PROVIDER[slug],
          source: "user_credential",
        }
      }
    } catch {
      // Ignore
    }
  }

  const envMap: Array<{ provider: LlmProviderName; key?: string }> = [
    { provider: "anthropic", key: process.env.ANTHROPIC_API_KEY },
    { provider: "openai", key: process.env.OPENAI_API_KEY },
    { provider: "google", key: process.env.GEMINI_API_KEY },
    { provider: "openrouter", key: process.env.OPENROUTER_API_KEY },
  ]
  for (const preferred of preferredProviders) {
    const found = envMap.find((e) => e.provider === preferred && e.key?.trim())
    if (found?.key) {
      return {
        provider: found.provider,
        apiKey: found.key.trim(),
        model: DEFAULT_MODEL_BY_PROVIDER[found.provider],
        source: "server_env",
      }
    }
  }

  return null
}

/**
 * Call an external LLM provider HTTP API directly and measure tokens + latency.
 */
export async function invokeLlmCompletion(opts: {
  provider: LlmProviderName
  apiKey: string
  model?: string
  systemPrompt: string
  userPrompt: string
  maxTokens?: number
  timeoutMs?: number
}): Promise<LlmCompletionResult> {
  const model = opts.model || DEFAULT_MODEL_BY_PROVIDER[opts.provider]
  const maxTokens = opts.maxTokens ?? 1600
  const timeoutMs = opts.timeoutMs ?? 25000
  const startedAt = Date.now()

  if (opts.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": opts.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: opts.systemPrompt,
        messages: [{ role: "user", content: opts.userPrompt }],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Anthropic API error (${res.status}): ${errText.slice(0, 180)}`)
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
      model?: string
    }
    const content = data.content?.map((c) => c.text || "").join("") || ""
    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0
    return {
      content,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      durationMs: Math.max(1, Date.now() - startedAt),
      model: data.model || model,
      provider: opts.provider,
    }
  }

  if (opts.provider === "google") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 180)}`)
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
    }
    const content =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""
    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0
    const totalTokens = data.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens
    return {
      content,
      inputTokens,
      outputTokens,
      totalTokens,
      durationMs: Math.max(1, Date.now() - startedAt),
      model,
      provider: opts.provider,
    }
  }

  const endpoint =
    opts.provider === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions"

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`${opts.provider} API error (${res.status}): ${errText.slice(0, 180)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    model?: string
  }
  const content = data.choices?.[0]?.message?.content || ""
  const inputTokens = data.usage?.prompt_tokens ?? 0
  const outputTokens = data.usage?.completion_tokens ?? 0
  const totalTokens = data.usage?.total_tokens ?? inputTokens + outputTokens
  return {
    content,
    inputTokens,
    outputTokens,
    totalTokens,
    durationMs: Math.max(1, Date.now() - startedAt),
    model: data.model || model,
    provider: opts.provider,
  }
}

export async function estimateTokenCost(
  provider: LlmProviderName,
  modelSlug: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const catalogMatch = await prisma.aiModel
    .findFirst({
      where: {
        OR: [{ slug: modelSlug }, { providerSlug: provider }],
      },
      select: { inputPricePerM: true, outputPricePerM: true },
    })
    .catch(() => null)

  const rates = catalogMatch
    ? { input: catalogMatch.inputPricePerM, output: catalogMatch.outputPricePerM }
    : FALLBACK_RATES_PER_M[provider] || { input: 2.0, output: 8.0 }

  const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output
  return parseFloat(cost.toFixed(6))
}
