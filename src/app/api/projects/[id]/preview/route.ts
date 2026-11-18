import { NextRequest, NextResponse } from "next/server"
import { getCurrentUserOrDefault } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { startPreview, stopPreview, getPreview } from "@/lib/preview-manager"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUserOrDefault()
  try {
    await requireProjectAccess(id, user.id, "viewer")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return NextResponse.json({ data: getPreview(id) })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUserOrDefault()
  try {
    await requireProjectAccess(id, user.id, "member")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const result = await startPreview(id)
    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message || "Failed to start preview" }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getCurrentUserOrDefault()
  try {
    await requireProjectAccess(id, user.id, "member")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  try {
    const result = await stopPreview(id)
    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message || "Failed to stop preview" }, { status: 500 })
  }
}
