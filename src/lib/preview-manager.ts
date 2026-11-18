import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { getDb } from "@/lib/db"

interface PreviewState {
  process: ChildProcess
  projectId: string
  port: number
  startedAt: number
}

const previews = new Map<string, PreviewState>()

export async function startPreview(projectId: string): Promise<{ port: number; status: string }> {
  const db = getDb()
  const project = await db.orm.public.Project
    .include("environments")
    .include("sources")
    .first({ id: projectId })
  if (!project) throw new Error("Project not found")

  const environment = project.environments[0]
  if (!environment) throw new Error("No runtime environment configured")

  const existing = previews.get(projectId)
  if (existing && !existing.process.killed) {
    return { port: existing.port, status: "running" }
  }

  const source = project.sources?.find((item: any) => item.sourcePath)
  const cwd = source?.sourcePath || path.join(/* turbopackIgnore: true */ process.cwd(), "data")
  const port = environment.runPort || 3000
  const command = environment.startCommand || "npm run dev"

  if (process.env.VERCEL) {
    return { port, status: "simulated" }
  }

  const child = spawn(/* turbopackIgnore: true */ command, {
    cwd,
    shell: true,
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore",
    detached: false,
  })

  previews.set(projectId, {
    process: child,
    projectId,
    port,
    startedAt: Date.now(),
  })

  await db.orm.public.ProjectEnvironment
    .where({ id: environment.id })
    .update({ status: "running" })

  child.on("exit", async () => {
    previews.delete(projectId)
    await getDb().orm.public.ProjectEnvironment
      .where({ id: environment.id })
      .update({ status: "stopped" })
      .catch(() => {})
  })

  return { port, status: "running" }
}

export async function stopPreview(projectId: string): Promise<{ status: string }> {
  const db = getDb()
  const state = previews.get(projectId)
  if (state) {
    state.process.kill()
    previews.delete(projectId)
  }

  const project = await db.orm.public.Project
    .include("environments")
    .first({ id: projectId })
  const environment = project?.environments[0]
  if (environment) {
    await db.orm.public.ProjectEnvironment
      .where({ id: environment.id })
      .update({ status: "stopped" })
  }

  return { status: "stopped" }
}

export function getPreview(projectId: string): { running: boolean; port?: number; url?: string } {
  const state = previews.get(projectId)
  if (!state || state.process.killed) return { running: false }
  return {
    running: true,
    port: state.port,
    url: `http://localhost:${state.port}`,
  }
}
