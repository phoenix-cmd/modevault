import { spawn, type ChildProcess } from "node:child_process"
import { prisma } from "@/lib/db"

interface PreviewState {
  process: ChildProcess
  projectId: string
  port: number
  startedAt: number
}

const previews = new Map<string, PreviewState>()

const ALLOWED_PREVIEW_COMMANDS: Record<string, { file: string; args: string[] }> = {
  "npm run dev": { file: "npm", args: ["run", "dev"] },
  "npm run start": { file: "npm", args: ["run", "start"] },
  "npm start": { file: "npm", args: ["start"] },
  "npx next dev": { file: "npx", args: ["next", "dev"] },
  "npx next start": { file: "npx", args: ["next", "start"] },
  "python main.py": { file: "python", args: ["main.py"] },
  "python3 main.py": { file: "python3", args: ["main.py"] },
  "node server.js": { file: "node", args: ["server.js"] },
  "node index.js": { file: "node", args: ["index.js"] },
}

const SHELL_METACHAR_PATTERN = /[;&|`$<>\\!*\n\r]/

export function parseSafePreviewCommand(rawCommand: string | null | undefined): { file: string; args: string[] } {
  const normalized = (rawCommand || "npm run dev").trim().replace(/\s+/g, " ")
  if (SHELL_METACHAR_PATTERN.test(normalized)) {
    throw new Error("Unsafe characters detected in preview startCommand")
  }
  const matched = ALLOWED_PREVIEW_COMMANDS[normalized]
  if (!matched) {
    throw new Error(`Preview startCommand "${normalized}" is not in the security allowlist`)
  }
  return matched
}

function buildSanitizedPreviewEnv(port: number): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "development",
    PORT: String(port),
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    COMSPEC: process.env.COMSPEC,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP || process.env.TMP,
    TMP: process.env.TMP || process.env.TEMP,
  }
}

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

  const source = project.sources?.find((item: { sourcePath?: string | null }) => item.sourcePath)
  if (!source?.sourcePath) {
    throw new Error("No extracted workspace for preview")
  }
  const cwd = source.sourcePath
  const port = environment.runPort || 3000
  const parsedCommand = parseSafePreviewCommand(environment.startCommand)

  if (process.env.VERCEL || process.env.DISABLE_HOST_PREVIEW === "1") {
    return { port, status: "simulated" }
  }

  const executable =
    process.platform === "win32" && (parsedCommand.file === "npm" || parsedCommand.file === "npx")
      ? `${parsedCommand.file}.cmd`
      : parsedCommand.file

  const child = spawn(/* turbopackIgnore: true */ executable, parsedCommand.args, {
    cwd,
    shell: false,
    env: buildSanitizedPreviewEnv(port),
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
    url: `/api/projects/${projectId}/preview/proxy`,
  }
}
