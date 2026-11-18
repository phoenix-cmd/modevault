import { NextResponse } from "next/server"
import { getCurrentUserOrDefault } from "@/lib/auth"
import { generateSuggestions } from "@/lib/suggestions"
import { logger, errorContext } from "@/lib/logger"

export async function GET() {
  try {
    const user = await getCurrentUserOrDefault()
    const suggestions = await generateSuggestions(user.id)
    return NextResponse.json({
      data: {
        suggestions,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error("Failed to generate suggestions", errorContext(err))
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 })
  }
}
