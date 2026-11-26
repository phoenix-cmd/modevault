import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { syncAndListCodingBindings } from "@/lib/coding-bindings"
import { validateLoopbackBridgeUrl } from "@/lib/providers/adapter"
import { parseJson } from "@/lib/validation"

const bindingCreateSchema = z.object({
  label: z.string().trim().min(1).max(160),
  providerSlug: z.string().trim().min(1).max(80),
  backendType: z.enum(["direct_api", "local_bridge", "manual_unsupported"]),
  apiAccountId: z.string().max(128).nullable().optional(),
  subscriptionId: z.string().max(128).nullable().optional(),
  bridgeEndpoint: z.string().max(300).nullable().optional(),
  defaultModel: z.string().max(160).nullable().optional(),
  maxCostPerRun: z.coerce.number().finite().positive().max(1000).optional(),
  minBalanceGuardrail: z.coerce.number().finite().nonnegative().max(10000).optional(),
})

const bindingPatchSchema = z.object({
  id: z.string().min(1).max(128),
  isEnabled: z.boolean().optional(),
  defaultModel: z.string().max(160).nullable().optional(),
  bridgeEndpoint: z.string().max(300).nullable().optional(),
  maxCostPerRun: z.coerce.number().finite().positive().max(1000).optional(),
  minBalanceGuardrail: z.coerce.number().finite().nonnegative().max(10000).optional(),
})

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const bindings = await syncAndListCodingBindings(user.id)
    return NextResponse.json({ data: bindings })
  } catch (err) {
    return authErrorResponse(err, "Failed to load coding bindings")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, bindingCreateSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    let validatedEndpoint: string | null = null
    if (body.backendType === "local_bridge") {
      if (!body.bridgeEndpoint?.trim()) {
        return NextResponse.json(
          { error: "bridgeEndpoint is required for local_bridge bindings" },
          { status: 422 }
        )
      }
      try {
        validatedEndpoint = validateLoopbackBridgeUrl(body.bridgeEndpoint).origin
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Invalid local bridge URL" },
          { status: 422 }
        )
      }
    }

    if (body.apiAccountId) {
      const ownedAcc = await prisma.apiAccount.findFirst({
        where: { id: body.apiAccountId, userId: user.id },
      })
      if (!ownedAcc) {
        return NextResponse.json({ error: "API account not found" }, { status: 404 })
      }
    }

    if (body.subscriptionId) {
      const ownedSub = await prisma.subscription.findFirst({
        where: { id: body.subscriptionId, userId: user.id },
      })
      if (!ownedSub) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
      }
    }

    const created = await prisma.codingCredentialBinding.create({
      data: {
        userId: user.id,
        label: body.label,
        providerSlug: body.providerSlug.toLowerCase(),
        backendType: body.backendType,
        apiAccountId: body.apiAccountId ?? null,
        subscriptionId: body.subscriptionId ?? null,
        bridgeEndpoint: validatedEndpoint,
        defaultModel: body.defaultModel ?? null,
        maxCostPerRun: body.maxCostPerRun ?? 2.0,
        minBalanceGuardrail: body.minBalanceGuardrail ?? 1.0,
        isEnabled: true,
      },
    })

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err, "Failed to create coding binding")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, bindingPatchSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    const existing = await prisma.codingCredentialBinding.findFirst({
      where: { id: body.id, userId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: "Coding binding not found" }, { status: 404 })
    }

    let bridgeEndpoint = existing.bridgeEndpoint
    if (body.bridgeEndpoint !== undefined) {
      if (body.bridgeEndpoint === null || body.bridgeEndpoint === "") {
        bridgeEndpoint = null
      } else {
        try {
          bridgeEndpoint = validateLoopbackBridgeUrl(body.bridgeEndpoint).origin
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : "Invalid local bridge URL" },
            { status: 422 }
          )
        }
      }
    }

    const updated = await prisma.codingCredentialBinding.update({
      where: { id: existing.id },
      data: {
        ...(body.isEnabled !== undefined && { isEnabled: body.isEnabled }),
        ...(body.defaultModel !== undefined && { defaultModel: body.defaultModel }),
        ...(body.maxCostPerRun !== undefined && { maxCostPerRun: body.maxCostPerRun }),
        ...(body.minBalanceGuardrail !== undefined && { minBalanceGuardrail: body.minBalanceGuardrail }),
        bridgeEndpoint,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (err) {
    return authErrorResponse(err, "Failed to update coding binding")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const id = new URL(req.url).searchParams.get("id")?.trim()
    if (!id) {
      return NextResponse.json({ error: "Binding id is required" }, { status: 400 })
    }
    const deleted = await prisma.codingCredentialBinding.deleteMany({
      where: { id, userId: user.id },
    })
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Coding binding not found" }, { status: 404 })
    }
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (err) {
    return authErrorResponse(err, "Failed to delete coding binding")
  }
}
