import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const agents = await prisma.agentDefinition.findMany({
      orderBy: { isDefault: "desc" },
    })

    const formatted = agents.map((a) => ({
      ...a,
      capabilities: a.capabilitiesJson ? JSON.parse(a.capabilitiesJson) : [],
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
