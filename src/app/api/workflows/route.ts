import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const workflows = await prisma.workflowDefinition.findMany({
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ data: workflows })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, category, nodes, edges } = body

    if (!name) {
      return NextResponse.json({ error: "Workflow name is required" }, { status: 400 })
    }

    const workflow = await prisma.workflowDefinition.create({
      data: {
        name,
        description: description || "Custom developer workflow automation",
        category: category || "development",
        nodesJson: JSON.stringify(nodes || []),
        edgesJson: JSON.stringify(edges || []),
        isTemplate: false,
      },
    })

    return NextResponse.json({ data: workflow }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
