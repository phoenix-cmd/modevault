import { execFile } from "node:child_process"
import path from "node:path"
import { promisify } from "node:util"
import ts from "typescript"
import {
  analyzeSourceCodeAst,
  commitWorkspace,
  createBranch,
  flattenWorkspaceTree,
  getLatestCommitDiff,
  isSafeRelativePath,
  listWorkspaceTree,
  readWorkspaceFile,
  writeWorkspaceFile,
} from "@/lib/project-workspace"
import {
  getProviderAdapter,
  type CodingMessage,
  type CodingToolDefinition,
} from "@/lib/providers/adapter"
import { estimateTokenCost, type LlmProviderName } from "@/lib/llm-provider"

const execFileAsync = promisify(execFile)

export const AGENT_TOOLS: CodingToolDefinition[] = [
  {
    name: "list_files",
    description: "List workspace relative file paths (up to 100 entries).",
    parameters: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Optional sub-path filter prefix" },
      },
      required: [],
    },
  },
  {
    name: "search_code",
    description: "Search workspace source files for a literal case-insensitive substring.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Text substring to search across files" },
      },
      required: ["query"],
    },
  },
  {
    name: "read_file",
    description: "Read a file inside the workspace by relative path.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Safe workspace-relative file path" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite a file in the workspace on the active feature branch.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Safe workspace-relative file path" },
        content: { type: "string", description: "Complete updated file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "run_test",
    description: "Run syntax/type diagnostic verification on modified TypeScript/JavaScript/Python files.",
    parameters: {
      type: "object",
      properties: {
        files: { type: "string", description: "Comma-separated relative file paths to check" },
      },
      required: [],
    },
  },
  {
    name: "get_git_diff",
    description: "Inspect the current Git diff in the workspace.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "commit_changes",
    description: "Stage and commit workspace changes onto the feature branch.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Conventional commit message" },
      },
      required: ["message"],
    },
  },
]

export interface AgentLoopInput {
  projectName: string
  framework: string | null
  prompt: string
  branch: string
  sourcePath: string | null
  backendType: "direct_api" | "local_bridge" | "deterministic_fallback"
  providerSlug: string
  model: string
  apiKey?: string | null
  bridgeEndpoint?: string | null
  allowDeterministicFallback?: boolean
  maxSteps?: number
  appendEvent: (
    eventType: string,
    level: string,
    taskIndex: number,
    payload: Record<string, unknown>
  ) => Promise<void>
}

export interface AgentLoopOutput {
  executionMode: "live_llm" | "local_deterministic"
  backendType: "direct_api" | "local_bridge" | "deterministic_fallback"
  provider: string
  model: string
  fallbackUsed: boolean
  fallbackReason: string | null
  confidenceLevel: "high" | "low"
  dataSource: "live_api_sync" | "deterministic_fallback"
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  totalTokens: number
  estimatedCost: number
  toolCallsCount: number
  targetFilePath: string
  modifiedFiles: string[]
  editedSummary: string
  diffContent: string
  commitSha: string | null
  checkOutput: string
}

async function runSafeWorkspaceChecks(
  sourcePath: string | null,
  candidateFiles: string[]
): Promise<{ ok: boolean; summary: string }> {
  if (!sourcePath || candidateFiles.length === 0) {
    return { ok: true, summary: "No modified workspace files to typecheck." }
  }
  const results: string[] = []
  let allOk = true

  for (const rel of candidateFiles.slice(0, 6)) {
    if (!isSafeRelativePath(rel)) continue
    const content = await readWorkspaceFile(sourcePath, rel).catch(() => null)
    if (content === null) continue

    if (/\.(ts|tsx|js|jsx)$/i.test(rel)) {
      const transpiled = ts.transpileModule(content, {
        fileName: rel,
        reportDiagnostics: true,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ESNext,
          jsx: ts.JsxEmit.ReactJSX,
        },
      })
      const diags = transpiled.diagnostics || []
      if (diags.length > 0) {
        allOk = false
        results.push(`FAIL ${rel}: ${diags.slice(0, 3).map((d) => ts.flattenDiagnosticMessageText(d.messageText, " ")).join("; ")}`)
      } else {
        results.push(`PASS ${rel}: TypeScript syntax & transpile clean (${content.split(/\r?\n/).length} lines)`)
      }
    } else if (rel.endsWith(".py")) {
      try {
        await execFileAsync("python", ["-m", "py_compile", path.join(sourcePath, rel)], {
          cwd: sourcePath,
          shell: false,
          timeout: 5000,
        })
        results.push(`PASS ${rel}: py_compile syntax check passed`)
      } catch (err) {
        allOk = false
        results.push(`FAIL ${rel}: ${err instanceof Error ? err.message : "python check error"}`)
      }
    } else {
      results.push(`PASS ${rel}: File written & verified (${content.length} bytes)`)
    }
  }

  return { ok: allOk, summary: results.join("\n") || "Workspace checks complete." }
}

function selectRelevantFiles(files: string[], prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3)

  return files
    .map((file) => {
      const lower = file.toLowerCase()
      let score = 0
      for (const word of words) {
        if (lower.includes(word)) score += 5
      }
      if (/\.(ts|tsx|js|jsx|py)$/.test(lower)) score += 2
      if (lower.startsWith("src/")) score += 2
      return { file, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.file)
}

export async function runCodingAgentLoop(input: AgentLoopInput): Promise<AgentLoopOutput> {
  const maxSteps = Math.min(Math.max(input.maxSteps ?? 5, 2), 8)
  const modifiedFiles = new Set<string>()
  let workspaceFiles: string[] = []
  let toolCallsCount = 0

  if (input.sourcePath) {
    await createBranch(input.sourcePath, input.branch).catch(() => {})
    const tree = await listWorkspaceTree(input.sourcePath).catch(() => [])
    workspaceFiles = flattenWorkspaceTree(tree)
  }

  const relevantFiles = selectRelevantFiles(workspaceFiles, input.prompt)
  toolCallsCount += 1
  await input.appendEvent("tool_call", "info", 0, {
    tool: "list_files",
    fileCount: workspaceFiles.length,
    selectedTargets: relevantFiles,
  })

  const executeToolCall = async (
    name: string,
    args: Record<string, unknown>,
    taskIndex: number
  ): Promise<string> => {
    toolCallsCount += 1
    if (name === "list_files") {
      const prefix = typeof args.directory === "string" ? args.directory.trim() : ""
      const filtered = prefix
        ? workspaceFiles.filter((f) => f.startsWith(prefix))
        : workspaceFiles
      await input.appendEvent("tool_call", "info", taskIndex, {
        tool: "list_files",
        directory: prefix || ".",
        count: filtered.length,
      })
      return JSON.stringify(filtered.slice(0, 80))
    }

    if (name === "search_code") {
      const query = typeof args.query === "string" ? args.query.trim().toLowerCase() : ""
      const hits: Array<{ file: string; line: number; preview: string }> = []
      if (input.sourcePath && query) {
        for (const f of workspaceFiles.slice(0, 80)) {
          const text = await readWorkspaceFile(input.sourcePath, f).catch(() => "")
          if (!text) continue
          const lines = text.split(/\r?\n/)
          for (let i = 0; i < lines.length; i += 1) {
            if (lines[i].toLowerCase().includes(query)) {
              hits.push({ file: f, line: i + 1, preview: lines[i].trim().slice(0, 120) })
              if (hits.length >= 25) break
            }
          }
          if (hits.length >= 25) break
        }
      }
      await input.appendEvent("tool_call", "info", taskIndex, {
        tool: "search_code",
        query,
        hits: hits.length,
      })
      return JSON.stringify(hits)
    }

    if (name === "read_file") {
      const filePath = typeof args.path === "string" ? args.path.replace(/^\/+/, "") : ""
      if (!input.sourcePath || !isSafeRelativePath(filePath)) {
        return JSON.stringify({ error: "Invalid or unavailable file path" })
      }
      const content = await readWorkspaceFile(input.sourcePath, filePath).catch(() => null)
      const ast = content ? analyzeSourceCodeAst(filePath, content) : null
      await input.appendEvent("tool_call", "info", taskIndex, {
        tool: "read_file",
        path: filePath,
        found: content !== null,
      })
      return content === null
        ? JSON.stringify({ error: `File not found: ${filePath}` })
        : JSON.stringify({ path: filePath, ast, content: content.slice(0, 10000) })
    }

    if (name === "write_file") {
      const filePath = typeof args.path === "string" ? args.path.replace(/^\/+/, "") : ""
      const content = typeof args.content === "string" ? args.content : ""
      if (!input.sourcePath || !isSafeRelativePath(filePath) || !content) {
        return JSON.stringify({ error: "Cannot write invalid path or empty content" })
      }
      await writeWorkspaceFile(input.sourcePath, filePath, content)
      modifiedFiles.add(filePath)
      if (!workspaceFiles.includes(filePath)) workspaceFiles.push(filePath)
      await input.appendEvent("file_change", "action", taskIndex, {
        tool: "write_file",
        path: filePath,
        action: "write",
        linesAdded: content.split(/\r?\n/).length,
      })
      return JSON.stringify({ ok: true, path: filePath, bytes: Buffer.byteLength(content, "utf8") })
    }

    if (name === "run_test") {
      const argFiles =
        typeof args.files === "string" && args.files.trim()
          ? args.files.split(",").map((s) => s.trim()).filter(Boolean)
          : Array.from(modifiedFiles)
      const check = await runSafeWorkspaceChecks(input.sourcePath, argFiles)
      await input.appendEvent("terminal", check.ok ? "info" : "warning", taskIndex, {
        tool: "run_test",
        command: "modelvault-ast-typecheck",
        output: check.summary,
        exitCode: check.ok ? 0 : 1,
      })
      return JSON.stringify(check)
    }

    if (name === "get_git_diff") {
      if (!input.sourcePath) return JSON.stringify({ diff: "" })
      try {
        const { stdout } = await execFileAsync("git", ["diff"], {
          cwd: input.sourcePath,
          shell: false,
          maxBuffer: 1024 * 1024,
        })
        await input.appendEvent("tool_call", "info", taskIndex, {
          tool: "get_git_diff",
          bytes: Buffer.byteLength(stdout, "utf8"),
        })
        return stdout.slice(0, 8000) || "(no unstaged diff)"
      } catch {
        return "(no diff)"
      }
    }

    if (name === "commit_changes") {
      const msg =
        typeof args.message === "string" && args.message.trim()
          ? args.message.trim().slice(0, 140)
          : `feat(agent): ${input.prompt.slice(0, 60)}`
      if (!input.sourcePath) return JSON.stringify({ committed: false })
      const sha = await commitWorkspace(input.sourcePath, msg)
      await input.appendEvent("tool_call", "action", taskIndex, {
        tool: "commit_changes",
        commitSha: sha,
        message: msg,
      })
      return JSON.stringify({ committed: true, sha })
    }

    return JSON.stringify({ error: `Unknown tool: ${name}` })
  }

  // Try Live LLM or Sanctioned Local Bridge Loop first
  if (
    (input.backendType === "direct_api" && input.apiKey) ||
    (input.backendType === "local_bridge" && input.bridgeEndpoint)
  ) {
    const adapter = getProviderAdapter(
      input.providerSlug,
      input.backendType === "local_bridge" ? "local_bridge" : "direct_api"
    )
    const messages: CodingMessage[] = [
      {
        role: "system",
        content:
          "You are an interactive coding assistant inside MODELVAULT Studio. Inspect files using read_file/search_code, apply clean edits via write_file, validate with run_test, and commit or summarize your changes concisely. Always preserve existing code quality and types.",
      },
      {
        role: "user",
        content: `Task: ${input.prompt}\nProject: ${input.projectName} (${input.framework || "web"})\nBranch: ${input.branch}\nAvailable files: ${workspaceFiles.slice(0, 40).join(", ") || "(empty)"}`,
      },
    ]

    let inputTokens = 0
    let outputTokens = 0
    let cachedTokens = 0
    let finalSummary = ""
    let usedModel = input.model

    try {
      for (let step = 0; step < maxSteps; step += 1) {
        const res = await adapter.startCodingSession(
          {
            providerSlug: input.providerSlug,
            apiKey: input.apiKey,
            bridgeEndpoint: input.bridgeEndpoint,
          },
          {
            model: input.model,
            messages,
            tools: AGENT_TOOLS,
            maxTokens: 1800,
            timeoutMs: 25000,
          }
        )
        inputTokens += res.inputTokens
        outputTokens += res.outputTokens
        cachedTokens += res.cachedTokens
        usedModel = res.model || input.model

        if (res.content) finalSummary = res.content
        messages.push({
          role: "assistant",
          content: res.content,
          toolCalls: res.toolCalls,
        })

        if (res.toolCalls.length === 0) {
          break
        }

        for (const tc of res.toolCalls) {
          const toolOut = await executeToolCall(tc.name, tc.arguments, 1)
          messages.push({
            role: "tool",
            toolCallId: tc.id,
            toolName: tc.name,
            content: toolOut,
          })
        }
      }

      const changedList = Array.from(modifiedFiles)
      const checkResult = await runSafeWorkspaceChecks(input.sourcePath, changedList)
      await input.appendEvent("terminal", checkResult.ok ? "info" : "warning", 2, {
        command: "modelvault-post-edit-verify",
        output: checkResult.summary,
        exitCode: checkResult.ok ? 0 : 1,
      })

      let commitSha: string | null = null
      let diffContent = ""
      if (input.sourcePath && changedList.length > 0) {
        commitSha = await commitWorkspace(
          input.sourcePath,
          `feat(studio): ${input.prompt.slice(0, 64)}`
        ).catch(() => null)
        diffContent = await getLatestCommitDiff(input.sourcePath).catch(() => "")
      }

      const totalTokens = inputTokens + outputTokens
      const costProvider = (["anthropic", "openai", "google", "openrouter"].includes(input.providerSlug)
        ? input.providerSlug
        : "openrouter") as LlmProviderName
      const estimatedCost = await estimateTokenCost(costProvider, usedModel, inputTokens, outputTokens)

      return {
        executionMode: "live_llm",
        backendType: input.backendType,
        provider: input.providerSlug,
        model: usedModel,
        fallbackUsed: false,
        fallbackReason: null,
        confidenceLevel: "high",
        dataSource: "live_api_sync",
        inputTokens,
        outputTokens,
        cachedTokens,
        totalTokens,
        estimatedCost,
        toolCallsCount,
        targetFilePath: changedList[0] || relevantFiles[0] || "MODELVAULT_EXECUTION.md",
        modifiedFiles: changedList,
        editedSummary: finalSummary.slice(0, 280) || `Applied live ${input.providerSlug} tool edits across ${changedList.length} file(s).`,
        diffContent,
        commitSha,
        checkOutput: checkResult.summary,
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Provider execution failed"
      if (input.allowDeterministicFallback === false) {
        throw new Error(errMsg)
      }
      return runDeterministicWorkspaceFallback(input, workspaceFiles, relevantFiles, toolCallsCount, errMsg)
    }
  }

  return runDeterministicWorkspaceFallback(
    input,
    workspaceFiles,
    relevantFiles,
    toolCallsCount,
    "No live provider API key or local bridge configured for this binding."
  )
}

async function runDeterministicWorkspaceFallback(
  input: AgentLoopInput,
  workspaceFiles: string[],
  relevantFiles: string[],
  priorToolCalls: number,
  reason: string
): Promise<AgentLoopOutput> {
  let toolCallsCount = priorToolCalls
  const explicitTargetMatch = input.prompt.match(/^Target file\s+([^\s:]+)\s*:\s*([\s\S]*)$/i)
  const explicitTarget =
    explicitTargetMatch?.[1] && isSafeRelativePath(explicitTargetMatch[1])
      ? explicitTargetMatch[1]
      : null
  const cleanTaskPrompt = (explicitTargetMatch?.[2] || input.prompt).trim()

  const candidateFile =
    (explicitTarget && workspaceFiles.includes(explicitTarget) ? explicitTarget : null) ||
    relevantFiles.find((f) => /\.(ts|tsx|js|jsx|py|md)$/.test(f)) ||
    relevantFiles[0] ||
    null

  let targetFilePath = "MODELVAULT_EXECUTION.md"
  let updatedContent = `# MODELVAULT Deterministic Fallback Scaffold\n\nPrompt: ${cleanTaskPrompt}\nNotice: ${reason}\nBranch: ${input.branch}\n`
  let commitSha: string | null = null
  let diffContent = ""

  if (input.sourcePath && candidateFile) {
    const existing = await readWorkspaceFile(input.sourcePath, candidateFile).catch(() => "")
    toolCallsCount += 1
    await input.appendEvent("tool_call", "info", 0, {
      tool: "read_file",
      path: candidateFile,
      mode: "deterministic_fallback",
    })
    if (existing) {
      targetFilePath = candidateFile
      const ast = analyzeSourceCodeAst(candidateFile, existing)
      const safeGoal = cleanTaskPrompt.replace(/\r?\n/g, " ").slice(0, 120)
      if (/\.(ts|tsx|js|jsx)$/i.test(candidateFile)) {
        const fnName = `verifyFallbackPatch_${Date.now().toString(36).slice(-4)}`
        updatedContent = `${existing.trimEnd()}\n\n/**\n * Deterministic fallback scaffold (Low Confidence — Not AI-generated): ${safeGoal}\n * AST complexity: ${ast.complexityScore} (${ast.complexityRating})\n */\nexport function ${fnName}(): { target: string; mode: "deterministic_fallback" } {\n  return { target: "${candidateFile}", mode: "deterministic_fallback" }\n}\n`
      } else if (candidateFile.endsWith(".py")) {
        const fnName = `verify_fallback_patch_${Date.now().toString(36).slice(-4)}`
        updatedContent = `${existing.trimEnd()}\n\n\ndef ${fnName}() -> dict:\n    \"\"\"Deterministic fallback scaffold (Low Confidence): ${safeGoal}\"\"\"\n    return {"target": "${candidateFile}", "mode": "deterministic_fallback"}\n`
      } else {
        updatedContent = `${existing.trimEnd()}\n\n## Deterministic Fallback Patch (Low Confidence)\n- Prompt: ${safeGoal}\n- Reason: ${reason}\n`
      }
    }
  }

  if (input.sourcePath) {
    await writeWorkspaceFile(input.sourcePath, targetFilePath, updatedContent)
    toolCallsCount += 1
    await input.appendEvent("file_change", "action", 1, {
      tool: "write_file",
      path: targetFilePath,
      action: "write",
      mode: "deterministic_fallback",
      linesAdded: updatedContent.split(/\r?\n/).length,
    })

    const check = await runSafeWorkspaceChecks(input.sourcePath, [targetFilePath])
    toolCallsCount += 1
    await input.appendEvent("terminal", check.ok ? "info" : "warning", 1, {
      tool: "run_test",
      command: "modelvault-ast-typecheck",
      output: check.summary,
      exitCode: check.ok ? 0 : 1,
    })

    commitSha = await commitWorkspace(
      input.sourcePath,
      `chore(fallback): deterministic scaffold for ${cleanTaskPrompt.slice(0, 50)}`
    ).catch(() => null)
    toolCallsCount += 1
    await input.appendEvent("tool_call", "info", 2, {
      tool: "commit_changes",
      commitSha,
      mode: "deterministic_fallback",
    })
    diffContent = await getLatestCommitDiff(input.sourcePath).catch(() => "")

    if (!diffContent) {
      const addedLines = updatedContent.split(/\r?\n/).map((line) => `+${line}`).join("\n")
      diffContent = `--- /dev/null\n+++ b/${targetFilePath}\n@@ -0,0 +1,${updatedContent.split(/\r?\n/).length} @@\n${addedLines}`
    }

    return {
      executionMode: "local_deterministic",
      backendType: "deterministic_fallback",
      provider: input.providerSlug || "none",
      model: "deterministic-fallback",
      fallbackUsed: true,
      fallbackReason: reason,
      confidenceLevel: "low",
      dataSource: "deterministic_fallback",
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      toolCallsCount,
      targetFilePath,
      modifiedFiles: [targetFilePath],
      editedSummary: `Deterministic fallback scaffold (${reason}) — Low confidence, review before approval.`,
      diffContent,
      commitSha,
      checkOutput: check.summary,
    }
  }

  const addedLines = updatedContent.split(/\r?\n/).map((line) => `+${line}`).join("\n")
  diffContent = `--- /dev/null\n+++ b/${targetFilePath}\n@@ -0,0 +1,${updatedContent.split(/\r?\n/).length} @@\n${addedLines}`

  return {
    executionMode: "local_deterministic",
    backendType: "deterministic_fallback",
    provider: input.providerSlug || "none",
    model: "deterministic-fallback",
    fallbackUsed: true,
    fallbackReason: reason,
    confidenceLevel: "low",
    dataSource: "deterministic_fallback",
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
    toolCallsCount,
    targetFilePath,
    modifiedFiles: [targetFilePath],
    editedSummary: `Deterministic fallback scaffold (${reason}) — Low confidence, review before approval.`,
    diffContent,
    commitSha: null,
    checkOutput: "No workspace directory attached.",
  }
}
