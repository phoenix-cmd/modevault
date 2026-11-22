import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { parseJson } from "@/lib/validation"
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
