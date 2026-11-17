import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export const PROJECT_WORKSPACE_ROOT = path.join(process.cwd(), "data", "projects")

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
    const entryAbsolutePath = path.join(rootPath, entryRelativePath)

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        type: "directory",
        path: entryRelativePath.replace(/\\/g, "/"),
        children: await listWorkspaceTree(rootPath, entryRelativePath),
      })
    } else {
      const fileStat = await stat(entryAbsolutePath)
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
