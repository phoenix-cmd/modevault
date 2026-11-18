import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = getDb()
    const orgs = await db.orm.public.Organization
      .include("workspaces")
      .include("memberships", (m) => m.include("user"))
      .orderBy((o) => o.createdAt.asc())
      .all()
    return NextResponse.json({ data: orgs })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const org = await db.orm.public.Organization
      .include("workspaces")
      .create({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        workspaces: (w) =>
          w.create([
            {
              name: "Default Workspace",
              slug: "default",
              isDefault: true,
            },
          ]),
      })

    return NextResponse.json({ data: org }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
