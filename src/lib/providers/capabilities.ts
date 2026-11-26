export type CapabilityAuthMode =
  | "api_key"
  | "oauth"
  | "device_code"
  | "local_bridge"
  | "manual"

export type CapabilitySyncCadence = "5m" | "15m" | "1h" | "6h" | "manual"

export type CapabilityTermsStatus =
  | "official"
  | "limited"
  | "manual_only"
  | "unsupported"

export interface CapabilityModelOption {
  slug: string
  name: string
  tags: Array<"coding" | "reasoning" | "fast" | "cheap">
  inputPerM: number
  outputPerM: number
  contextTokens: number
}

export interface ProviderCapabilitySpec {
  providerSlug: string
  displayName: string
  canSyncUsage: boolean
  canSyncCredits: boolean
  canReplenish: boolean
  canCode: boolean
  authMode: CapabilityAuthMode
  syncCadence: CapabilitySyncCadence
  termsStatus: CapabilityTermsStatus
  billingUrl: string | null
  capabilitiesNote: string
  supportedModels: CapabilityModelOption[]
}

export const PROVIDER_CAPABILITY_MATRIX: Record<string, ProviderCapabilitySpec> = {
  openrouter: {
    providerSlug: "openrouter",
    displayName: "OpenRouter",
    canSyncUsage: true,
    canSyncCredits: true,
    canReplenish: false,
    canCode: true,
    authMode: "api_key",
    syncCadence: "15m",
    termsStatus: "official",
    billingUrl: "https://openrouter.ai/settings/credits",
    capabilitiesNote:
      "Official /api/v1/credits and /api/v1/auth/key endpoints sync live spend and remaining credits; unified OpenAI-compatible coding API.",
    supportedModels: [
      {
        slug: "anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet (via OpenRouter)",
        tags: ["coding", "reasoning"],
        inputPerM: 3.0,
        outputPerM: 15.0,
        contextTokens: 200000,
      },
      {
        slug: "openai/gpt-4o-mini",
        name: "GPT-4o mini (via OpenRouter)",
        tags: ["coding", "fast", "cheap"],
        inputPerM: 0.15,
        outputPerM: 0.6,
        contextTokens: 128000,
      },
      {
        slug: "deepseek/deepseek-chat-v3-0324",
        name: "DeepSeek V3 (via OpenRouter)",
        tags: ["coding", "cheap"],
        inputPerM: 0.27,
        outputPerM: 1.1,
        contextTokens: 163840,
      },
    ],
  },
  openai: {
    providerSlug: "openai",
    displayName: "OpenAI",
    canSyncUsage: true,
    canSyncCredits: false,
    canReplenish: false,
    canCode: true,
    authMode: "api_key",
    syncCadence: "15m",
    termsStatus: "limited",
    billingUrl: "https://platform.openai.com/settings/organization/billing/overview",
    capabilitiesNote:
      "Usage & cost sync uses official /v1/organization/usage & costs endpoints (requires Organization Admin key). Direct coding works with standard API keys.",
    supportedModels: [
      {
        slug: "gpt-4o",
        name: "GPT-4o",
        tags: ["coding", "reasoning"],
        inputPerM: 2.5,
        outputPerM: 10.0,
        contextTokens: 128000,
      },
      {
        slug: "gpt-4o-mini",
        name: "GPT-4o mini",
        tags: ["coding", "fast", "cheap"],
        inputPerM: 0.15,
        outputPerM: 0.6,
        contextTokens: 128000,
      },
      {
        slug: "o3-mini",
        name: "o3-mini",
        tags: ["reasoning", "coding"],
        inputPerM: 1.1,
        outputPerM: 4.4,
        contextTokens: 200000,
      },
    ],
  },
  anthropic: {
    providerSlug: "anthropic",
    displayName: "Anthropic",
    canSyncUsage: true,
    canSyncCredits: false,
    canReplenish: false,
    canCode: true,
    authMode: "api_key",
    syncCadence: "15m",
    termsStatus: "limited",
    billingUrl: "https://console.anthropic.com/settings/billing",
    capabilitiesNote:
      "Usage sync uses /v1/organizations/usage_report/messages (requires Admin API key sk-ant-admin-...). Direct Messages API coding works with standard API keys.",
    supportedModels: [
      {
        slug: "claude-3-7-sonnet-latest",
        name: "Claude 3.7 Sonnet",
        tags: ["coding", "reasoning"],
        inputPerM: 3.0,
        outputPerM: 15.0,
        contextTokens: 200000,
      },
      {
        slug: "claude-3-5-sonnet-latest",
        name: "Claude 3.5 Sonnet",
        tags: ["coding", "reasoning"],
        inputPerM: 3.0,
        outputPerM: 15.0,
        contextTokens: 200000,
      },
      {
        slug: "claude-3-5-haiku-latest",
        name: "Claude 3.5 Haiku",
        tags: ["fast", "cheap"],
        inputPerM: 0.8,
        outputPerM: 4.0,
        contextTokens: 200000,
      },
    ],
  },
  google: {
    providerSlug: "google",
    displayName: "Google Gemini",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: true,
    authMode: "api_key",
    syncCadence: "1h",
    termsStatus: "limited",
    billingUrl: "https://aistudio.google.com/app/plan_information",
    capabilitiesNote:
      "Gemini Developer API verifies models & runs Studio coding. Usage/billing totals require manual entry or Google Cloud Billing export.",
    supportedModels: [
      {
        slug: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        tags: ["coding", "reasoning"],
        inputPerM: 1.25,
        outputPerM: 10.0,
        contextTokens: 1000000,
      },
      {
        slug: "gemini-2.0-flash",
        name: "Gemini 2.0 Flash",
        tags: ["coding", "fast", "cheap"],
        inputPerM: 0.1,
        outputPerM: 0.4,
        contextTokens: 1000000,
      },
    ],
  },
  huggingface: {
    providerSlug: "huggingface",
    displayName: "Hugging Face",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: true,
    authMode: "api_key",
    syncCadence: "manual",
    termsStatus: "limited",
    billingUrl: "https://huggingface.co/settings/billing",
    capabilitiesNote:
      "Token verification via /api/whoami-v2 and Inference Router coding supported. Billing usage requires manual tracking.",
    supportedModels: [
      {
        slug: "Qwen/Qwen2.5-Coder-32B-Instruct",
        name: "Qwen 2.5 Coder 32B",
        tags: ["coding", "cheap"],
        inputPerM: 0.2,
        outputPerM: 0.6,
        contextTokens: 32768,
      },
    ],
  },
  perplexity: {
    providerSlug: "perplexity",
    displayName: "Perplexity",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "api_key",
    syncCadence: "manual",
    termsStatus: "limited",
    billingUrl: "https://www.perplexity.ai/settings/api",
    capabilitiesNote:
      "API key check supported; no public usage/credit/top-up API. Track spend and receipts manually.",
    supportedModels: [],
  },
  github: {
    providerSlug: "github",
    displayName: "GitHub",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "oauth",
    syncCadence: "manual",
    termsStatus: "official",
    billingUrl: "https://github.com/settings/billing",
    capabilitiesNote:
      "Used for Git repository cloning and remote Pull Requests. No automated Copilot seat usage sync via standard PAT.",
    supportedModels: [],
  },
  "github-copilot": {
    providerSlug: "github-copilot",
    displayName: "GitHub Copilot",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "manual",
    syncCadence: "manual",
    termsStatus: "manual_only",
    billingUrl: "https://github.com/settings/copilot",
    capabilitiesNote:
      "Consumer/IDE subscription tracked manually. Cannot serve as an external Studio coding backend unless paired with an authorized API key or local bridge.",
    supportedModels: [],
  },
  cursor: {
    providerSlug: "cursor",
    displayName: "Cursor",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "manual",
    syncCadence: "manual",
    termsStatus: "manual_only",
    billingUrl: "https://cursor.com/settings",
    capabilitiesNote:
      "Consumer IDE subscription. MODELVAULT does not scrape or bypass Cursor app auth; usage is imported manually or bridged via a user-authorized local CLI endpoint.",
    supportedModels: [],
  },
  antigravity: {
    providerSlug: "antigravity",
    displayName: "Antigravity",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "manual",
    syncCadence: "manual",
    termsStatus: "manual_only",
    billingUrl: "https://antigravity.google",
    capabilitiesNote:
      "Consumer IDE plan tracked manually. Use a direct Gemini/Vertex API key or a user-authorized local CLI bridge for Studio runs.",
    supportedModels: [],
  },
  windsurf: {
    providerSlug: "windsurf",
    displayName: "Windsurf",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "manual",
    syncCadence: "manual",
    termsStatus: "manual_only",
    billingUrl: "https://windsurf.com/profile",
    capabilitiesNote:
      "Consumer IDE plan tracked manually without automated usage/recharge APIs.",
    supportedModels: [],
  },
}

export function getProviderCapability(providerSlug: string): ProviderCapabilitySpec {
  const key = providerSlug.trim().toLowerCase()
  const known = PROVIDER_CAPABILITY_MATRIX[key]
  if (known) return known
  return {
    providerSlug: key || "unknown",
    displayName: providerSlug || "Unknown Provider",
    canSyncUsage: false,
    canSyncCredits: false,
    canReplenish: false,
    canCode: false,
    authMode: "manual",
    syncCadence: "manual",
    termsStatus: "unsupported",
    billingUrl: null,
    capabilitiesNote:
      "Unsupported provider: no official usage, credit, replenishment, or coding backend adapter is registered.",
    supportedModels: [],
  }
}

export function listProviderCapabilities(): ProviderCapabilitySpec[] {
  return Object.values(PROVIDER_CAPABILITY_MATRIX)
}
