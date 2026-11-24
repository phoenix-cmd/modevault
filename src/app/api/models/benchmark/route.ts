import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import {
  estimateTokenCost,
  invokeLlmCompletion,
  resolveUserProviderKey,
  type LlmProviderName,
} from "@/lib/llm-provider"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const benchmarkSchema = z.object({
  modelSlug: z.string().trim().min(1).max(120),
  prompt: z.string().trim().min(1).max(4000),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, benchmarkSchema)
    if ("response" in parsed) return parsed.response
    const { modelSlug, prompt } = parsed.data

    const catalogModel = await prisma.aiModel.findFirst({
      where: { slug: modelSlug },
    })

    const providerHint = (catalogModel?.providerSlug || "anthropic") as LlmProviderName
    const validProviders: LlmProviderName[] = ["anthropic", "openai", "google", "openrouter"]
    const preferred = validProviders.includes(providerHint)
      ? [providerHint]
      : validProviders

    const providerKey = await resolveUserProviderKey(user.id, preferred)

    if (providerKey && providerKey.provider === providerHint) {
      try {
        const res = await invokeLlmCompletion({
          provider: providerKey.provider,
          apiKey: providerKey.apiKey,
          model: catalogModel?.slug || providerKey.model,
          maxTokens: 600,
          timeoutMs: 15000,
          systemPrompt: "Respond concisely with clean code or technical explanation for this benchmark prompt.",
          userPrompt: prompt,
        })

        const speedTokensPerSec = Math.max(
          1,
          Math.round((res.outputTokens || 10) / Math.max(0.1, res.durationMs / 1000))
        )
        const estimatedCost = await estimateTokenCost(
          providerKey.provider,
          res.model,
          res.inputTokens,
          res.outputTokens
        )

        return NextResponse.json({
          data: {
            isLive: true,
            provider: providerKey.provider,
            model: res.model,
            output: res.content,
            latencyMs: res.durationMs,
            speedTokensPerSec,
            inputTokens: res.inputTokens,
            outputTokens: res.outputTokens,
            estimatedCost,
          },
        })
      } catch (err) {
        logger.warn("Live benchmark failed; returning stored sample", errorContext(err))
      }
    }

    return NextResponse.json({
      data: {
        isLive: false,
        provider: catalogModel?.providerName || "Reference Catalog",
        model: catalogModel?.name || modelSlug,
        output:
          catalogModel?.sampleResponse ||
          `// Stored reference preview for ${modelSlug}\n// Prompt: ${prompt}\n// Connect a ${providerHint} API key in Integrations to execute live benchmarks.`,
        latencyMs: catalogModel?.latencyMs ?? 600,
        speedTokensPerSec: catalogModel?.speedTokensPerSec ?? 60,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        notice: `Reference sample shown — connect your ${catalogModel?.providerName || providerHint} API key in Integrations to run a live benchmark.`,
      },
    })
  } catch (err: unknown) {
    logger.error("Model benchmark POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to run model benchmark")
  }
}
