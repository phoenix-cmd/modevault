import { spawn, type ChildProcess } from "node:child_process"
import path from "node:path"
import { prisma } from "@/lib/db"

interface PreviewState {
  process: ChildProcess
  projectId: string
  port: number
  startedAt: number
}

const previews = new Map<string, PreviewState>()

export async function startPreview(projectId: string): Promise<{ port: number; status: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { environments: true, sources: true },
  })
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

  await prisma.projectEnvironment.update({
    where: { id: environment.id },
    data: { status: "running" },
  })

  child.on("exit", async () => {
    previews.delete(projectId)
    await prisma.projectEnvironment
      .update({ where: { id: environment.id }, data: { status: "stopped" } })
      .catch(() => {})
  })

  return { port, status: "running" }
}

export async function stopPreview(projectId: string): Promise<{ status: string }> {
  const state = previews.get(projectId)
  if (state) {
    state.process.kill()
    previews.delete(projectId)
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { environments: true },
  })
  const environment = project?.environments[0]
  if (environment) {
    await prisma.projectEnvironment.update({
      where: { id: environment.id },
      data: { status: "stopped" },
    })
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
