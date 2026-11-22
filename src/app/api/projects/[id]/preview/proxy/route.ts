import { NextRequest, NextResponse } from "next/server"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { getPreview } from "@/lib/preview-manager"

function normalizePreviewPath(rawPath: string | null): string | null {
  const p = (rawPath || "/").trim()
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\") || p.includes("@") || p.includes("..")) {
    return null
  }
  if (/[\r\n\0]/.test(p)) {
    return null
  }
  return p
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params
    await requireProjectAccess(id, user.id, "viewer")

    const preview = getPreview(id)
    if (!preview.running || !preview.port) {
      return NextResponse.json({ error: "Preview is not running" }, { status: 404 })
    }

    const safePath = normalizePreviewPath(req.nextUrl.searchParams.get("path"))
    if (!safePath) {
      return NextResponse.json({ error: "Invalid preview path" }, { status: 400 })
    }

    const target = new URL(safePath, `http://127.0.0.1:${preview.port}`)
    if (target.hostname !== "127.0.0.1" || Number(target.port) !== preview.port) {
      return NextResponse.json({ error: "Invalid preview target" }, { status: 400 })
    }

    const upstream = await fetch(target.toString(), {
      headers: { Accept: req.headers.get("accept") || "*/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    })
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/html",
        "Content-Security-Policy": "sandbox allow-scripts allow-forms; default-src 'self' 'unsafe-inline' data: blob:;",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
      },
    })
  } catch (err: unknown) {
    if (err && typeof err === "object" && "status" in err) {
      return authErrorResponse(err, "Preview proxy unauthorized")
    }
    return NextResponse.json({ error: "Preview proxy failed" }, { status: 502 })
  }
}
