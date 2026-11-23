import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireOrganizationAccess, resolveUserDefaultWorkspace } from "@/lib/permissions"
import { emailSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

export type UiRole = "Owner" | "Lead" | "Developer" | "Viewer"

function dbRoleToUiRole(dbRole: string): UiRole {
  if (dbRole === "owner") return "Owner"
  if (dbRole === "admin") return "Lead"
  if (dbRole === "member") return "Developer"
  return "Viewer"
}

function uiRoleToDbRole(uiRole: UiRole): "owner" | "admin" | "member" | "viewer" {
  if (uiRole === "Owner") return "owner"
  if (uiRole === "Lead") return "admin"
  if (uiRole === "Developer") return "member"
  return "viewer"
}

function capabilitiesForRole(uiRole: UiRole) {
  if (uiRole === "Owner" || uiRole === "Lead") {
    return { canDispatch: true, canMerge: true, canViewBilling: true }
  }
  if (uiRole === "Developer") {
    return { canDispatch: true, canMerge: false, canViewBilling: false }
  }
  return { canDispatch: false, canMerge: false, canViewBilling: false }
}

const inviteMemberSchema = z.object({
  organizationId: z.string().min(1).max(128).optional(),
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  role: z.enum(["Owner", "Lead", "Developer", "Viewer"]),
})

const updatePolicySchema = z.object({
  organizationId: z.string().min(1).max(128).optional(),
  members: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        role: z.enum(["Owner", "Lead", "Developer", "Viewer"]),
        canDispatch: z.boolean().optional(),
        canMerge: z.boolean().optional(),
        canViewBilling: z.boolean().optional(),
      })
    )
    .min(1)
    .max(200),
})

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const requestedOrgId = new URL(req.url).searchParams.get("organizationId")

    let organizationId: string
    if (requestedOrgId) {
      await requireOrganizationAccess(requestedOrgId, user.id, "viewer")
      organizationId = requestedOrgId
    } else {
      const def = await resolveUserDefaultWorkspace(user.id, "viewer")
      organizationId = def.organizationId
    }

    const memberships = await prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    const members = memberships.map((m) => {
      const uiRole = dbRoleToUiRole(m.role)
      return {
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        name: m.user.name || m.user.email.split("@")[0] || "Team Member",
        email: m.user.email,
        role: uiRole,
        ...capabilitiesForRole(uiRole),
      }
    })

    return NextResponse.json({
      data: {
        organizationId,
        members,
      },
    })
  } catch (err: unknown) {
    logger.error("Members GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load team members")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, inviteMemberSchema)
    if ("response" in parsed) return parsed.response
    const { organizationId: requestedOrgId, name, email, role } = parsed.data

    const organizationId = requestedOrgId
      ? (await requireOrganizationAccess(requestedOrgId, user.id, "admin")).organizationId
      : (await resolveUserDefaultWorkspace(user.id, "admin")).organizationId

    let targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          name,
          email,
          currency: "INR",
          timezone: "Asia/Kolkata",
        },
        select: { id: true, name: true, email: true },
      })
    }

    const dbRole = uiRoleToDbRole(role)
    const membership = await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId,
          userId: targetUser.id,
        },
      },
      update: {
        role: dbRole,
      },
      create: {
        organizationId,
        userId: targetUser.id,
        role: dbRole,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    const uiRole = dbRoleToUiRole(membership.role)
    return NextResponse.json(
      {
        data: {
          id: membership.id,
          userId: membership.userId,
          organizationId: membership.organizationId,
          name: membership.user.name || name,
          email: membership.user.email,
          role: uiRole,
          ...capabilitiesForRole(uiRole),
        },
      },
      { status: 201 }
    )
  } catch (err: unknown) {
    logger.error("Members POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to invite team member")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, updatePolicySchema)
    if ("response" in parsed) return parsed.response
    const { organizationId: requestedOrgId, members } = parsed.data

    const organizationId = requestedOrgId
      ? (await requireOrganizationAccess(requestedOrgId, user.id, "admin")).organizationId
      : (await resolveUserDefaultWorkspace(user.id, "admin")).organizationId

    for (const item of members) {
      const existing = await prisma.membership.findFirst({
        where: { id: item.id, organizationId },
      })
      if (!existing) continue

      // Map capability toggles or explicit role selection to the closest DB role
      let nextUiRole: UiRole = item.role
      if (item.role !== "Owner") {
        if (item.canMerge || item.canViewBilling) {
          nextUiRole = "Lead"
        } else if (item.canDispatch) {
          nextUiRole = "Developer"
        } else if (item.canDispatch === false && item.canMerge === false && item.canViewBilling === false) {
          nextUiRole = "Viewer"
        }
      }

      await prisma.membership.update({
        where: { id: existing.id },
        data: { role: uiRoleToDbRole(nextUiRole) },
      })
    }

    return NextResponse.json({ data: { updated: true } })
  } catch (err: unknown) {
    logger.error("Members PATCH failed", errorContext(err))
    return authErrorResponse(err, "Failed to update permissions policy")
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const membershipId = new URL(req.url).searchParams.get("id")
    if (!membershipId) {
      return NextResponse.json({ error: "Membership id is required" }, { status: 400 })
    }

    const existing = await prisma.membership.findUnique({
      where: { id: membershipId },
    })
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    await requireOrganizationAccess(existing.organizationId, user.id, "admin")

    if (existing.role === "owner") {
      const ownerCount = await prisma.membership.count({
        where: { organizationId: existing.organizationId, role: "owner" },
      })
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the only owner of an organization" },
          { status: 409 }
        )
      }
    }

    await prisma.membership.delete({ where: { id: existing.id } })
    return NextResponse.json({ data: { deleted: true, id: existing.id } })
  } catch (err: unknown) {
    logger.error("Members DELETE failed", errorContext(err))
    return authErrorResponse(err, "Failed to remove team member")
  }
}
