import { NextResponse } from "next/server"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { syncSubscriptionRenewals } from "@/lib/subscription-lifecycle"
import { logger, errorContext } from "@/lib/logger"

export async function POST() {
  try {
    const user = await requireAuthenticatedUser()
    const summary = await syncSubscriptionRenewals(user.id)
    return NextResponse.json({ data: summary })
  } catch (err: unknown) {
    logger.error("Subscription sync POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to process subscription renewals")
  }
}
