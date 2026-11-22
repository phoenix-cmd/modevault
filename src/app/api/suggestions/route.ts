import { NextResponse } from "next/server"
import { requireAuthenticatedUser, authErrorResponse, isAuthError } from "@/lib/auth"
import { generateSuggestions } from "@/lib/suggestions"
import { logger, errorContext } from "@/lib/logger"

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const suggestions = await generateSuggestions(user.id)
    return NextResponse.json({
      data: {
        suggestions,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    if (!isAuthError(err)) {
      logger.error("Failed to generate suggestions", errorContext(err))
    }
    return authErrorResponse(err, "Failed to generate suggestions")
  }
}
