import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { gitBranchNameSchema } from "@/lib/validation"

const execFileAsync = promisify(execFile)

export const PROJECT_WORKSPACE_ROOT = process.env.VERCEL
  ? path.join("/tmp", "modevault-projects")
  : path.join(/* turbopackIgnore: true */ process.cwd(), "data", "projects")

export interface WorkspaceTreeNode {
  name: string
  type: "file" | "directory"
  path: string
  size?: number
  children?: WorkspaceTreeNode[]
}

export interface FileAstSummary {
  filePath: string
  lineCount: number
  byteSize: number
  exportedSymbols: string[]
  importedModules: string[]
  hooksUsed: string[]
  complexityScore: number
  complexityRating: "safe" | "moderate" | "elevated"
}

export function analyzeSourceCodeAst(filePath: string, content: string): FileAstSummary {
  const lines = content.split(/\r?\n/)
  const exportedSymbols = new Set<string>()
  const importedModules = new Set<string>()
  const hooksUsed = new Set<string>()

  for (const match of content.matchAll(
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z0-9_]+)/g
  )) {
    if (match[1]) exportedSymbols.add(match[1])
  }
  for (const match of content.matchAll(/export\s*\{\s*([^}]+)\}/g)) {
    if (match[1]) {
      for (const part of match[1].split(",")) {
        const clean = part.trim().split(/\s+as\s+/)[0]?.trim()
        if (clean) exportedSymbols.add(clean)
      }
    }
  }
  for (const match of content.matchAll(/from\s+["']([^"']+)["']/g)) {
    if (match[1]) importedModules.add(match[1])
  }
  for (const match of content.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
    if (match[1]) importedModules.add(match[1])
  }
  for (const match of content.matchAll(/\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g)) {
    if (match[1]) hooksUsed.add(match[1])
  }

  const branchMatches = content.match(/\b(if|else\s+if|for|while|case|catch)\b|&&|\|\||\?/g)
  const complexityScore = 1 + (branchMatches ? branchMatches.length : 0)
  const complexityRating =
    complexityScore <= 8 ? "safe" : complexityScore <= 18 ? "moderate" : "elevated"

  return {
    filePath,
    lineCount: lines.length,
    byteSize: Buffer.byteLength(content, "utf8"),
    exportedSymbols: Array.from(exportedSymbols).slice(0, 16),
    importedModules: Array.from(importedModules).slice(0, 16),
    hooksUsed: Array.from(hooksUsed).slice(0, 12),
    complexityScore,
    complexityRating,
  }
}

export async function scaffoldStarterWorkspace(
  projectId: string,
  opts: { name: string; framework?: string | null; language?: string | null }
): Promise<string> {
  const workspacePath = await ensureProjectWorkspace(projectId)
  const existingEntries = await readdir(workspacePath).catch(() => [])
  if (existingEntries.length === 0) {
    const ext = opts.language === "python" ? "py" : opts.language === "javascript" ? "js" : "ts"
    await writeWorkspaceFile(
      workspacePath,
      "README.md",
      `# ${opts.name}\n\nManaged by MODELVAULT (${opts.framework || "nextjs"} · ${opts.language || "typescript"}).\n`
    )
    if (opts.language === "python") {
      await writeWorkspaceFile(
        workspacePath,
        "requirements.txt",
        "fastapi>=0.115.0\nuvicorn>=0.30.0\npydantic>=2.9.0\n"
      )
      await writeWorkspaceFile(
        workspacePath,
        "main.py",
        `from fastapi import FastAPI\n\napp = FastAPI(title="${opts.name}")\n\n@app.get("/health")\ndef health():\n    return {"status": "ok", "service": "${opts.name}"}\n`
      )
    } else {
      await writeWorkspaceFile(
        workspacePath,
        "package.json",
        JSON.stringify(
          {
            name: opts.name.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "modelvault-app",
            version: "0.1.0",
            private: true,
            scripts: {
              dev: "next dev",
              build: "next build",
              start: "next start",
            },
            dependencies: {
              next: "16.4.6",
              react: "19.3.0",
              "react-dom": "19.3.0",
            },
          },
          null,
          2
        )
      )
      await writeWorkspaceFile(
        workspacePath,
        `src/app/api/checkout/route.${ext}`,
        `import { NextRequest, NextResponse } from "next/server"\n\nexport async function POST(req: NextRequest) {\n  const idempotencyKey = req.headers.get("Idempotency-Key")\n  if (!idempotencyKey) {\n    return NextResponse.json({ error: "Missing required Idempotency-Key header" }, { status: 400 })\n  }\n  const body = await req.json()\n  return NextResponse.json({ status: "ok", idempotencyKey, received: body })\n}\n`
      )
      await writeWorkspaceFile(
        workspacePath,
        `src/lib/services/api-client.${ext}`,
        `export interface RequestConfig {\n  timeoutMs?: number\n  retryAttempts?: number\n  idempotencyKey?: string\n}\n\nexport class ApiClient {\n  constructor(private readonly baseUrl = "") {}\n\n  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<T> {\n    const res = await fetch(\`\${this.baseUrl}\${endpoint}\`, {\n      headers: {\n        "Content-Type": "application/json",\n        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),\n      },\n      signal: AbortSignal.timeout(options.timeoutMs ?? 15000),\n    })\n    if (!res.ok) throw new Error(\`HTTP \${res.status}\`)\n    return (await res.json()) as T\n  }\n}\n`
      )
    }
  }
  await initializeGitRepository(workspacePath)
  return workspacePath
}

export function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || typeof relativePath !== "string" || path.isAbsolute(relativePath)) return false
  if (relativePath.includes("\0")) return false
  const slashNormalized = relativePath.replace(/\\/g, "/")
  if (slashNormalized.startsWith("/") || slashNormalized.split("/").includes("..")) return false
  const normalized = path.normalize(relativePath)
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false
  return true
}

export function assertValidGitBranchName(branchName: string): string {
  const parsed = gitBranchNameSchema.safeParse(branchName)
  if (!parsed.success) {
    throw new Error("Invalid Git branch name")
  }
  return parsed.data
}

function assertSafeRelativeFiles(files?: string[]): string[] {
  if (!files) return []
  const out: string[] = []
  for (const f of files) {
    if (!isSafeRelativePath(f)) {
      throw new Error(`Invalid file path: ${f}`)
    }
    out.push(f)
  }
  return out
}

export function getProjectWorkspacePath(projectId: string): string {
  if (!isSafeRelativePath(projectId) || projectId.includes("/") || projectId.includes("\\")) {
    throw new Error("Invalid project identifier")
  }
  return path.join(PROJECT_WORKSPACE_ROOT, projectId)
}

export async function ensureProjectWorkspace(projectId: string): Promise<string> {
  const workspacePath = getProjectWorkspacePath(projectId)
  await mkdir(workspacePath, { recursive: true })
  return workspacePath
}

export async function removeProjectWorkspace(projectId: string): Promise<void> {
  await rm(getProjectWorkspacePath(projectId), { recursive: true, force: true })
}

export async function listWorkspaceTree(
  rootPath: string,
  relativeRoot = ""
): Promise<WorkspaceTreeNode[]> {
  const currentPath = path.join(rootPath, relativeRoot)
  const entries = await readdir(currentPath, { withFileTypes: true })
  const nodes: WorkspaceTreeNode[] = []

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue
    const entryRelativePath = path.join(relativeRoot, entry.name)
    const entryAbsolutePath = path.join(/* turbopackIgnore: true */ rootPath, entryRelativePath)

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        type: "directory",
        path: entryRelativePath.replace(/\\/g, "/"),
        children: await listWorkspaceTree(rootPath, entryRelativePath),
      })
    } else if (entry.isFile()) {
      const fileStat = await stat(/* turbopackIgnore: true */ entryAbsolutePath)
      nodes.push({
        name: entry.name,
        type: "file",
        path: entryRelativePath.replace(/\\/g, "/"),
        size: fileStat.size,
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

export async function readWorkspaceFile(
  rootPath: string,
  relativePath: string
): Promise<string> {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Invalid file path")
  }
  const resolvedRoot = path.resolve(rootPath)
  const absolutePath = path.resolve(resolvedRoot, relativePath)
  if (!absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid file path")
  }
  return readFile(absolutePath, "utf8")
}

export async function writeWorkspaceFile(
  rootPath: string,
  relativePath: string,
  content: string | Buffer
): Promise<void> {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Invalid file path")
  }
  const resolvedRoot = path.resolve(rootPath)
  const absolutePath = path.resolve(resolvedRoot, relativePath)
  if (!absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid file path")
  }
  await mkdir(path.dirname(absolutePath), { recursive: true })
  if (typeof content === "string") {
    await writeFile(absolutePath, content, "utf8")
  } else {
    await writeFile(absolutePath, content)
  }
}

const HARDENED_GIT_GLOBAL_ARGS = [
  "-c",
  "core.hooksPath=",
  "-c",
  "protocol.file.allow=never",
  "-c",
  "protocol.ext.allow=never",
  "-c",
  "core.symlinks=false",
]

function buildGitEnv(): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PATH: process.env.PATH,
    SYSTEMROOT: process.env.SYSTEMROOT,
    COMSPEC: process.env.COMSPEC,
    HOME: process.env.HOME || process.env.USERPROFILE,
    USERPROFILE: process.env.USERPROFILE,
    TEMP: process.env.TEMP || process.env.TMP,
    TMP: process.env.TMP || process.env.TEMP,
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
  }
}

async function git(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", [...HARDENED_GIT_GLOBAL_ARGS, ...args], {
      cwd,
      env: buildGitEnv(),
      maxBuffer: 10 * 1024 * 1024,
      timeout: 15_000,
    })
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string }
    throw new Error(err.stderr || err.message || "Git command failed")
  }
}

export async function isGitRepository(rootPath: string): Promise<boolean> {
  try {
    const { stdout } = await git(rootPath, ["rev-parse", "--show-toplevel"])
    return path.resolve(stdout.trim()) === path.resolve(rootPath)
  } catch {
    return false
  }
}

export async function initializeGitRepository(rootPath: string): Promise<void> {
  try {
    if (await isGitRepository(rootPath)) return
    await git(rootPath, ["init"])
    await git(rootPath, ["config", "user.email", "modelvault@local"])
    await git(rootPath, ["config", "user.name", "MODELVAULT"])
    await git(rootPath, ["config", "core.hooksPath", ""])
    await git(rootPath, ["config", "core.symlinks", "false"])
    await git(rootPath, ["add", "-A"])
    await git(rootPath, ["commit", "--no-verify", "-m", "Initial commit from MODELVAULT workspace"])
  } catch {
    // Git CLI may be unavailable in serverless runtime or repository may have nothing to commit; leave workspace files intact.
  }
}

export async function cloneOrScaffoldGitWorkspace(
  projectId: string,
  opts: {
    name: string
    repositoryUrl?: string | null
    framework?: string | null
    language?: string | null
  }
): Promise<{
  workspacePath: string
  cloned: boolean
  detectedFramework: string
  detectedLanguage: string
  detectedDependencies: string[]
  fileList: string[]
}> {
  const workspacePath = await ensureProjectWorkspace(projectId)
  let cloned = false

  if (opts.repositoryUrl && /^https:\/\/[A-Za-z0-9._/-]+$/i.test(opts.repositoryUrl.trim())) {
    const cleanUrl = opts.repositoryUrl.trim()
    try {
      await rm(workspacePath, { recursive: true, force: true })
      await mkdir(path.dirname(workspacePath), { recursive: true })
      await execFileAsync(
        "git",
        [
          "-c",
          "core.hooksPath=",
          "-c",
          "core.symlinks=false",
          "-c",
          "protocol.file.allow=never",
          "clone",
          "--depth",
          "1",
          "--no-tags",
          "--",
          cleanUrl,
          workspacePath,
        ],
        {
          env: buildGitEnv(),
          timeout: 15_000,
          maxBuffer: 10 * 1024 * 1024,
        }
      )
      cloned = true
    } catch {
      await mkdir(workspacePath, { recursive: true })
    }

    // If git clone binary was unavailable (e.g., on Vercel serverless) and URL is a public GitHub repo,
    // fetch repository metadata / README / package.json via GitHub REST API so the workspace has real repo files.
    if (!cloned) {
      const ghMatch = cleanUrl
        .replace(/\.git$/i, "")
        .match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/i)
      if (ghMatch) {
        const [, owner, repo] = ghMatch
        try {
          const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
            headers: { Accept: "application/vnd.github.v3+json", "User-Agent": "MODELVAULT" },
            signal: AbortSignal.timeout(6000),
          })
          if (treeRes.ok) {
            const items = (await treeRes.json()) as Array<{
              name?: string
              path?: string
              type?: string
              download_url?: string | null
              size?: number
            }>
            if (Array.isArray(items)) {
              const downloadable = items
                .filter((it) => it.type === "file" && it.download_url && (it.size ?? 0) < 250_000)
                .slice(0, 12)
              for (const fileItem of downloadable) {
                if (!fileItem.path || !fileItem.download_url || !isSafeRelativePath(fileItem.path)) continue
                const fileRes = await fetch(fileItem.download_url, {
                  signal: AbortSignal.timeout(4000),
                }).catch(() => null)
                if (fileRes && fileRes.ok) {
                  const buf = Buffer.from(await fileRes.arrayBuffer())
                  await writeWorkspaceFile(workspacePath, fileItem.path, buf)
                  cloned = true
                }
              }
            }
          }
        } catch {
          // Fall back to starter scaffold below
        }
      }
    }
  }

  if (!cloned) {
    await scaffoldStarterWorkspace(projectId, opts)
  } else {
    await initializeGitRepository(workspacePath)
  }

  const tree = await listWorkspaceTree(workspacePath).catch(() => [])
  const flatten = (nodes: WorkspaceTreeNode[]): string[] => {
    const out: string[] = []
    for (const n of nodes) {
      if (n.type === "file") out.push(n.path)
      if (n.children) out.push(...flatten(n.children))
    }
    return out
  }
  const fileList = flatten(tree)

  let detectedFramework = opts.framework || "nextjs"
  let detectedLanguage = opts.language || "typescript"
  let detectedDependencies = ["react", "next", "typescript"]

  try {
    const pkgText = await readWorkspaceFile(workspacePath, "package.json")
    const pkg = JSON.parse(pkgText) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    detectedDependencies = Object.keys(deps).slice(0, 20)
    if (deps["next"]) detectedFramework = "nextjs"
    else if (deps["react"]) detectedFramework = "react"
    else if (deps["vue"]) detectedFramework = "vue"
    else detectedFramework = "node"
    if (deps["typescript"] || fileList.some((f) => f.endsWith(".ts") || f.endsWith(".tsx"))) {
      detectedLanguage = "typescript"
    } else {
      detectedLanguage = "javascript"
    }
  } catch {
    if (fileList.some((f) => f.endsWith(".py") || f.endsWith("requirements.txt"))) {
      detectedFramework = "python"
      detectedLanguage = "python"
      detectedDependencies = ["fastapi", "uvicorn", "pydantic"]
    }
  }

  return {
    workspacePath,
    cloned,
    detectedFramework,
    detectedLanguage,
    detectedDependencies,
    fileList,
  }
}

export async function getGitBranches(rootPath: string): Promise<string[]> {
  const { stdout } = await git(rootPath, ["branch", "--format=%(refname:short)"])
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export async function getCurrentGitBranch(rootPath: string): Promise<string> {
  const { stdout } = await git(rootPath, ["branch", "--show-current"])
  return stdout.trim() || "main"
}

export async function getGitCommits(
  rootPath: string,
  limit = 20
): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100)
  try {
    const { stdout } = await git(rootPath, [
      "log",
      `--max-count=${safeLimit}`,
      "--pretty=format:%H%x1f%an%x1f%ad%x1f%s",
      "--date=short",
    ])
    return stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [sha, author, date, ...messageParts] = line.split("\x1f")
        return {
          sha: sha.slice(0, 7),
          author,
          date,
          message: messageParts.join("\x1f"),
        }
      })
  } catch {
    return []
  }
}

export async function getGitDiff(
  rootPath: string,
  filePath?: string
): Promise<string> {
  const args = ["diff", "--no-color", "--no-ext-diff"]
  if (filePath) {
    if (!isSafeRelativePath(filePath)) throw new Error("Invalid file path")
    args.push("--", filePath)
  }
  const { stdout } = await git(rootPath, args)
  return stdout
}

export async function getGitStatus(rootPath: string): Promise<string> {
  const { stdout } = await git(rootPath, ["status", "--short"])
  return stdout
}

export interface GitStatusFile {
  path: string
  code: string
  staged: boolean
}

export async function getGitStatusFiles(rootPath: string): Promise<GitStatusFile[]> {
  const { stdout } = await git(rootPath, ["status", "--porcelain"])
  const files: GitStatusFile[] = []
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue
    const code = line.slice(0, 2)
    const filePath = line.slice(3).trim()
    const staged = code[0] !== " " && code[0] !== "?"
    files.push({ path: filePath, code, staged })
  }
  return files
}

export async function stageFiles(rootPath: string, files?: string[]): Promise<void> {
  const safeFiles = assertSafeRelativeFiles(files)
  if (safeFiles.length > 0) {
    await git(rootPath, ["add", "--", ...safeFiles])
  } else {
    await git(rootPath, ["add", "-A"])
  }
}

export async function unstageFiles(rootPath: string, files?: string[]): Promise<void> {
  const safeFiles = assertSafeRelativeFiles(files)
  if (safeFiles.length > 0) {
    await git(rootPath, ["reset", "HEAD", "--", ...safeFiles])
  } else {
    await git(rootPath, ["reset", "HEAD"])
  }
}

export async function discardFiles(rootPath: string, files: string[]): Promise<void> {
  const safeFiles = assertSafeRelativeFiles(files)
  if (safeFiles.length === 0) return
  await git(rootPath, ["checkout", "--", ...safeFiles])
}

export async function commitWorkspace(
  rootPath: string,
  message: string
): Promise<string> {
  await git(rootPath, ["add", "-A"])
  try {
    await git(rootPath, ["commit", "--no-verify", "-m", message])
  } catch {
    // Nothing to commit or commit failed; still return current HEAD if available.
  }
  const { stdout } = await git(rootPath, ["rev-parse", "--short", "HEAD"])
  return stdout.trim()
}

export async function createBranch(rootPath: string, branchName: string): Promise<void> {
  const safeBranch = assertValidGitBranchName(branchName)
  try {
    await git(rootPath, ["checkout", "-b", safeBranch])
  } catch {
    await git(rootPath, ["checkout", safeBranch, "--"])
  }
}

export async function checkoutBranch(rootPath: string, branchName: string): Promise<void> {
  const safeBranch = assertValidGitBranchName(branchName)
  await git(rootPath, ["checkout", safeBranch, "--"])
}

export async function revertCommit(rootPath: string, commitSha: string): Promise<string> {
  if (!/^[0-9a-fA-F]{4,40}$/.test(commitSha.trim())) {
    throw new Error("Invalid commit SHA")
  }
  await git(rootPath, ["revert", "--no-edit", "--no-verify", commitSha.trim()])
  const { stdout } = await git(rootPath, ["rev-parse", "--short", "HEAD"])
  return stdout.trim()
}

export async function getLatestCommitDiff(rootPath: string): Promise<string> {
  try {
    const { stdout } = await git(rootPath, ["show", "--format=", "--no-color", "--no-ext-diff", "HEAD"])
    return stdout
  } catch {
    return ""
  }
}

export async function getCurrentCommitSha(rootPath: string): Promise<string> {
  const { stdout } = await git(rootPath, ["rev-parse", "--short", "HEAD"])
  return stdout.trim()
}

export interface GitSyncStatus {
  hasRemote: boolean
  remoteUrl: string | null
  upstream: string | null
  branch: string
  ahead: number
  behind: number
}

export async function getGitRemoteUrl(rootPath: string): Promise<string | null> {
  try {
    const { stdout } = await git(rootPath, ["remote", "get-url", "origin"])
    return stdout.trim() || null
  } catch {
    return null
  }
}

export async function getGitSyncStatus(rootPath: string): Promise<GitSyncStatus> {
  const branch = await getCurrentGitBranch(rootPath).catch(() => "main")
  const remoteUrl = await getGitRemoteUrl(rootPath)
  let upstream: string | null = null
  let ahead = 0
  let behind = 0

  if (remoteUrl) {
    try {
      const { stdout } = await git(rootPath, [
        "rev-parse",
        "--abbrev-ref",
        "--symbolic-full-name",
        "@{u}",
      ])
      upstream = stdout.trim()
    } catch {
      upstream = null
    }
  }

  if (upstream) {
    try {
      const { stdout } = await git(rootPath, [
        "rev-list",
        "--left-right",
        "--count",
        "HEAD...@{u}",
      ])
      const [left, right] = stdout.trim().split(/\s+/)
      ahead = Number.parseInt(left || "0", 10) || 0
      behind = Number.parseInt(right || "0", 10) || 0
    } catch {
      ahead = 0
      behind = 0
    }
  }

  return { hasRemote: Boolean(remoteUrl), remoteUrl, upstream, branch, ahead, behind }
}

export async function gitPush(
  rootPath: string
): Promise<{ branch: string; output: string }> {
  const branch = assertValidGitBranchName(await getCurrentGitBranch(rootPath))
  const remoteUrl = await getGitRemoteUrl(rootPath)
  if (!remoteUrl) throw new Error("No Git remote configured for this workspace")
  const { stdout } = await git(rootPath, ["push", "--no-verify", "-u", "origin", "HEAD"])
  return { branch, output: stdout.trim() || `Pushed ${branch} to origin` }
}

export async function gitPull(rootPath: string): Promise<{ branch: string; output: string }> {
  const branch = assertValidGitBranchName(await getCurrentGitBranch(rootPath))
  const remoteUrl = await getGitRemoteUrl(rootPath)
  if (!remoteUrl) throw new Error("No Git remote configured for this workspace")
  const { stdout } = await git(rootPath, ["pull", "--ff-only", "origin", branch])
  return { branch, output: stdout.trim() || `Pulled origin/${branch}` }
}

export async function gitFetch(rootPath: string): Promise<{ output: string }> {
  const remoteUrl = await getGitRemoteUrl(rootPath)
  if (!remoteUrl) throw new Error("No Git remote configured for this workspace")
  const { stdout } = await git(rootPath, ["fetch", "origin", "--prune"])
  return { output: stdout.trim() || "Fetched origin" }
}
