import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    const project = projectId
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const operations = await prisma.gitOperation.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    })

    const branches = [
      { name: "main", isDefault: true, protected: true, lastCommit: "f8a9201" },
      { name: "feature/checkout-idempotency", isDefault: false, protected: false, lastCommit: "c_9e12bf4" },
      { name: "feature/multi-agent-orchestrator", isDefault: false, protected: false, lastCommit: "b_3389a12" },
      { name: "fix/token-usage-aggregation", isDefault: false, protected: false, lastCommit: "a_0411d7c" },
    ]

    const commits = [
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
      {
        sha: "b_3389a12",
        message: "refactor(agent): decompose planner into dynamic DAG pipeline",
        author: "Alex Kumar",
        branch: "feature/multi-agent-orchestrator",
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        filesChanged: 4,
        additions: 142,
        deletions: 38,
        status: "verified",
      },
      {
        sha: "f8a9201",
        message: "chore: release v1.4.0 with real-time rate limit safeguards",
        author: "Sarah Chen",
        branch: "main",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        filesChanged: 12,
        additions: 310,
        deletions: 94,
        status: "verified",
      },
    ]

    const pullRequests = [
      {
        number: 42,
        title: "feat(checkout): atomic idempotency key validation",
        author: "MODELVAULT Agent",
        branch: "feature/checkout-idempotency",
        targetBranch: "main",
        status: "open",
        reviews: [{ reviewer: "Sarah Chen", state: "APPROVED" }],
        url: "https://github.com/acme/trade-engine/pull/42",
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ]

    return NextResponse.json({
      data: {
        currentBranch: project.defaultBranch || "main",
        branches,
        commits,
        pullRequests,
        operations,
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
      ? await prisma.project.findUnique({ where: { id: projectId } })
      : await prisma.project.findFirst()

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    if (action === "commit") {
      const sha = `c_${Math.random().toString(16).slice(2, 9)}`
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

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
