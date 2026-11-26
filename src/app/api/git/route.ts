import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuthenticatedUser, authErrorResponse } from "@/lib/auth"
import { decryptSecret } from "@/lib/crypto"
import { resolveUserGithubToken } from "@/lib/github-auth"
import { getUserAccessibleWorkspaceIds, requireProjectAccess } from "@/lib/permissions"
import {
  checkoutBranch,
  commitWorkspace,
  createBranch,
  discardFiles,
  getCurrentGitBranch,
  getGitBranches,
  getGitCommits,
  getGitConflicts,
  getGitDiff,
  getGitStatusFiles,
  getGitSyncStatus,
  gitFetch,
  gitPull,
  gitPush,
  mergeBranch,
  resolveGitConflict,
  revertCommit,
  stageFiles,
  unstageFiles,
  verifyCommitExists,
} from "@/lib/project-workspace"
import { ensureProjectSourceWorkspace, persistProjectSourceSnapshot } from "@/lib/project-source"
import { gitActionSchema, parseJson } from "@/lib/validation"
import { logger, errorContext } from "@/lib/logger"

function parseGithubOwnerRepo(repoUrl: string | null | undefined): { owner: string; repo: string } | null {
  if (!repoUrl) return null
  const clean = repoUrl.trim().replace(/\.git$/i, "").replace(/\/$/, "")
  const match = clean.match(/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/i)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

function parseGitlabProjectPath(repoUrl: string | null | undefined): string | null {
  if (!repoUrl) return null
  const clean = repoUrl.trim().replace(/\.git$/i, "").replace(/\/$/, "")
  const match = clean.match(/^https?:\/\/gitlab\.com\/(.+)$/i)
  return match ? match[1] : null
}

async function resolveUserGitlabToken(userId: string): Promise<string | null> {
  const cred = await prisma.integrationCredential.findUnique({
    where: { userId_providerSlug: { userId, providerSlug: "gitlab" } },
  })
  if (!cred?.encryptedKey) return null
  try {
    return decryptSecret(cred.encryptedKey).trim() || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")

    let project
    if (projectId) {
      project = await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "viewer")
      project = await prisma.project.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        include: { sources: true },
        orderBy: { updatedAt: "desc" },
      })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "viewer")

    const operations = await prisma.gitOperation.findMany({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
    })

    const ghToken = await resolveUserGithubToken(user.id)
    const hasGithubToken = Boolean(ghToken)
    const ghRepo = parseGithubOwnerRepo(project.repositoryUrl)
    const glToken = await resolveUserGitlabToken(user.id)
    const hasGitlabToken = Boolean(glToken)
    const glPath = parseGitlabProjectPath(project.repositoryUrl)

    let sourcePath: string | null = null
    try {
      sourcePath = await ensureProjectSourceWorkspace(project, ghToken)
    } catch {
      const source = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find(
        (item) => item.sourcePath
      )
      sourcePath = source?.sourcePath || null
    }

    let currentBranch = project.defaultBranch || "main"
    let branches: Array<{ name: string; isDefault: boolean; protected: boolean; lastCommit: string }> = []
    let commits: Array<{
      sha: string
      message: string
      author: string
      branch: string
      timestamp: string
      filesChanged: number | null
      additions: number | null
      deletions: number | null
      status: string
    }> = []
    let diff = ""
    let changes: Array<{ path: string; code: string; staged: boolean }> = []
    let sync: {
      hasRemote: boolean
      remoteUrl: string | null
      upstream: string | null
      branch: string
      ahead: number
      behind: number
    } | null = null
    let conflicts: Array<{ path: string; content: string }> = []

    if (sourcePath) {
      try {
        const realBranches = await getGitBranches(sourcePath)
        currentBranch = await getCurrentGitBranch(sourcePath)
        const realCommits = await getGitCommits(sourcePath)
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
          filesChanged: commit.filesChanged,
          additions: commit.additions,
          deletions: commit.deletions,
          status: "verified",
        }))
        diff = await getGitDiff(sourcePath).catch(() => "")
        changes = await getGitStatusFiles(sourcePath).catch(() => [])
        sync = await getGitSyncStatus(sourcePath).catch(() => null)
        conflicts = await getGitConflicts(sourcePath).catch(() => [])
      } catch {
        // Leave empty arrays when git binary is unavailable in serverless
      }
    }

    const pullRequests = operations
      .filter((op) => op.status === "pr_created" || op.status === "merged" || op.pullRequestNum !== null)
      .map((op) => ({
        id: op.id,
        number: op.pullRequestNum ?? 0,
        title: op.commitMessage || `Pull Request (${op.branchName})`,
        branch: op.branchName,
        targetBranch: op.baseBranch || "main",
        author: user.name || user.email,
        status: op.status,
        url: op.prUrl,
        isRemote: Boolean(
          op.prUrl &&
            (op.prUrl.startsWith("https://github.com/") || op.prUrl.startsWith("https://gitlab.com/"))
        ),
        createdAt: op.createdAt.toISOString(),
      }))

    return NextResponse.json(
      {
        data: {
          currentBranch,
          branches,
          commits,
          pullRequests,
          operations,
          diff,
          changes,
          conflicts,
          hasGithubToken,
          hasGithubRemote: Boolean(ghRepo),
          hasGitlabToken,
          hasGitlabRemote: Boolean(glPath),
          canCreateRemotePr: Boolean((ghToken && ghRepo) || (glToken && glPath)),
          isLocalWorkspace: Boolean(sourcePath),
          sync: sync || {
            hasRemote: false,
            remoteUrl: null,
            upstream: null,
            branch: currentBranch,
            ahead: 0,
            behind: 0,
          },
        },
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  } catch (err: unknown) {
    logger.error("Failed to load git state", errorContext(err))
    return authErrorResponse(err, "Failed to load git state")
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const parsed = await parseJson(req, gitActionSchema)
    if ("response" in parsed) return parsed.response
    const { action, projectId, branchName, commitMessage, commitSha, prTitle, prBody } = parsed.data
    const body = parsed.data

    let project
    if (projectId) {
      project = await prisma.project.findUnique({ where: { id: projectId }, include: { sources: true } })
    } else {
      const workspaceIds = await getUserAccessibleWorkspaceIds(user.id, "member")
      project = await prisma.project.findFirst({
        where: { workspaceId: { in: workspaceIds } },
        include: { sources: true },
        orderBy: { updatedAt: "desc" },
      })
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    await requireProjectAccess(project.id, user.id, "member")
    const ghTokenForWorkspace = await resolveUserGithubToken(user.id)
    let ensuredSourcePath: string | null = null
    try {
      ensuredSourcePath = await ensureProjectSourceWorkspace(project, ghTokenForWorkspace)
    } catch {
      const existing = (project as { sources?: Array<{ sourcePath?: string }> }).sources?.find(
        (item) => item.sourcePath
      )
      ensuredSourcePath = existing?.sourcePath || null
    }
    const source = ensuredSourcePath ? { sourcePath: ensuredSourcePath } : undefined

    if (action === "commit") {
      if (!source?.sourcePath) {
        return NextResponse.json(
          { error: "This project has no writable Git workspace" },
          { status: 400 }
        )
      }
      const sha = await commitWorkspace(source.sourcePath, commitMessage || "feat: automated agent mutation")
      await persistProjectSourceSnapshot(project.id, source.sourcePath)
      const op = await prisma.gitOperation.create({
        data: {
          projectId: project.id,
          branchName: branchName || project.defaultBranch,
          commitSha: sha,
          commitMessage: commitMessage || "feat: automated agent mutation",
          status: "committed",
        },
      })
      return NextResponse.json({ data: { message: "Commit created", sha, operation: op } }, { status: 201 })
    }

    if (action === "revert") {
      if (!source?.sourcePath) {
        return NextResponse.json({ error: "No local Git workspace available to revert commits" }, { status: 400 })
      }
      if (!commitSha || !(await verifyCommitExists(source.sourcePath, commitSha))) {
        return NextResponse.json(
          { error: `Commit ${commitSha || "(missing)"} not found in workspace git history` },
          { status: 409 }
        )
      }
      try {
        const revertSha = await revertCommit(source.sourcePath, commitSha)
        await persistProjectSourceSnapshot(project.id, source.sourcePath)
        const op = await prisma.gitOperation.create({
          data: {
            projectId: project.id,
            branchName: branchName || project.defaultBranch,
            commitSha: revertSha,
            commitMessage: `revert: Revert commit ${commitSha}`,
            status: "reverted",
          },
        })
        return NextResponse.json({
          data: {
            message: `Commit ${commitSha} reverted (${revertSha})`,
            revertSha,
            simulated: false,
            operation: op,
          },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Git revert conflicted"
        return NextResponse.json({ error: `Revert failed: ${message}` }, { status: 409 })
      }
    }

    if (action === "pr") {
      const headBranch = branchName || project.defaultBranch || "main"
      const baseBranch = "main"
      const title = prTitle || `PR: ${headBranch}`
      const ghToken = await resolveUserGithubToken(user.id)
      const ghRepo = parseGithubOwnerRepo(project.repositoryUrl)
      const glToken = await resolveUserGitlabToken(user.id)
      const glPath = parseGitlabProjectPath(project.repositoryUrl)

      let prNumber = 0
      let prUrl = ""
      let simulated = true
      let notice: string | null = null

      if (ghToken && ghRepo) {
        try {
          const ghRes = await fetch(
            `https://api.github.com/repos/${ghRepo.owner}/${ghRepo.repo}/pulls`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${ghToken}`,
                Accept: "application/vnd.github+json",
                "Content-Type": "application/json",
                "User-Agent": "MODELVAULT",
              },
              body: JSON.stringify({
                title,
                head: headBranch,
                base: baseBranch,
                body: prBody || `Opened from MODELVAULT workspace (${project.name}).`,
              }),
              signal: AbortSignal.timeout(10000),
            }
          )
          if (ghRes.ok) {
            const createdPr = (await ghRes.json()) as { number: number; html_url: string }
            prNumber = createdPr.number
            prUrl = createdPr.html_url
            simulated = false
          } else {
            const errJson = (await ghRes.json().catch(() => ({}))) as { message?: string }
            notice = `GitHub API declined PR (${errJson.message || ghRes.status}); recorded as local PR draft.`
          }
        } catch (err) {
          notice = `GitHub API unreachable (${err instanceof Error ? err.message : "network error"}); recorded as local PR draft.`
        }
      } else if (glToken && glPath) {
        try {
          const glRes = await fetch(
            `https://gitlab.com/api/v4/projects/${encodeURIComponent(glPath)}/merge_requests`,
            {
              method: "POST",
              headers: {
                "PRIVATE-TOKEN": glToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                title,
                source_branch: headBranch,
                target_branch: baseBranch,
                description: prBody || `Opened from MODELVAULT workspace (${project.name}).`,
              }),
              signal: AbortSignal.timeout(10000),
            }
          )
          if (glRes.ok) {
            const createdMr = (await glRes.json()) as { iid: number; web_url: string }
            prNumber = createdMr.iid
            prUrl = createdMr.web_url
            simulated = false
          } else {
            notice = `GitLab API declined MR (HTTP ${glRes.status}); recorded as local PR draft.`
          }
        } catch (err) {
          notice = `GitLab API unreachable (${err instanceof Error ? err.message : "network error"}); recorded as local PR draft.`
        }
      } else {
        const missingReason = !ghRepo && !glPath
          ? "Project has no GitHub or GitLab repository URL configured."
          : "No GitHub or GitLab token connected in Integrations."
        if (!body.allowLocalDraft) {
          return NextResponse.json(
            {
              error: `${missingReason} Connect a remote repository and provider token to open a live pull request, or explicitly save a local review draft.`,
            },
            { status: 422 }
          )
        }
        notice = `${missingReason} Saved as local review draft (not pushed to remote).`
      }

      if (simulated) {
        const existingPrCount = await prisma.gitOperation.count({
          where: { projectId: project.id, pullRequestNum: { not: null } },
        })
        prNumber = existingPrCount + 1
        prUrl = `local://workspace/${project.slug}/pull/${prNumber}`
      }

      const op = await prisma.gitOperation.create({
        data: {
          projectId: project.id,
          branchName: headBranch,
          baseBranch,
          status: "pr_created",
          pullRequestNum: prNumber,
          prUrl,
          commitMessage: title,
        },
      })

      return NextResponse.json(
        {
          data: {
            message: simulated ? "Local PR draft recorded" : `Live GitHub Pull Request #${prNumber} created`,
            pullRequestNumber: prNumber,
            url: prUrl,
            title,
            simulated,
            notice,
            operation: op,
          },
        },
        { status: 201 }
      )
    }

    if (action === "stage") {
      if (source?.sourcePath) await stageFiles(source.sourcePath, body.files)
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes staged", changes } })
    }

    if (action === "unstage") {
      if (source?.sourcePath) await unstageFiles(source.sourcePath, body.files)
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes unstaged", changes } })
    }

    if (action === "discard") {
      if (source?.sourcePath && Array.isArray(body.files)) {
        await discardFiles(source.sourcePath, body.files)
        await persistProjectSourceSnapshot(project.id, source.sourcePath)
      }
      const changes = source?.sourcePath ? await getGitStatusFiles(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Changes discarded", changes } })
    }

    if (action === "branch") {
      if (!branchName) {
        return NextResponse.json({ error: "branchName is required" }, { status: 400 })
      }
      if (source?.sourcePath) await createBranch(source.sourcePath, branchName)
      await prisma.project.update({ where: { id: project.id }, data: { defaultBranch: branchName } })
      const branches = source?.sourcePath ? await getGitBranches(source.sourcePath).catch(() => []) : []
      return NextResponse.json({ data: { message: "Branch created", branchName, branches } })
    }

    if (action === "checkout") {
      if (!branchName) {
        return NextResponse.json({ error: "branchName is required" }, { status: 400 })
      }
      if (source?.sourcePath) {
        await checkoutBranch(source.sourcePath, branchName)
        await persistProjectSourceSnapshot(project.id, source.sourcePath)
      }
      await prisma.project.update({ where: { id: project.id }, data: { defaultBranch: branchName } })
      return NextResponse.json({ data: { message: "Checked out branch", branchName } })
    }

    if (action === "resolve_conflict") {
      if (!source?.sourcePath) {
        return NextResponse.json({ error: "No local Git workspace available" }, { status: 400 })
      }
      if (!body.file) {
        return NextResponse.json({ error: "file is required to resolve conflict" }, { status: 400 })
      }
      await resolveGitConflict(
        source.sourcePath,
        body.file,
        body.strategy || "ours",
        body.content
      )
      await persistProjectSourceSnapshot(project.id, source.sourcePath)
      const conflicts = await getGitConflicts(source.sourcePath).catch(() => [])
      const changes = await getGitStatusFiles(source.sourcePath).catch(() => [])
      return NextResponse.json({
        data: {
          message: `Resolved conflict in ${body.file} (${body.strategy || "ours"})`,
          file: body.file,
          conflicts,
          changes,
        },
      })
    }

    if (action === "merge") {
      if (!source?.sourcePath) {
        return NextResponse.json({ error: "No local Git workspace available to merge branches" }, { status: 400 })
      }
      if (!branchName) {
        return NextResponse.json({ error: "branchName is required to merge" }, { status: 400 })
      }
      const target = body.targetBranch || "main"
      try {
        const result = await mergeBranch(source.sourcePath, branchName, target)
        await persistProjectSourceSnapshot(project.id, source.sourcePath)
        if (body.operationId) {
          await prisma.gitOperation
            .update({
              where: { id: body.operationId },
              data: { status: "merged", commitSha: result.commitSha || undefined },
            })
            .catch(() => {})
        } else {
          await prisma.gitOperation.create({
            data: {
              projectId: project.id,
              branchName,
              baseBranch: target,
              commitSha: result.commitSha || null,
              commitMessage: `Merge branch '${branchName}' into ${target}`,
              status: "merged",
            },
          })
        }
        return NextResponse.json({
          data: {
            message: `Merged ${branchName} into ${target}`,
            ...result,
          },
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Branch merge failed"
        return NextResponse.json({ error: message }, { status: 409 })
      }
    }

    if (action === "push" || action === "pull" || action === "fetch") {
      if (!source?.sourcePath) {
        return NextResponse.json({ error: "This project has no local Git workspace to sync" }, { status: 400 })
      }
      try {
        if (action === "push") {
          const result = await gitPush(source.sourcePath)
          await prisma.gitOperation.create({
            data: {
              projectId: project.id,
              branchName: result.branch,
              commitMessage: `push: ${result.branch} -> origin`,
              status: "pushed",
            },
          })
          const sync = await getGitSyncStatus(source.sourcePath)
          return NextResponse.json({ data: { ...result, sync } })
        }
        if (action === "pull") {
          const result = await gitPull(source.sourcePath)
          await persistProjectSourceSnapshot(project.id, source.sourcePath)
          const sync = await getGitSyncStatus(source.sourcePath)
          return NextResponse.json({ data: { ...result, sync } })
        }
        const result = await gitFetch(source.sourcePath)
        const sync = await getGitSyncStatus(source.sourcePath)
        return NextResponse.json({ data: { ...result, sync } })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Git sync failed"
        logger.warn("Git sync failed", { action, projectId: project.id, message })
        return NextResponse.json({ error: message }, { status: 409 })
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    logger.error("Git action failed", errorContext(err))
    return authErrorResponse(err, "Git action failed")
  }
}
