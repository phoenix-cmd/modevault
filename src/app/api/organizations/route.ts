import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        workspaces: true,
        memberships: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ data: orgs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
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
      },
    })

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
