import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET() {
  try {
    const db = getDb()
    const agents = await db.orm.public.AgentDefinition.all()
    agents.sort((a, b) => Number(b.isDefault) - Number(a.isDefault))

    const formatted = agents.map((a: any) => ({
      ...a,
      capabilities: a.capabilitiesJson ? JSON.parse(a.capabilitiesJson) : [],
    }))

    return NextResponse.json({ data: formatted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
