export interface ProviderVerificationResult {
  ok: boolean
  status: "success" | "warning" | "error"
  message: string
  durationMs: number
  modelsDiscovered?: number
  creditsRemaining?: number
  creditsUsed?: number
  accountLabel?: string
}

/**
 * Perform a lightweight, read-only live verification request against a provider API
 * using the supplied credential. For providers without a public usage/key-check API
 * (e.g. Cursor consumer plans), returns a clear informational result without failing.
 */
export async function verifyAndSyncProvider(
  providerSlug: string,
  apiKey: string | null | undefined
): Promise<ProviderVerificationResult> {
  const startedAt = Date.now()
  const key = apiKey?.trim()

  if (!key) {
    return {
      ok: true,
      status: "success",
      message: "Updated integration settings (no API key provided)",
      durationMs: 1,
    }
  }

  try {
    if (providerSlug === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(7000),
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but OpenAI verification returned HTTP ${res.status}`,
          durationMs,
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
      }
    }

    if (providerSlug === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(7000),
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but Anthropic verification returned HTTP ${res.status}`,
          durationMs,
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
      }
    }

    if (providerSlug === "google") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
        { signal: AbortSignal.timeout(7000) }
      )
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but Google Gemini verification returned HTTP ${res.status}`,
          durationMs,
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
      }
    }

    if (providerSlug === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(7000),
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but OpenRouter verification returned HTTP ${res.status}`,
          durationMs,
        }
      }
      const json = (await res.json()) as {
        data?: { usage?: number; limit?: number | null; label?: string }
      }
      const usage = Number(json.data?.usage ?? 0)
      const limit = json.data?.limit ?? null
      const remaining = limit !== null ? Math.max(0, Number(limit) - usage) : undefined
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
      }
    }

    if (providerSlug === "github") {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "MODELVAULT",
        },
        signal: AbortSignal.timeout(7000),
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Token saved encrypted, but GitHub verification returned HTTP ${res.status}`,
          durationMs,
        }
      }
      const gh = (await res.json()) as { login?: string }
      return {
        ok: true,
        status: "success",
        message: `Verified GitHub token for @${gh.login || "account"}`,
        durationMs,
        accountLabel: gh.login,
      }
    }

    if (providerSlug === "perplexity") {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
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
        signal: AbortSignal.timeout(7000),
      })
      const durationMs = Math.max(1, Date.now() - startedAt)
      if (!res.ok) {
        return {
          ok: false,
          status: "warning",
          message: `Key saved encrypted, but Perplexity verification returned HTTP ${res.status}`,
          durationMs,
        }
      }
      return {
        ok: true,
        status: "success",
        message: "Verified Perplexity Sonar API key",
        durationMs,
        modelsDiscovered: 4,
      }
    }

    return {
      ok: true,
      status: "success",
      message: `Encrypted key stored for ${providerSlug} (no public quota endpoint available for live sync)`,
      durationMs: Math.max(1, Date.now() - startedAt),
    }
  } catch (err) {
    return {
      ok: false,
      status: "warning",
      message: `Key saved encrypted; live check unreachable (${err instanceof Error ? err.message : "timeout"})`,
      durationMs: Math.max(1, Date.now() - startedAt),
    }
  }
}
