import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { logger, errorContext } from "@/lib/logger"

export async function GET() {
  try {
    const agents = await prisma.agentDefinition.findMany({
      orderBy: { isDefault: "desc" },
    })

    const formatted = agents.map((a) => ({
      ...a,
      capabilities: a.capabilitiesJson ? JSON.parse(a.capabilitiesJson) : [],
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: unknown) {
    logger.error("Failed to load agents catalog", errorContext(err))
    return NextResponse.json({ error: "Failed to load agents catalog" }, { status: 500 })
  }
}
