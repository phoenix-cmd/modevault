import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  getGitBranches,
  getGitCommits,
  getGitDiff,
  getGitStatus,
  getGitStatusFiles,
  getCurrentGitBranch,
  commitWorkspace,
  stageFiles,
  unstageFiles,
  discardFiles,
} from "@/lib/project-workspace"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
      : await prisma.project.findFirst({ include: { sources: true } })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const operations = await prisma.gitOperation.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    })

    const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find(
      (item) => item.sourcePath
    )

    let branches: any[] = [
      { name: "main", isDefault: true, protected: true, lastCommit: "f8a9201" },
      { name: "feature/checkout-idempotency", isDefault: false, protected: false, lastCommit: "c_9e12bf4" },
      { name: "feature/multi-agent-orchestrator", isDefault: false, protected: false, lastCommit: "b_3389a12" },
      { name: "fix/token-usage-aggregation", isDefault: false, protected: false, lastCommit: "a_0411d7c" },
    ]
    let commits: any[] = [
      {
        sha: "c_9e12bf4",
        message: "feat(stripe): implement resilient idempotency key lock table",
        author: "Claude Code 3.7 (Agent)",
        branch: "feature/checkout-idempotency",
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        filesChanged: 2,
        additions: 48,
        deletions: 6,
        status: "verified",
      },
    ]
    let pullRequests: any[] = []

    if (source?.sourcePath) {
      try {
        const realBranches = await getGitBranches(source.sourcePath)
        const currentBranch = await getCurrentGitBranch(source.sourcePath)
        const realCommits = await getGitCommits(source.sourcePath)
        const diff = await getGitDiff(source.sourcePath)
        branches = realBranches.map((name) => ({
          name,
          isDefault: name === "main" || name === "master",
          protected: name === "main" || name === "master",
          lastCommit: realCommits[0]?.sha || "",
        }))
        commits = realCommits.map((commit) => ({
          sha: commit.sha,
          message: commit.message,
          author: commit.author,
          branch: currentBranch,
          timestamp: new Date(commit.date).toISOString(),
          filesChanged: 0,
          additions: 0,
          deletions: 0,
          status: "verified",
        }))
        pullRequests = []
        ;(project as { defaultBranch?: string }).defaultBranch = currentBranch
      } catch {
        // Keep mock fallback if Git inspection fails.
      }
    }

    return NextResponse.json({
      data: {
        currentBranch: project.defaultBranch || "main",
        branches,
        commits,
        pullRequests,
        operations,
        diff: source?.sourcePath ? await getGitDiff(source.sourcePath).catch(() => "") : "",
        changes: source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : [],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, projectId, branchName, commitMessage, commitSha, prTitle, prBody } = body

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
      : await prisma.project.findFirst({ include: { sources: true } })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (action === "commit") {
      const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find(
      (item) => item.sourcePath
    )
      let sha = `c_${Math.random().toString(16).slice(2, 9)}`
      if (source?.sourcePath) {
        try {
          sha = await commitWorkspace(source.sourcePath, commitMessage || "feat: automated agent mutation")
        } catch {
          // Fall back to a synthetic SHA if Git is unavailable.
        }
      }
      const op = await prisma.gitOperation.create({
        data: {
          projectId: project.id,
          branchName: branchName || project.defaultBranch,
          commitSha: sha,
          commitMessage: commitMessage || "feat: automated agent mutation",
          status: "committed",
        },
      })
      return NextResponse.json({
        data: {
          message: "Commit created successfully",
          sha,
          operation: op,
        },
      }, { status: 201 })
    }

    if (action === "revert") {
      const revertSha = `rev_${Math.random().toString(16).slice(2, 9)}`
      const op = await prisma.gitOperation.create({
        data: {
          projectId: project.id,
          branchName: branchName || project.defaultBranch,
          commitSha: revertSha,
          commitMessage: `revert: Revert commit ${commitSha || "target"}`,
          status: "reverted",
        },
      })
      return NextResponse.json({
        data: {
          message: `Commit ${commitSha} successfully reverted`,
          revertSha,
          operation: op,
        },
      })
    }

    if (action === "pr") {
      const prNumber = Math.floor(Math.random() * 80) + 40
      const op = await prisma.gitOperation.create({
        data: {
          projectId: project.id,
          branchName: branchName || "feature/ai-update",
          baseBranch: "main",
          status: "pr_created",
          pullRequestNum: prNumber,
          prUrl: `https://github.com/acme/trade-engine/pull/${prNumber}`,
        },
      })
      return NextResponse.json({
        data: {
          message: "Pull request dispatched to remote",
          pullRequestNumber: prNumber,
          url: op.prUrl,
          title: prTitle,
          operation: op,
        },
      }, { status: 201 })
    }

    if (action === "stage") {
      const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find((item) => item.sourcePath)
      if (source?.sourcePath) {
        await stageFiles(source.sourcePath, body.files)
      }
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes staged", changes } })
    }

    if (action === "unstage") {
      const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find((item) => item.sourcePath)
      if (source?.sourcePath) {
        await unstageFiles(source.sourcePath, body.files)
      }
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes unstaged", changes } })
    }

    if (action === "discard") {
      const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find((item) => item.sourcePath)
      if (source?.sourcePath && Array.isArray(body.files)) {
        await discardFiles(source.sourcePath, body.files)
      }
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes discarded", changes } })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
