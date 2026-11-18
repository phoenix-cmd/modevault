import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(req.url)
    const workspaceId = searchParams.get("workspaceId") || "ws_core_001"

    const projects = await db.orm.public.Project
      .include("sources")
      .include("environments")
      .include("executions", (executions) =>
        executions.orderBy((e) => e.createdAt.desc()).limit(3)
      )
      .where({ workspaceId })
      .orderBy((p) => p.updatedAt.desc())
      .all()

    return NextResponse.json({ data: projects })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb()
    const body = await req.json()
    const { name, description, framework, language, repositoryUrl, workspaceId } = body

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    const wsId = workspaceId || "ws_core_001"
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "-")

    const project = await db.orm.public.Project
      .include("environments")
      .include("sources")
      .create({
        workspaceId: wsId,
        name,
        slug,
        description: description || null,
        framework: framework || "nextjs",
        language: language || "typescript",
        repositoryUrl: repositoryUrl || null,
        status: "ready",
        environments: (e) =>
          e.create([
            {
              runtime: language === "python" ? "python-3.11" : "nodejs-20",
              buildCommand: language === "python" ? "pip install -r requirements.txt" : "npm install && npm run build",
              startCommand: language === "python" ? "python main.py" : "npm run start",
              runPort: 3000 + Math.floor(Math.random() * 500),
              status: "running",
            },
          ]),
        sources: (s) =>
          s.create([
            {
              type: repositoryUrl ? "git_clone" : "zip_upload",
              branch: "main",
              manifestJson: JSON.stringify({
                framework: framework || "Next.js 16",
                language: language || "TypeScript",
                detectedDependencies: ["react", "next", "tailwindcss", "prisma"],
                fileCount: 28,
              }),
            },
          ]),
      })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
