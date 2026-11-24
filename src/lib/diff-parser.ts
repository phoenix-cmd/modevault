export interface ParsedUnifiedDiff {
  original: string
  modified: string
  additions: number
  deletions: number
  filePath: string
  isParsed: boolean
  language: string
}

export function inferLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase()
  if (ext === "ts" || ext === "tsx") return "typescript"
  if (ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs") return "javascript"
  if (ext === "json") return "json"
  if (ext === "py") return "python"
  if (ext === "css" || ext === "scss") return "css"
  if (ext === "html") return "html"
  if (ext === "md" || ext === "mdx") return "markdown"
  if (ext === "sql") return "sql"
  if (ext === "yml" || ext === "yaml") return "yaml"
  return "plaintext"
}

/**
 * Parse a standard unified Git diff string into reconstructed original/modified text buffers
 * suitable for Monaco's DiffEditor, along with line addition/deletion counts and target path.
 */
export function parseUnifiedDiff(diffContent: string, fallbackPath?: string): ParsedUnifiedDiff {
  const clean = (diffContent || "").trim()
  let filePath = fallbackPath || "MODELVAULT_EXECUTION.md"

  if (!clean) {
    return {
      original: "",
      modified: "",
      additions: 0,
      deletions: 0,
      filePath,
      isParsed: false,
      language: inferLanguageFromPath(filePath),
    }
  }

  const lines = diffContent.split(/\r?\n/)
  const originalLines: string[] = []
  const modifiedLines: string[] = []
  let additions = 0
  let deletions = 0
  let inHunk = false
  let foundHunk = false
  let fileCaptured = false

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      inHunk = false
      const match = line.match(/\sb\/(.+)$/)
      if (match?.[1] && !fileCaptured) {
        filePath = match[1].trim()
      }
      continue
    }
    if (line.startsWith("+++ ")) {
      const target = line.slice(4).trim()
      if (target !== "/dev/null" && !fileCaptured) {
        filePath = target.startsWith("b/") ? target.slice(2) : target
        fileCaptured = true
      }
      continue
    }
    if (line.startsWith("--- ") || line.startsWith("index ") || line.startsWith("new file mode")) {
      continue
    }
    if (line.startsWith("@@")) {
      inHunk = true
      foundHunk = true
      continue
    }
    if (!inHunk) continue

    if (line.startsWith("+")) {
      additions += 1
      modifiedLines.push(line.slice(1))
    } else if (line.startsWith("-")) {
      deletions += 1
      originalLines.push(line.slice(1))
    } else if (line.startsWith(" ")) {
      const text = line.slice(1)
      originalLines.push(text)
      modifiedLines.push(text)
    } else if (line === "\\ No newline at end of file") {
      continue
    }
  }

  if (!foundHunk) {
    const contentLines = lines.length
    return {
      original: "",
      modified: diffContent,
      additions: contentLines,
      deletions: 0,
      filePath,
      isParsed: false,
      language: inferLanguageFromPath(filePath),
    }
  }

  return {
    original: originalLines.join("\n"),
    modified: modifiedLines.join("\n"),
    additions,
    deletions,
    filePath,
    isParsed: true,
    language: inferLanguageFromPath(filePath),
  }
}
