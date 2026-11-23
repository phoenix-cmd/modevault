import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const PREFS_PROVIDER_SLUG = "__user_preferences__"

const settingsPatchSchema = z.object({
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  quotaAlerts: z.boolean().optional(),
  renewalAlerts: z.boolean().optional(),
  billingAlerts: z.boolean().optional(),
  syncAlerts: z.boolean().optional(),
})

interface StoredPrefs {
  quotaAlerts: boolean
  renewalAlerts: boolean
  billingAlerts: boolean
  syncAlerts: boolean
}

const DEFAULT_PREFS: StoredPrefs = {
  quotaAlerts: true,
  renewalAlerts: true,
  billingAlerts: true,
  syncAlerts: false,
}

export async function GET() {
  try {
    const authUser = await requireAuthenticatedUser()
    const [user, prefRow] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          name: true,
          email: true,
          currency: true,
          timezone: true,
        },
      }),
      prisma.integrationCredential.findUnique({
        where: {
          userId_providerSlug: {
            userId: authUser.id,
            providerSlug: PREFS_PROVIDER_SLUG,
          },
        },
        select: { featuresJson: true },
      }),
    ])

    let prefs: StoredPrefs = { ...DEFAULT_PREFS }
    if (prefRow?.featuresJson) {
      try {
        const parsed = JSON.parse(prefRow.featuresJson) as Partial<StoredPrefs>
        prefs = {
          quotaAlerts: parsed.quotaAlerts ?? DEFAULT_PREFS.quotaAlerts,
          renewalAlerts: parsed.renewalAlerts ?? DEFAULT_PREFS.renewalAlerts,
          billingAlerts: parsed.billingAlerts ?? DEFAULT_PREFS.billingAlerts,
          syncAlerts: parsed.syncAlerts ?? DEFAULT_PREFS.syncAlerts,
        }
      } catch {
        prefs = { ...DEFAULT_PREFS }
      }
    }

    return NextResponse.json({
      data: {
        currency: user?.currency || "INR",
        timezone: user?.timezone || "Asia/Kolkata",
        ...prefs,
      },
    })
  } catch (err: unknown) {
    logger.error("Settings GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load settings")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await requireAuthenticatedUser()
    const parsed = await parseJson(req, settingsPatchSchema)
    if ("response" in parsed) return parsed.response
    const { currency, timezone, quotaAlerts, renewalAlerts, billingAlerts, syncAlerts } = parsed.data

    if (currency || timezone) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: {
          ...(currency ? { currency } : {}),
          ...(timezone ? { timezone } : {}),
        },
      })
    }

    const existingPref = await prisma.integrationCredential.findUnique({
      where: {
        userId_providerSlug: {
          userId: authUser.id,
          providerSlug: PREFS_PROVIDER_SLUG,
        },
      },
      select: { featuresJson: true },
    })

    let prevPrefs: StoredPrefs = { ...DEFAULT_PREFS }
    if (existingPref?.featuresJson) {
      try {
        prevPrefs = { ...DEFAULT_PREFS, ...(JSON.parse(existingPref.featuresJson) as Partial<StoredPrefs>) }
      } catch {}
    }

    const nextPrefs: StoredPrefs = {
      quotaAlerts: quotaAlerts ?? prevPrefs.quotaAlerts,
      renewalAlerts: renewalAlerts ?? prevPrefs.renewalAlerts,
      billingAlerts: billingAlerts ?? prevPrefs.billingAlerts,
      syncAlerts: syncAlerts ?? prevPrefs.syncAlerts,
    }

    await prisma.integrationCredential.upsert({
      where: {
        userId_providerSlug: {
          userId: authUser.id,
          providerSlug: PREFS_PROVIDER_SLUG,
        },
      },
      update: {
        featuresJson: JSON.stringify(nextPrefs),
      },
      create: {
        userId: authUser.id,
        providerSlug: PREFS_PROVIDER_SLUG,
        status: "manual",
        featuresJson: JSON.stringify(nextPrefs),
      },
    })

    const updatedUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { currency: true, timezone: true },
    })

    return NextResponse.json({
      data: {
        currency: updatedUser?.currency || "INR",
        timezone: updatedUser?.timezone || "Asia/Kolkata",
        ...nextPrefs,
      },
    })
  } catch (err: unknown) {
    logger.error("Settings PATCH failed", errorContext(err))
    return authErrorResponse(err, "Failed to save settings")
  }
}
