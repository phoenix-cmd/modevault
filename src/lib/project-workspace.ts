import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export const PROJECT_WORKSPACE_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "data", "projects")

export interface WorkspaceTreeNode {
  name: string
  type: "file" | "directory"
  path: string
  size?: number
  children?: WorkspaceTreeNode[]
}

function isSafeRelativePath(relativePath: string): boolean {
  if (!relativePath || path.isAbsolute(relativePath)) return false
  const normalized = path.normalize(relativePath)
  if (normalized.startsWith("..") || normalized.includes(`..${path.sep}`)) return false
  return true
}

export function getProjectWorkspacePath(projectId: string): string {
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
    } else {
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
  const absolutePath = path.join(rootPath, relativePath)
  return readFile(absolutePath, "utf8")
}

export async function writeWorkspaceFile(
  rootPath: string,
  relativePath: string,
  content: string
): Promise<void> {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Invalid file path")
  }
  const absolutePath = path.join(rootPath, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, content, "utf8")
}

async function git(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 })
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
  if (await isGitRepository(rootPath)) return
  await git(rootPath, ["init"])
  await git(rootPath, ["config", "user.email", "modelvault@local"])
  await git(rootPath, ["config", "user.name", "MODELVAULT"])
  await git(rootPath, ["add", "-A"])
  try {
    await git(rootPath, ["commit", "-m", "Initial commit from MODELVAULT workspace"])
  } catch {
    // Empty repository or nothing to commit; leave initialized.
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
  try {
    const { stdout } = await git(rootPath, [
      "log",
      `--max-count=${limit}`,
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
  const args = ["diff", "--no-color"]
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
  if (files && files.length > 0) {
    await git(rootPath, ["add", "--", ...files])
  } else {
    await git(rootPath, ["add", "-A"])
  }
}

export async function unstageFiles(rootPath: string, files?: string[]): Promise<void> {
  if (files && files.length > 0) {
    await git(rootPath, ["reset", "HEAD", "--", ...files])
  } else {
    await git(rootPath, ["reset", "HEAD"])
  }
}

export async function discardFiles(rootPath: string, files: string[]): Promise<void> {
  if (files.length === 0) return
  await git(rootPath, ["checkout", "--", ...files])
}

export async function commitWorkspace(
  rootPath: string,
  message: string
): Promise<string> {
  await git(rootPath, ["add", "-A"])
  try {
    await git(rootPath, ["commit", "-m", message])
  } catch {
    // Nothing to commit or commit failed; still return current HEAD if available.
  }
  const { stdout } = await git(rootPath, ["rev-parse", "--short", "HEAD"])
  return stdout.trim()
}

export async function createBranch(rootPath: string, branchName: string): Promise<void> {
  try {
    await git(rootPath, ["checkout", "-b", branchName])
  } catch {
    // Branch may already exist; try switching to it.
    await git(rootPath, ["checkout", branchName])
  }
}

export async function checkoutBranch(rootPath: string, branchName: string): Promise<void> {
  await git(rootPath, ["checkout", branchName])
}

export async function getLatestCommitDiff(rootPath: string): Promise<string> {
  try {
    const { stdout } = await git(rootPath, ["show", "--format=", "--no-color", "HEAD"])
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
  const branch = await getCurrentGitBranch(rootPath)
  const remoteUrl = await getGitRemoteUrl(rootPath)
  if (!remoteUrl) throw new Error("No Git remote configured for this workspace")
  const { stdout } = await git(rootPath, ["push", "-u", "origin", "HEAD"])
  return { branch, output: stdout.trim() || `Pushed ${branch} to origin` }
}

export async function gitPull(rootPath: string): Promise<{ branch: string; output: string }> {
  const branch = await getCurrentGitBranch(rootPath)
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
