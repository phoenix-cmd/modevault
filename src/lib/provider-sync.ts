import { getProviderAdapter } from "@/lib/providers/adapter"

export interface ProviderVerificationResult {
  ok: boolean
  status: "success" | "warning" | "error"
  message: string
  durationMs: number
  modelsDiscovered?: number
  creditsRemaining?: number
  creditsUsed?: number
  accountLabel?: string
  dataSource?: "live_api_sync" | "manual" | "unsupported"
}

/**
 * Perform a lightweight, read-only live verification request against a provider adapter
 * using the supplied credential.
 */
export async function verifyAndSyncProvider(
  providerSlug: string,
  apiKey: string | null | undefined
): Promise<ProviderVerificationResult> {
  const key = apiKey?.trim()
  if (!key) {
    return {
      ok: true,
      status: "success",
      message: "Updated integration settings (no API key provided)",
      durationMs: 1,
      dataSource: "manual",
    }
  }

  const adapter = getProviderAdapter(providerSlug)
  const result = await adapter.verifyCredentials({ providerSlug, apiKey: key })
  return {
    ok: result.ok,
    status: result.status,
    message: result.message,
    durationMs: result.durationMs,
    modelsDiscovered: result.modelsDiscovered,
    creditsRemaining: result.creditsRemaining,
    creditsUsed: result.creditsUsed,
    accountLabel: result.accountLabel,
    dataSource: result.dataSource,
  }
}
