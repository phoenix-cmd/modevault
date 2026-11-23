import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { requireProjectAccess } from "@/lib/permissions"
import { logger, errorContext } from "@/lib/logger"

export interface ServerSecurityFinding {
  id: string
  ruleId: string
  severity: "critical" | "warning" | "info"
  title: string
  file: string
  line: number
  evidence: string
  remediation: string
}

export function scanExecutionDiffServerSide(diffText: string, defaultFilePath: string): {
  diffSha256: string
  addedLineCount: number
  findings: ServerSecurityFinding[]
} {
  const diffSha256 = crypto.createHash("sha256").update(diffText || "", "utf8").digest("hex")
  const findings: ServerSecurityFinding[] = []
  let currentFile = defaultFilePath || "workspace"
  let lineNo = 0
  let addedLineCount = 0

  for (const rawLine of (diffText || "").split(/\r?\n/)) {
    if (rawLine.startsWith("+++ b/")) {
      currentFile = rawLine.slice(6).trim()
      continue
    }
    const hunk = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (hunk) {
      lineNo = Number.parseInt(hunk[1], 10) - 1
      continue
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lineNo += 1
      addedLineCount += 1
      const content = rawLine.slice(1)

      if (/\$queryRawUnsafe|\$executeRawUnsafe|SELECT\s+.+\s+FROM\s+.+\$\{/i.test(content)) {
        findings.push({
          id: `${currentFile}:${lineNo}:sql`,
          ruleId: "MV-SQL-001",
          severity: "critical",
          title: "Unparameterized SQL query construction",
          file: currentFile,
          line: lineNo,
          evidence: content.trim(),
          remediation: "Use parameterized Prisma queries or tagged template $queryRaw.",
        })
      } else if (/dangerouslySetInnerHTML|innerHTML\s*=/.test(content)) {
        findings.push({
          id: `${currentFile}:${lineNo}:xss`,
          ruleId: "MV-XSS-002",
          severity: "warning",
          title: "Direct HTML injection sink in added code",
          file: currentFile,
          line: lineNo,
          evidence: content.trim(),
          remediation: "Render escaped JSX or sanitize untrusted HTML before injection.",
        })
      } else if (/\b(eval|new Function)\s*\(/.test(content)) {
        findings.push({
          id: `${currentFile}:${lineNo}:eval`,
          ruleId: "MV-EXEC-003",
          severity: "critical",
          title: "Dynamic code evaluation detected",
          file: currentFile,
          line: lineNo,
          evidence: content.trim(),
          remediation: "Replace dynamic evaluation with structured parsing.",
        })
      } else if (/(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(content)) {
        findings.push({
          id: `${currentFile}:${lineNo}:secret`,
          ruleId: "MV-SEC-004",
          severity: "critical",
          title: "Potential credential literal in diff",
          file: currentFile,
          line: lineNo,
          evidence: content.trim().slice(0, 80),
          remediation: "Move secret values to environment configuration or encrypted credential storage.",
        })
      } else if (/Math\.random\(\)/.test(content) && /token|key|secret|idempotency|nonce|auth/i.test(content)) {
        findings.push({
          id: `${currentFile}:${lineNo}:rng`,
          ruleId: "MV-CRYPTO-005",
          severity: "info",
          title: "Non-cryptographic random number used for identifier/key",
          file: currentFile,
          line: lineNo,
          evidence: content.trim(),
          remediation: "Prefer crypto.randomUUID() or crypto.randomBytes() for security-sensitive identifiers.",
        })
      }
    } else if (!rawLine.startsWith("-")) {
      lineNo += 1
    }
  }

  return {
    diffSha256,
    addedLineCount,
    findings,
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthenticatedUser()
    const { id } = await params

    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        artifacts: true,
        gitOperations: true,
        tasks: true,
      },
    })

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }

    await requireProjectAccess(execution.projectId, user.id, "viewer")

    const diffArtifact = execution.artifacts.find((a) => a.type === "git_diff")
    const diffText = diffArtifact?.content || ""
    const scan = scanExecutionDiffServerSide(diffText, diffArtifact?.path || "workspace")
    const commitSha = execution.gitOperations[0]?.commitSha || null

    return NextResponse.json({
      data: {
        executionId: execution.id,
        status: execution.status,
        commitSha,
        diffSha256: scan.diffSha256,
        addedLineCount: scan.addedLineCount,
        findings: scan.findings,
        scannerVersion: "modelvault-verify-engine/2.0.0",
        verifiedAt: new Date().toISOString(),
      },
    })
  } catch (err: unknown) {
    logger.error("Execution verification GET failed", errorContext(err))
    return authErrorResponse(err, "Failed to verify execution")
  }
}
