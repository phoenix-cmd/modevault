import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { prisma } from "@/lib/db"
import { ensureProjectSourceWorkspace } from "@/lib/project-source"

interface PreviewState {
  process: ChildProcess | null
  projectId: string
  port: number
  mode: "process" | "workspace_renderer"
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

export async function startPreview(
  projectId: string
): Promise<{ port: number; status: string; mode: string; url: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { environments: true, sources: true },
  })
  if (!project) throw new Error("Project not found")

  const environment = project.environments[0]
  if (!environment) throw new Error("No runtime environment configured")

  const url = `/api/projects/${projectId}/preview/proxy`
  const existing = previews.get(projectId)
  if (existing && (!existing.process || !existing.process.killed)) {
    return { port: existing.port, status: "running", mode: existing.mode, url }
  }

  const cwd = await ensureProjectSourceWorkspace(project)
  const port = environment.runPort || 3000
  const parsedCommand = parseSafePreviewCommand(environment.startCommand)

  const canSpawnHostProcess =
    !process.env.VERCEL &&
    process.env.DISABLE_HOST_PREVIEW !== "1" &&
    (parsedCommand.file === "python" ||
      parsedCommand.file === "python3" ||
      parsedCommand.file === "node" ||
      fs.existsSync(path.join(cwd, "node_modules")))

  let child: ChildProcess | null = null
  let mode: "process" | "workspace_renderer" = "workspace_renderer"

  if (canSpawnHostProcess) {
    try {
      const executable =
        process.platform === "win32" && (parsedCommand.file === "npm" || parsedCommand.file === "npx")
          ? `${parsedCommand.file}.cmd`
          : parsedCommand.file

      child = spawn(/* turbopackIgnore: true */ executable, parsedCommand.args, {
        cwd,
        shell: false,
        env: buildSanitizedPreviewEnv(port),
        stdio: "ignore",
        detached: false,
      })
      mode = "process"
      child.on("exit", () => {
        const current = previews.get(projectId)
        if (current && current.process === child) {
          // Keep session active via built-in workspace renderer if child process exits before stopPreview
          current.process = null
          current.mode = "workspace_renderer"
        }
      })
    } catch {
      child = null
      mode = "workspace_renderer"
    }
  }

  previews.set(projectId, {
    process: child,
    projectId,
    port,
    mode,
    startedAt: Date.now(),
  })

  await prisma.projectEnvironment.update({
    where: { id: environment.id },
    data: { status: "running" },
  })

  return { port, status: "running", mode, url }
}

export async function stopPreview(projectId: string): Promise<{ status: string }> {
  const state = previews.get(projectId)
  if (state) {
    try {
      state.process?.kill()
    } catch {
      // Ignore child kill error
    }
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

export function getPreview(projectId: string): {
  running: boolean
  port?: number
  mode?: string
  url?: string
} {
  const state = previews.get(projectId)
  if (!state) return { running: false }
  return {
    running: true,
    port: state.port,
    mode: state.mode,
    url: `/api/projects/${projectId}/preview/proxy`,
  }
}

export async function getPreviewWithDbSync(projectId: string): Promise<{
  running: boolean
  port?: number
  mode?: string
  url?: string
}> {
  const live = getPreview(projectId)
  if (!live.running) {
    await prisma.projectEnvironment
      .updateMany({
        where: { projectId, status: "running" },
        data: { status: "stopped" },
      })
      .catch(() => {})
  }
  return live
}
