import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { startPreview, stopPreview, getPreview } from "@/lib/preview-manager"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    await requireProjectAccess(id, user.id, "viewer")
    return NextResponse.json({ data: getPreview(id) })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to load preview status")
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    await requireProjectAccess(id, user.id, "member")
    const result = await startPreview(id)
    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      return authErrorResponse(err, "Failed to start preview")
    }
    const error = err as { message?: string }
    const msg = error.message || "Failed to start preview"
    const status = msg.includes("allowlist") || msg.includes("Unsafe") ? 422 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    await requireProjectAccess(id, user.id, "member")
    const result = await stopPreview(id)
    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    return authErrorResponse(err, "Failed to stop preview")
  }
}
