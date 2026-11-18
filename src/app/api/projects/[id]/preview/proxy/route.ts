import { NextRequest, NextResponse } from "next/server"
import { getPreview } from "@/lib/preview-manager"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const preview = getPreview(id)
  if (!preview.running || !preview.port) {
    return NextResponse.json({ error: "Preview is not running" }, { status: 404 })
  }

  const path = req.nextUrl.searchParams.get("path") || "/"
  const target = `http://localhost:${preview.port}${path}`

  try {
    const upstream = await fetch(target, {
      headers: { Accept: req.headers.get("accept") || "*/*" },
    })
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "text/html",
      },
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    return NextResponse.json({ error: error.message || "Preview proxy failed" }, { status: 502 })
  }
}
