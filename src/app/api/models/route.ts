import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logger, errorContext } from "@/lib/logger"

export async function GET() {
  try {
    const models = await prisma.aiModel.findMany({
      orderBy: [{ providerName: "asc" }, { name: "asc" }],
    })
    return NextResponse.json({
      data: models.map((model) => ({
        id: model.slug,
        slug: model.slug,
        name: model.name,
        provider: model.providerName,
        providerSlug: model.providerSlug,
        contextTokens: model.contextTokens,
        inputPricePerM: model.inputPricePerM,
        outputPricePerM: model.outputPricePerM,
        cachedPricePerM: model.cachedPricePerM,
        speedTokensPerSec: model.speedTokensPerSec,
        latencyMs: model.latencyMs,
        bestFor: model.bestFor,
        status: model.status,
        sampleResponse: model.sampleResponse || "",
      })),
    })
  } catch (err) {
    logger.error("Failed to load model catalog", errorContext(err))
    return NextResponse.json({ error: "Failed to load model catalog" }, { status: 500 })
  }
}
