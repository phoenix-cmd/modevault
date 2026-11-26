import { prisma } from "@/lib/db"
import { decryptSecret } from "@/lib/crypto"
import {
  getProviderCapability,
  type CapabilityModelOption,
} from "@/lib/providers/capabilities"

export interface EnrichedCodingBinding {
  id: string
  label: string
  providerSlug: string
  providerName: string
  backendType: "direct_api" | "local_bridge" | "manual_unsupported"
  subscriptionId: string | null
  apiAccountId: string | null
  credentialId: string | null
  bridgeEndpoint: string | null
  defaultModel: string | null
  maxCostPerRun: number | null
  minBalanceGuardrail: number | null
  isEnabled: boolean
  hasLiveCredential: boolean
  canExecuteLive: boolean
  guardrailBlocked: boolean
  guardrailReason: string | null
  balance: number | null
  currency: string
  balanceSource: string
  syncedAt: string | null
  models: Array<CapabilityModelOption & { estimatedRunCostUsd: number }>
  capabilityNote: string
}

function estimateSingleRunCost(inputPerM: number, outputPerM: number): number {
  // Typical bounded multi-step agent run estimate (~6k input, ~1.8k output tokens)
  const cost = (6000 / 1_000_000) * inputPerM + (1800 / 1_000_000) * outputPerM
  return Number(cost.toFixed(4))
}

function hasServerEnvKey(providerSlug: string): boolean {
  if (providerSlug === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim())
  if (providerSlug === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY?.trim())
  if (providerSlug === "google") return Boolean(process.env.GEMINI_API_KEY?.trim())
  if (providerSlug === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY?.trim())
  if (providerSlug === "huggingface") return Boolean(process.env.HUGGINGFACE_API_KEY?.trim())
  return false
}

export async function syncAndListCodingBindings(userId: string): Promise<EnrichedCodingBinding[]> {
  const [accounts, subscriptions, credentials, dbModels, existingBindings, snapshots] =
    await Promise.all([
      prisma.apiAccount.findMany({
        where: { userId },
        include: { provider: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.subscription.findMany({
        where: { userId },
        include: { provider: true, plan: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.integrationCredential.findMany({
        where: { userId, NOT: { providerSlug: "__user_preferences__" } },
      }),
      prisma.aiModel.findMany({ orderBy: { outputPricePerM: "asc" } }),
      prisma.codingCredentialBinding.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.usageSnapshot.findMany({
        where: { userId },
        orderBy: { syncedAt: "desc" },
        take: 100,
      }),
    ])

  const credBySlug = new Map(credentials.map((c) => [c.providerSlug, c]))

  // Auto-sync bindings for existing API accounts if none yet exist
  for (const acc of accounts) {
    const slug = acc.provider.slug
    const cap = getProviderCapability(slug)
    const cred = credBySlug.get(slug)
    const already = existingBindings.find((b) => b.apiAccountId === acc.id)
    if (!already) {
      const created = await prisma.codingCredentialBinding.create({
        data: {
          userId,
          label: acc.accountName || `${acc.provider.name} API`,
          providerSlug: slug,
          backendType: cap.canCode ? "direct_api" : "manual_unsupported",
          apiAccountId: acc.id,
          credentialId: cred?.id ?? null,
          defaultModel: cap.supportedModels[0]?.slug || null,
          allowedModelsJson: JSON.stringify(cap.supportedModels.map((m) => m.slug)),
          maxCostPerRun: 2.0,
          minBalanceGuardrail: 1.0,
          isEnabled: true,
        },
      })
      existingBindings.push(created)
    } else if (cred && already.credentialId !== cred.id) {
      await prisma.codingCredentialBinding.update({
        where: { id: already.id },
        data: { credentialId: cred.id },
      })
      already.credentialId = cred.id
    }
  }

  // Ensure consumer coding subscriptions (Cursor, Antigravity, Copilot, Windsurf) appear as manual_unsupported
  for (const sub of subscriptions) {
    const slug = sub.provider.slug
    const already = existingBindings.find((b) => b.subscriptionId === sub.id)
    if (!already && ["cursor", "antigravity", "windsurf", "github-copilot"].includes(slug)) {
      const created = await prisma.codingCredentialBinding.create({
        data: {
          userId,
          label: `${sub.customPlanName || sub.plan?.name || sub.provider.name} (Manual / Unsupported)`,
          providerSlug: slug,
          backendType: "manual_unsupported",
          subscriptionId: sub.id,
          defaultModel: `${slug}-manual`,
          isEnabled: true,
        },
      })
      existingBindings.push(created)
    }
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]))
  const latestSnapByAccount = new Map<string, (typeof snapshots)[number]>()
  for (const snap of snapshots) {
    if (snap.apiAccountId && !latestSnapByAccount.has(snap.apiAccountId)) {
      latestSnapByAccount.set(snap.apiAccountId, snap)
    }
  }

  return existingBindings.map((binding) => {
    const slug = binding.providerSlug
    const cap = getProviderCapability(slug)
    const acc = binding.apiAccountId ? accountById.get(binding.apiAccountId) : undefined
    const cred = credBySlug.get(slug)
    const snap = acc ? latestSnapByAccount.get(acc.id) : undefined

    let decryptedKey = false
    if (cred?.encryptedKey && cred.status !== "not_connected") {
      try {
        decryptedKey = Boolean(decryptSecret(cred.encryptedKey).trim())
      } catch {
        decryptedKey = false
      }
    }

    const hasLiveCredential =
      binding.backendType === "local_bridge"
        ? Boolean(binding.bridgeEndpoint)
        : binding.backendType === "direct_api"
          ? decryptedKey || hasServerEnvKey(slug)
          : false

    const balance = acc ? (acc.prepaidBalance ?? 0) : null
    const currency = acc?.currency || "USD"
    const balanceSource = snap?.dataSource || (acc?.lastSyncStatus === "success" ? "live_api_sync" : "manual")
    const syncedAt = (snap?.syncedAt || acc?.lastSyncAt)?.toISOString() || null
    const minGuard = binding.minBalanceGuardrail ?? 1.0

    let guardrailBlocked = false
    let guardrailReason: string | null = null
    if (binding.backendType === "manual_unsupported") {
      guardrailBlocked = true
      guardrailReason = `${cap.displayName} is manual/unsupported for direct execution. Switch to a direct API key or configure a sanctioned local bridge.`
    } else if (acc && balance !== null && balance < minGuard && (balanceSource === "live_api_sync" || balance > 0 || acc.integrationStatus === "connected")) {
      // If prepaid balance was synced or explicitly set below threshold, warn/block if zero or below guardrail
      if (balance <= 0 && balanceSource === "live_api_sync") {
        guardrailBlocked = true
        guardrailReason = `Live prepaid balance (${balance.toFixed(2)} ${currency}) is below guardrail (${minGuard.toFixed(2)} ${currency}). Replenish credits first.`
      } else if (balance > 0 && balance < minGuard) {
        guardrailBlocked = true
        guardrailReason = `Balance (${balance.toFixed(2)} ${currency}) is below guardrail (${minGuard.toFixed(2)} ${currency}).`
      }
    }

    const dbModelsForProvider = dbModels
      .filter((m) => m.providerSlug === slug)
      .map((m) => ({
        slug: m.slug,
        name: m.name,
        tags: (m.outputPricePerM <= 2 ? ["coding", "fast", "cheap"] : ["coding", "reasoning"]) as CapabilityModelOption["tags"],
        inputPerM: m.inputPricePerM,
        outputPerM: m.outputPricePerM,
        contextTokens: m.contextTokens,
      }))

    const mergedModels = new Map<string, CapabilityModelOption>()
    for (const m of cap.supportedModels) mergedModels.set(m.slug, m)
    for (const m of dbModelsForProvider) {
      if (!mergedModels.has(m.slug)) mergedModels.set(m.slug, m)
    }

    const modelsWithEstimates = Array.from(mergedModels.values()).map((m) => ({
      ...m,
      estimatedRunCostUsd: estimateSingleRunCost(m.inputPerM, m.outputPerM),
    }))

    return {
      id: binding.id,
      label: binding.label,
      providerSlug: slug,
      providerName: cap.displayName,
      backendType: binding.backendType as EnrichedCodingBinding["backendType"],
      subscriptionId: binding.subscriptionId,
      apiAccountId: binding.apiAccountId,
      credentialId: binding.credentialId || cred?.id || null,
      bridgeEndpoint: binding.bridgeEndpoint,
      defaultModel: binding.defaultModel || modelsWithEstimates[0]?.slug || null,
      maxCostPerRun: binding.maxCostPerRun,
      minBalanceGuardrail: binding.minBalanceGuardrail,
      isEnabled: binding.isEnabled,
      hasLiveCredential,
      canExecuteLive:
        binding.isEnabled &&
        binding.backendType !== "manual_unsupported" &&
        hasLiveCredential &&
        !guardrailBlocked,
      guardrailBlocked,
      guardrailReason,
      balance,
      currency,
      balanceSource,
      syncedAt,
      models: modelsWithEstimates,
      capabilityNote: cap.capabilitiesNote,
    }
  })
}
