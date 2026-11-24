import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireOrganizationAccess } from "@/lib/permissions"
import { idSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

const orgCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9-]+$/, "Slug may only contain letters, digits, and hyphens"),
})

const orgWorkspaceActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_workspace"),
    organizationId: idSchema,
    name: z.string().trim().min(1).max(120),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9-]+$/, "Slug may only contain letters, digits, and hyphens")
      .optional(),
  }),
  z.object({
    action: z.literal("delete_workspace"),
    organizationId: idSchema,
    workspaceId: idSchema,
  }),
  z.object({
    action: z.literal("rename_organization"),
    organizationId: idSchema,
    name: z.string().trim().min(1).max(120),
  }),
  z.object({
    action: z.literal("delete_organization"),
    organizationId: idSchema,
  }),
])

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const orgs = await prisma.organization.findMany({
      where: {
        memberships: {
          some: { userId: user.id },
        },
      },
      include: {
        workspaces: true,
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ data: orgs })
  } catch (err: unknown) {
    logger.error("Organizations GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to load organizations")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, orgCreateSchema)
    if ("response" in parsed) return parsed.response
    const { name, slug } = parsed.data

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-")

    const org = await prisma.organization.create({
      data: {
        name,
        slug: cleanSlug,
        memberships: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
        workspaces: {
          create: {
            name: "Default Workspace",
            slug: "default",
            isDefault: true,
          },
        },
      },
      include: {
        workspaces: true,
        memberships: {
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
        },
      },
    })

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (err: unknown) {
    logger.error("Organizations POST failed", errorContext(err))
    return authErrorResponse(err, "Failed to create organization")
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, orgWorkspaceActionSchema)
    if ("response" in parsed) return parsed.response
    const body = parsed.data

    await requireOrganizationAccess(body.organizationId, user.id, "admin")

    if (body.action === "rename_organization") {
      const updated = await prisma.organization.update({
        where: { id: body.organizationId },
        data: { name: body.name },
      })
      return NextResponse.json({ data: updated })
    }

    if (body.action === "delete_organization") {
      await requireOrganizationAccess(body.organizationId, user.id, "owner")
      const userOrgCount = await prisma.membership.count({
        where: { userId: user.id },
      })
      if (userOrgCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete your only remaining organization" },
          { status: 409 }
        )
      }
      await prisma.organization.delete({ where: { id: body.organizationId } })
      return NextResponse.json({ data: { deleted: true, organizationId: body.organizationId } })
    }

    if (body.action === "create_workspace") {
      const wsSlug = (
        body.slug ||
        body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
        `ws-${Date.now().toString(36)}`
      ).toLowerCase()

      const workspace = await prisma.workspace.create({
        data: {
          organizationId: body.organizationId,
          name: body.name,
          slug: wsSlug,
          isDefault: false,
        },
      })
      return NextResponse.json({ data: workspace }, { status: 201 })
    }

    const totalWorkspaces = await prisma.workspace.count({
      where: { organizationId: body.organizationId },
    })
    if (totalWorkspaces <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last remaining workspace in an organization" },
        { status: 409 }
      )
    }

    const target = await prisma.workspace.findFirst({
      where: { id: body.workspaceId, organizationId: body.organizationId },
    })
    if (!target) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    await prisma.workspace.delete({ where: { id: target.id } })
    return NextResponse.json({ data: { deleted: true, workspaceId: target.id } })
  } catch (err: unknown) {
    logger.error("Organizations PATCH failed", errorContext(err))
    return authErrorResponse(err, "Failed to update organization workspaces")
  }
}
