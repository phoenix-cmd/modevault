import { execFile } from "node:child_process"
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import JSZip from "jszip"
import ts from "typescript"
import { gitBranchNameSchema } from "@/lib/validation"

const execFileAsync = promisify(execFile)

const IGNORED_WORKSPACE_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".turbo",
  "__pycache__",
  ".venv",
  "venv",
  "__MACOSX",
  ".DS_Store",
  "Thumbs.db",
])

export function isIgnoredWorkspaceEntry(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/")
  const segments = normalized.split("/").filter(Boolean)
  if (segments.length === 0) return true
  return segments.some((segment) => IGNORED_WORKSPACE_SEGMENTS.has(segment))
}

const PROTECTED_PROJECT_ROOT_DIRS = new Set([
  "src",
  "app",
  "pages",
  "components",
  "lib",
  "public",
  "server",
  "client",
  "api",
  "styles",
  "utils",
  "hooks",
  "types",
  "tests",
  "test",
  "scripts",
  "prisma",
  "config",
  "assets",
  "packages",
  "docs",
  "cmd",
  "pkg",
  "internal",
  "include",
  "bin",
  ".github",
])

/**
 * Strips a single shared top-level directory (e.g. `repo-main/` from a GitHub zipball
 * or `my-app/` from a zipped project folder) only when EVERY entry resides inside it
 * AND that directory is not a standard project source directory like `src/` or `app/`.
 * Archives that already have root-level files (e.g. `README.md`, `icon.png`) keep paths intact.
 */
export function stripCommonRootDirectory(
  entries: string[],
  opts?: { skipStrip?: boolean }
): {
  prefix: string
  strip: (relativePath: string) => string
} {
  if (opts?.skipStrip) {
    return { prefix: "", strip: (p) => p.replace(/\\/g, "/") }
  }
  const normalized = entries.map((e) => e.replace(/\\/g, "/")).filter(Boolean)
  if (normalized.length === 0) {
    return { prefix: "", strip: (p) => p.replace(/\\/g, "/") }
  }
  const firstSlash = normalized[0]!.indexOf("/")
  if (firstSlash <= 0) {
    return { prefix: "", strip: (p) => p.replace(/\\/g, "/") }
  }
  const firstSegment = normalized[0]!.slice(0, firstSlash)
  if (PROTECTED_PROJECT_ROOT_DIRS.has(firstSegment.toLowerCase())) {
    return { prefix: "", strip: (p) => p.replace(/\\/g, "/") }
  }
  const expectedPrefix = `${firstSegment}/`
  const allSharePrefix = normalized.every(
    (entry) => entry.startsWith(expectedPrefix) && entry.length > expectedPrefix.length
  )
  if (!allSharePrefix) {
    return { prefix: "", strip: (p) => p.replace(/\\/g, "/") }
  }
  return {
    prefix: expectedPrefix,
    strip: (p) => {
      const norm = p.replace(/\\/g, "/")
      return norm.startsWith(expectedPrefix) ? norm.slice(expectedPrefix.length) : norm
    },
  }
}

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
  parserEngine?: "typescript-compiler-ast" | "python-ast"
}

export function analyzeSourceCodeAst(filePath: string, content: string): FileAstSummary {
  const lines = content.split(/\r?\n/)
  const exportedSymbols = new Set<string>()
  const importedModules = new Set<string>()
  const hooksUsed = new Set<string>()
  const lowerPath = filePath.toLowerCase()

  if (lowerPath.endsWith(".py")) {
    for (const match of content.matchAll(/^(?:async\s+)?(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)/gm)) {
      if (match[1] && !match[1].startsWith("_")) exportedSymbols.add(match[1])
    }
    for (const match of content.matchAll(/^(?:from\s+([A-Za-z0-9_.]+)\s+import|import\s+([A-Za-z0-9_.]+))/gm)) {
      const mod = match[1] || match[2]
      if (mod) importedModules.add(mod)
    }
    const pyBranches = content.match(/\b(if|elif|for|while|except|and|or)\b/g)
    const complexityScore = 1 + (pyBranches ? pyBranches.length : 0)
    const complexityRating =
      complexityScore <= 8 ? "safe" : complexityScore <= 18 ? "moderate" : "elevated"

    return {
      filePath,
      lineCount: lines.length,
      byteSize: Buffer.byteLength(content, "utf8"),
      exportedSymbols: Array.from(exportedSymbols).slice(0, 20),
      importedModules: Array.from(importedModules).slice(0, 20),
      hooksUsed: [],
      complexityScore,
      complexityRating,
      parserEngine: "python-ast",
    }
  }

  let complexityScore = 1
  try {
    const scriptKind = lowerPath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : lowerPath.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : lowerPath.endsWith(".js") || lowerPath.endsWith(".mjs") || lowerPath.endsWith(".cjs")
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS

    const sourceFile = ts.createSourceFile(
      filePath || "module.tsx",
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    )

    const hasExportModifier = (node: ts.Node): boolean => {
      if (!ts.canHaveModifiers(node)) return false
      const mods = ts.getModifiers(node)
      return Boolean(mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
    }

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        importedModules.add(node.moduleSpecifier.text)
      } else if (ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          importedModules.add(node.moduleSpecifier.text)
        }
        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const el of node.exportClause.elements) {
            exportedSymbols.add(el.name.text)
          }
        }
      } else if (
        (ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node)) &&
        hasExportModifier(node)
      ) {
        exportedSymbols.add(node.name?.text || "default")
      } else if (ts.isVariableStatement(node) && hasExportModifier(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            exportedSymbols.add(decl.name.text)
          }
        }
      } else if (ts.isExportAssignment(node)) {
        exportedSymbols.add("default")
      }

      if (ts.isCallExpression(node)) {
        let calleeName = ""
        if (ts.isIdentifier(node.expression)) {
          calleeName = node.expression.text
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          calleeName = node.expression.name.text
        }
        if (/^use[A-Z][A-Za-z0-9_]*$/.test(calleeName)) {
          hooksUsed.add(calleeName)
        }
        if (
          (calleeName === "require" || node.expression.kind === ts.SyntaxKind.ImportKeyword) &&
          node.arguments.length > 0 &&
          ts.isStringLiteral(node.arguments[0]!)
        ) {
          importedModules.add(node.arguments[0]!.text)
        }
      }

      if (
        ts.isIfStatement(node) ||
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node) ||
        ts.isCaseClause(node) ||
        ts.isCatchClause(node) ||
        ts.isConditionalExpression(node)
      ) {
        complexityScore += 1
      } else if (
        ts.isBinaryExpression(node) &&
        (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
          node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
      ) {
        complexityScore += 1
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  } catch {
    // Fallback if non-source text file is opened
  }

  const complexityRating =
    complexityScore <= 8 ? "safe" : complexityScore <= 18 ? "moderate" : "elevated"

  return {
    filePath,
    lineCount: lines.length,
    byteSize: Buffer.byteLength(content, "utf8"),
    exportedSymbols: Array.from(exportedSymbols).slice(0, 20),
    importedModules: Array.from(importedModules).slice(0, 20),
    hooksUsed: Array.from(hooksUsed).slice(0, 16),
    complexityScore,
    complexityRating,
    parserEngine: "typescript-compiler-ast",
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
      try {
        nodes.push({
          name: entry.name,
          type: "directory",
          path: entryRelativePath.replace(/\\/g, "/"),
          children: await listWorkspaceTree(rootPath, entryRelativePath),
        })
      } catch {
        // Skip unreadable directories without breaking the rest of the workspace tree
      }
    } else if (entry.isFile()) {
      try {
        const fileStat = await stat(/* turbopackIgnore: true */ entryAbsolutePath)
        nodes.push({
          name: entry.name,
          type: "file",
          path: entryRelativePath.replace(/\\/g, "/"),
          size: fileStat.size,
        })
      } catch {
        // Skip unreadable files without breaking the rest of the workspace tree
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "bmp",
  "tiff",
  "pdf",
  "zip",
  "gz",
  "tar",
  "7z",
  "rar",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp3",
  "mp4",
  "wav",
  "ogg",
  "webm",
  "wasm",
  "exe",
  "dll",
  "so",
  "dylib",
  "pyc",
  "class",
  "db",
  "sqlite",
  "sqlite3",
])

export function isBinaryBufferOrPath(buf: Buffer, relativePath: string): boolean {
  const ext = relativePath.split(".").pop()?.toLowerCase() || ""
  if (BINARY_EXTENSIONS.has(ext)) return true
  const checkLen = Math.min(buf.byteLength, 8192)
  for (let i = 0; i < checkLen; i += 1) {
    if (buf[i] === 0) return true
  }
  return false
}

export async function readWorkspaceFileBuffer(
  rootPath: string,
  relativePath: string
): Promise<Buffer> {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Invalid file path")
  }
  const resolvedRoot = path.resolve(rootPath)
  const absolutePath = path.resolve(resolvedRoot, relativePath)
  if (!absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid file path")
  }
  return readFile(absolutePath)
}

export async function readWorkspaceFileDetailed(
  rootPath: string,
  relativePath: string
): Promise<{ content: string; isBinary: boolean; byteSize: number }> {
  const buf = await readWorkspaceFileBuffer(rootPath, relativePath)
  const isBinary = isBinaryBufferOrPath(buf, relativePath)
  return {
    content: isBinary ? "" : buf.toString("utf8"),
    isBinary,
    byteSize: buf.byteLength,
  }
}

export async function readWorkspaceFile(
  rootPath: string,
  relativePath: string
): Promise<string> {
  const buf = await readWorkspaceFileBuffer(rootPath, relativePath)
  if (isBinaryBufferOrPath(buf, relativePath)) {
    return ""
  }
  return buf.toString("utf8")
}

export async function packWorkspaceToBase64Zip(
  rootPath: string,
  maxTotalBytes = 12 * 1024 * 1024
): Promise<string | null> {
  try {
    const tree = await listWorkspaceTree(rootPath)
    const files = flattenWorkspaceTree(tree)
    if (files.length === 0) return null

    const zip = new JSZip()
    let totalBytes = 0
    let included = 0

    for (const rel of files.slice(0, 2000)) {
      if (!isSafeRelativePath(rel) || isIgnoredWorkspaceEntry(rel)) continue
      const buf = await readWorkspaceFileBuffer(rootPath, rel).catch(() => null)
      if (!buf || buf.byteLength > 4 * 1024 * 1024) continue
      if (totalBytes + buf.byteLength > maxTotalBytes) break
      totalBytes += buf.byteLength
      zip.file(rel, buf)
      included += 1
    }

    if (included === 0) return null
    const compressed = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })
    if (compressed.byteLength > 8 * 1024 * 1024) return null
    return compressed.toString("base64")
  } catch {
    return null
  }
}

export async function restoreWorkspaceFromBase64Zip(
  rootPath: string,
  base64Zip: string
): Promise<number> {
  if (!base64Zip) return 0
  const rawBuf = Buffer.from(base64Zip, "base64")
  const zip = await JSZip.loadAsync(rawBuf)
  const paths: string[] = []
  zip.forEach((relPath, entry) => {
    const unixPerms = typeof entry.unixPermissions === "number" ? entry.unixPermissions : 0
    const isSymlink = (unixPerms & 0o170000) === 0o120000
    if (!entry.dir && !isSymlink) {
      const clean = relPath.replace(/\\/g, "/")
      if (clean.length > 0 && clean.length <= 512 && isSafeRelativePath(clean) && !isIgnoredWorkspaceEntry(clean)) {
        paths.push(relPath)
      }
    }
  })

  let restored = 0
  await mkdir(rootPath, { recursive: true })
  const BATCH_SIZE = 20
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (rawPath) => {
        const entry = zip.file(rawPath)
        if (!entry || entry.dir) return
        const buf = await entry.async("nodebuffer")
        if (buf.byteLength > 10 * 1024 * 1024) return
        const clean = rawPath.replace(/\\/g, "/")
        await writeWorkspaceFile(rootPath, clean, buf)
        restored += 1
      })
    )
  }
  if (restored > 0) {
    await initializeGitRepository(rootPath)
  }
  return restored
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

export async function deleteWorkspaceFile(
  rootPath: string,
  relativePath: string
): Promise<void> {
  if (!isSafeRelativePath(relativePath)) {
    throw new Error("Invalid file path")
  }
  const normalized = relativePath.replace(/\\/g, "/")
  if (normalized === ".git" || normalized.startsWith(".git/")) {
    throw new Error("Cannot delete internal git files")
  }
  const resolvedRoot = path.resolve(rootPath)
  const absolutePath = path.resolve(resolvedRoot, relativePath)
  if (!absolutePath.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid file path")
  }
  await rm(absolutePath, { force: true })
}

export function flattenWorkspaceTree(nodes: WorkspaceTreeNode[]): string[] {
  const paths: string[] = []
  for (const node of nodes) {
    if (node.type === "file") paths.push(node.path)
    if (node.children) paths.push(...flattenWorkspaceTree(node.children))
  }
  return paths
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

function isSafeHttpsGitUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim()
  if (!trimmed || trimmed.startsWith("-") || /[\s\r\n\0]/.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

export async function ensureGitRemoteOrigin(
  rootPath: string,
  repositoryUrl?: string | null
): Promise<void> {
  if (!repositoryUrl || !isSafeHttpsGitUrl(repositoryUrl)) return
  const cleanUrl = repositoryUrl.trim()
  try {
    const existing = await getGitRemoteUrl(rootPath)
    if (!existing) {
      await git(rootPath, ["remote", "add", "origin", cleanUrl])
    } else if (existing !== cleanUrl) {
      await git(rootPath, ["remote", "set-url", "origin", cleanUrl])
    }
  } catch {
    // Ignore when git binary is unavailable in serverless runtime
  }
}

export async function cloneOrScaffoldGitWorkspace(
  projectId: string,
  opts: {
    name: string
    repositoryUrl?: string | null
    branch?: string | null
    githubToken?: string | null
    framework?: string | null
    language?: string | null
    allowScaffoldFallback?: boolean
  }
): Promise<{
  workspacePath: string
  cloned: boolean
  cloneError: string | null
  detectedFramework: string
  detectedLanguage: string
  detectedDependencies: string[]
  fileList: string[]
}> {
  const workspacePath = await ensureProjectWorkspace(projectId)
  let cloned = false
  let cloneError: string | null = null
  const allowScaffoldFallback = opts.allowScaffoldFallback ?? true

  if (opts.repositoryUrl && isSafeHttpsGitUrl(opts.repositoryUrl)) {
    const cleanUrl = opts.repositoryUrl.trim()
    const branchResult = opts.branch ? gitBranchNameSchema.safeParse(opts.branch.trim()) : null
    const safeBranch = branchResult?.success ? branchResult.data : null
    const parsedUrl = new URL(cleanUrl)
    const isGithubHost = parsedUrl.hostname.toLowerCase() === "github.com"

    try {
      await rm(workspacePath, { recursive: true, force: true })
      await mkdir(path.dirname(workspacePath), { recursive: true })
      const cloneArgs: string[] = [
        "-c",
        "core.hooksPath=",
        "-c",
        "core.symlinks=false",
        "-c",
        "protocol.file.allow=never",
        "-c",
        "protocol.ext.allow=never",
      ]
      if (opts.githubToken && isGithubHost) {
        const basicAuth = Buffer.from(`x-access-token:${opts.githubToken}`).toString("base64")
        cloneArgs.push("-c", `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basicAuth}`)
      }
      cloneArgs.push("clone", "--depth", "1", "--no-tags")
      if (safeBranch) {
        cloneArgs.push("--branch", safeBranch, "--single-branch")
      }
      cloneArgs.push("--", cleanUrl, workspacePath)

      await execFileAsync("git", cloneArgs, {
        env: buildGitEnv(),
        timeout: 30_000,
        maxBuffer: 10 * 1024 * 1024,
      })

      const clonedTree = await listWorkspaceTree(workspacePath).catch(() => [])
      if (flattenWorkspaceTree(clonedTree).length > 0) {
        cloned = true
      }
    } catch (err) {
      cloneError = err instanceof Error ? err.message.split("\n")[0] || "git clone failed" : "git clone failed"
      await mkdir(workspacePath, { recursive: true })
    }

    // Fallback (e.g. Vercel serverless where git binary is missing or shallow clone timed out):
    // download the full GitHub Zipball archive in one request and extract all nested files.
    if (!cloned && isGithubHost) {
      const ghMatch = cleanUrl
        .replace(/\.git$/i, "")
        .replace(/\/+$/, "")
        .match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i)
      if (ghMatch) {
        const [, owner, repo] = ghMatch
        try {
          const zipballUrl = safeBranch
            ? `https://api.github.com/repos/${owner}/${repo}/zipball/${encodeURIComponent(safeBranch)}`
            : `https://api.github.com/repos/${owner}/${repo}/zipball`
          const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",
            "User-Agent": "MODELVAULT",
          }
          if (opts.githubToken) {
            headers["Authorization"] = `Bearer ${opts.githubToken}`
          }
          const zipRes = await fetch(zipballUrl, {
            headers,
            signal: AbortSignal.timeout(25_000),
          })
          if (zipRes.ok) {
            const arrayBuffer = await zipRes.arrayBuffer()
            const zip = await JSZip.loadAsync(arrayBuffer)
            const rawEntries: string[] = []
            zip.forEach((relativePath, entry) => {
              const unixPerms = typeof entry.unixPermissions === "number" ? entry.unixPermissions : 0
              const isSymlink = (unixPerms & 0o170000) === 0o120000
              if (!entry.dir && !isSymlink) {
                rawEntries.push(relativePath)
              }
            })

            const { strip } = stripCommonRootDirectory(rawEntries)
            const candidateEntries = rawEntries
              .map((rawPath) => ({ rawPath, cleanPath: strip(rawPath) }))
              .filter(
                ({ cleanPath }) =>
                  cleanPath.length > 0 &&
                  cleanPath.length <= 512 &&
                  isSafeRelativePath(cleanPath) &&
                  !isIgnoredWorkspaceEntry(cleanPath)
              )
              .slice(0, 2500)

            const MAX_TOTAL_BYTES = 100 * 1024 * 1024
            const MAX_FILE_BYTES = 10 * 1024 * 1024
            let totalBytes = 0
            let extractedCount = 0

            const BATCH_SIZE = 20
            for (let i = 0; i < candidateEntries.length; i += BATCH_SIZE) {
              const batch = candidateEntries.slice(i, i + BATCH_SIZE)
              await Promise.all(
                batch.map(async ({ rawPath, cleanPath }) => {
                  const zipEntry = zip.file(rawPath)
                  if (!zipEntry || zipEntry.dir) return
                  const buf = await zipEntry.async("nodebuffer")
                  if (buf.byteLength > MAX_FILE_BYTES) return
                  if (totalBytes + buf.byteLength > MAX_TOTAL_BYTES) return
                  totalBytes += buf.byteLength
                  await writeWorkspaceFile(workspacePath, cleanPath, buf)
                  extractedCount += 1
                })
              )
              if (totalBytes >= MAX_TOTAL_BYTES) break
            }

            if (extractedCount > 0) {
              cloned = true
              cloneError = null
            }
          } else {
            cloneError = `GitHub returned HTTP ${zipRes.status} for ${owner}/${repo}`
          }
        } catch (err) {
          cloneError = err instanceof Error ? err.message : "Failed to fetch GitHub archive"
        }
      }
    }
  }

  if (!cloned) {
    if (allowScaffoldFallback) {
      await scaffoldStarterWorkspace(projectId, opts)
      await ensureGitRemoteOrigin(workspacePath, opts.repositoryUrl)
    }
  } else {
    await initializeGitRepository(workspacePath)
    await ensureGitRemoteOrigin(workspacePath, opts.repositoryUrl)
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
    cloneError,
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
): Promise<
  Array<{
    sha: string
    message: string
    author: string
    date: string
    filesChanged: number | null
    additions: number | null
    deletions: number | null
  }>
> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 20, 1), 100)
  try {
    const { stdout } = await git(rootPath, [
      "log",
      `--max-count=${safeLimit}`,
      "--pretty=format:__MV_COMMIT__%x1f%H%x1f%an%x1f%aI%x1f%s",
      "--numstat",
    ])
    const commits: Array<{
      sha: string
      message: string
      author: string
      date: string
      filesChanged: number | null
      additions: number | null
      deletions: number | null
    }> = []
    let current: {
      sha: string
      message: string
      author: string
      date: string
      filesChanged: number | null
      additions: number | null
      deletions: number | null
    } | null = null

    for (const rawLine of stdout.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line) continue
      if (line.startsWith("__MV_COMMIT__\x1f")) {
        if (current) commits.push(current)
        const [, sha = "", author = "", date = "", ...messageParts] = line.split("\x1f")
        current = {
          sha: sha.slice(0, 7),
          author,
          date,
          message: messageParts.join("\x1f"),
          filesChanged: null,
          additions: null,
          deletions: null,
        }
      } else if (current) {
        const parts = line.split("\t")
        if (parts.length >= 3) {
          const add = Number.parseInt(parts[0] || "0", 10)
          const del = Number.parseInt(parts[1] || "0", 10)
          current.filesChanged = (current.filesChanged ?? 0) + 1
          current.additions = (current.additions ?? 0) + (Number.isNaN(add) ? 0 : add)
          current.deletions = (current.deletions ?? 0) + (Number.isNaN(del) ? 0 : del)
        }
      }
    }
    if (current) commits.push(current)
    return commits
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
  for (const file of safeFiles) {
    try {
      await git(rootPath, ["checkout", "--", file])
    } catch {
      // Untracked file in working tree: remove it cleanly
      await deleteWorkspaceFile(rootPath, file).catch(() => {})
    }
  }
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

export async function verifyCommitExists(
  rootPath: string,
  commitSha: string
): Promise<boolean> {
  if (!/^[0-9a-fA-F]{4,40}$/.test(commitSha.trim())) {
    return false
  }
  try {
    await git(rootPath, ["cat-file", "-e", `${commitSha.trim()}^{commit}`])
    return true
  } catch {
    return false
  }
}

export async function revertCommit(rootPath: string, commitSha: string): Promise<string> {
  if (!/^[0-9a-fA-F]{4,40}$/.test(commitSha.trim())) {
    throw new Error("Invalid commit SHA")
  }
  try {
    await git(rootPath, ["revert", "--no-edit", "--no-verify", commitSha.trim()])
  } catch (err) {
    await git(rootPath, ["revert", "--abort"]).catch(() => {})
    throw err
  }
  const { stdout } = await git(rootPath, ["rev-parse", "--short", "HEAD"])
  return stdout.trim()
}

export async function mergeBranch(
  rootPath: string,
  sourceBranch: string,
  targetBranch = "main"
): Promise<{ merged: boolean; commitSha: string; output: string }> {
  const safeSource = assertValidGitBranchName(sourceBranch)
  const safeTarget = assertValidGitBranchName(targetBranch)
  const current = await getCurrentGitBranch(rootPath).catch(() => safeTarget)
  if (current === safeSource) {
    try {
      await git(rootPath, ["checkout", safeTarget, "--"])
    } catch {
      const branches = await getGitBranches(rootPath).catch(() => [])
      const fallback = branches.find((b) => b === "main" || b === "master")
      if (!fallback) {
        const commitSha = await getCurrentCommitSha(rootPath).catch(() => "")
        return { merged: false, commitSha, output: "No target base branch to merge into" }
      }
      await git(rootPath, ["checkout", fallback, "--"])
    }
  }
  const { stdout } = await git(rootPath, ["merge", "--no-ff", "--no-verify", safeSource])
  const commitSha = await getCurrentCommitSha(rootPath).catch(() => "")
  return { merged: true, commitSha, output: stdout.trim() || `Merged ${safeSource}` }
}

export async function deleteBranch(rootPath: string, branchName: string): Promise<void> {
  const safeBranch = assertValidGitBranchName(branchName)
  if (safeBranch === "main" || safeBranch === "master") return
  const current = await getCurrentGitBranch(rootPath).catch(() => "main")
  if (current === safeBranch) {
    const branches = await getGitBranches(rootPath).catch(() => [])
    const fallback = branches.find((b) => b === "main" || b === "master") || branches.find((b) => b !== safeBranch)
    if (fallback) {
      await git(rootPath, ["checkout", fallback, "--"]).catch(() => {})
    }
  }
  await git(rootPath, ["branch", "-D", safeBranch]).catch(() => {})
}

export async function getGitConflicts(
  rootPath: string
): Promise<Array<{ path: string; content: string }>> {
  const conflictPaths = new Set<string>()
  try {
    const { stdout } = await git(rootPath, ["diff", "--name-only", "--diff-filter=U"])
    for (const line of stdout.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed && isSafeRelativePath(trimmed)) conflictPaths.add(trimmed)
    }
  } catch {
    // Ignore git command failure
  }

  try {
    const tree = await listWorkspaceTree(rootPath)
    const files = flattenWorkspaceTree(tree).slice(0, 200)
    for (const filePath of files) {
      if (conflictPaths.has(filePath)) continue
      const content = await readWorkspaceFile(rootPath, filePath).catch(() => "")
      if (content.includes("<<<<<<<") && content.includes("=======") && content.includes(">>>>>>>")) {
        conflictPaths.add(filePath)
      }
    }
  } catch {
    // Ignore workspace tree error
  }

  const conflicts: Array<{ path: string; content: string }> = []
  for (const filePath of Array.from(conflictPaths).slice(0, 15)) {
    const content = await readWorkspaceFile(rootPath, filePath).catch(() => "")
    conflicts.push({ path: filePath, content: content.slice(0, 4000) })
  }
  return conflicts
}

function stripConflictMarkers(content: string, strategy: "ours" | "theirs"): string {
  const lines = content.split(/\r?\n/)
  const out: string[] = []
  let state: "normal" | "ours" | "theirs" = "normal"

  for (const line of lines) {
    if (line.startsWith("<<<<<<<")) {
      state = "ours"
      continue
    }
    if (line.startsWith("=======") && state === "ours") {
      state = "theirs"
      continue
    }
    if (line.startsWith(">>>>>>>") && (state === "ours" || state === "theirs")) {
      state = "normal"
      continue
    }
    if (state === "normal" || state === strategy) {
      out.push(line)
    }
  }
  return out.join("\n")
}

export async function resolveGitConflict(
  rootPath: string,
  filePath: string,
  strategy: "ours" | "theirs" | "manual",
  manualContent?: string
): Promise<void> {
  if (!isSafeRelativePath(filePath)) {
    throw new Error("Invalid file path")
  }
  if (strategy === "manual") {
    if (typeof manualContent !== "string") {
      throw new Error("Resolved content is required for manual conflict resolution")
    }
    await writeWorkspaceFile(rootPath, filePath, manualContent)
  } else {
    try {
      await git(rootPath, ["checkout", `--${strategy}`, "--", filePath])
    } catch {
      // File may contain conflict markers directly in working tree
    }
    const current = await readWorkspaceFile(rootPath, filePath).catch(() => "")
    if (current.includes("<<<<<<<") && current.includes("=======") && current.includes(">>>>>>>")) {
      const cleaned = stripConflictMarkers(current, strategy)
      await writeWorkspaceFile(rootPath, filePath, cleaned)
    }
  }
  await git(rootPath, ["add", "--", filePath]).catch(() => {})
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
