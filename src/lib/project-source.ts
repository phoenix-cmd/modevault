import { prisma } from "@/lib/db"
import {
  cloneOrScaffoldGitWorkspace,
  ensureGitRemoteOrigin,
  ensureProjectWorkspace,
  flattenWorkspaceTree,
  initializeGitRepository,
  isGitRepository,
  listWorkspaceTree,
  packWorkspaceToBase64Zip,
  restoreWorkspaceFromBase64Zip,
} from "@/lib/project-workspace"

export interface ProjectWithSources {
  id: string
  name: string
  repositoryUrl?: string | null
  defaultBranch?: string | null
  framework?: string | null
  language?: string | null
  sources?: Array<{
    id: string
    type?: string
    sourcePath?: string | null
    branch?: string | null
    manifestJson?: string | null
    archiveData?: string | null
  }>
}

/**
 * Saves the current workspace directory files into `ProjectSource.archiveData` and updates
 * `manifestJson.fileCount` & `files` so workspace files survive ephemeral container / /tmp resets.
 */
export async function persistProjectSourceSnapshot(
  projectId: string,
  workspacePath: string
): Promise<void> {
  try {
    const [tree, archiveData, existingSource] = await Promise.all([
      listWorkspaceTree(workspacePath).catch(() => []),
      packWorkspaceToBase64Zip(workspacePath),
      prisma.projectSource.findFirst({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      }),
    ])
    const fileList = flattenWorkspaceTree(tree)
    let prevManifest: Record<string, unknown> = {}
    if (existingSource?.manifestJson) {
      try {
        prevManifest = JSON.parse(existingSource.manifestJson) as Record<string, unknown>
      } catch {
        prevManifest = {}
      }
    }
    const manifestJson = JSON.stringify({
      ...prevManifest,
      fileCount: fileList.length,
      files: fileList.slice(0, 500),
      updatedAt: new Date().toISOString(),
    })

    if (existingSource) {
      await prisma.projectSource.update({
        where: { id: existingSource.id },
        data: {
          sourcePath: workspacePath,
          manifestJson,
          ...(archiveData ? { archiveData } : {}),
        },
      })
    } else {
      await prisma.projectSource.create({
        data: {
          projectId,
          type: "zip_upload",
          branch: "main",
          sourcePath: workspacePath,
          manifestJson,
          archiveData,
        },
      })
    }
  } catch {
    // Non-fatal snapshot persistence warning
  }
}

/**
 * Ensures a project has a valid local source workspace directory on disk,
 * restoring from `ProjectSource.archiveData` first when disk storage was reset,
 * before falling back to Git clone or starter scaffold.
 */
export async function ensureProjectSourceWorkspace(
  project: ProjectWithSources,
  githubToken?: string | null
): Promise<string> {
  const existingSource = project.sources?.find((s) => Boolean(s.sourcePath)) || project.sources?.[0]
  let workspacePath = existingSource?.sourcePath || null

  if (workspacePath) {
    const tree = await listWorkspaceTree(workspacePath).catch(() => [])
    const files = flattenWorkspaceTree(tree)
    if (files.length > 0) {
      if (!(await isGitRepository(workspacePath))) {
        await initializeGitRepository(workspacePath)
      }
      if (project.repositoryUrl) {
        await ensureGitRemoteOrigin(workspacePath, project.repositoryUrl)
      }
      return workspacePath
    }
  }

  // Step 2: Check durable database archive snapshot before ever scaffolding/cloning!
  const dbBackupSource = await prisma.projectSource
    .findFirst({
      where: { projectId: project.id, archiveData: { not: null } },
      select: { id: true, archiveData: true },
    })
    .catch(() => null)

  if (dbBackupSource?.archiveData) {
    try {
      const targetPath = await ensureProjectWorkspace(project.id)
      const restoredCount = await restoreWorkspaceFromBase64Zip(targetPath, dbBackupSource.archiveData)
      if (restoredCount > 0) {
        if (project.repositoryUrl) {
          await ensureGitRemoteOrigin(targetPath, project.repositoryUrl)
        }
        await prisma.projectSource
          .update({
            where: { id: dbBackupSource.id },
            data: { sourcePath: targetPath },
          })
          .catch(() => {})
        if (existingSource) existingSource.sourcePath = targetPath
        return targetPath
      }
    } catch {
      // Fall through to clone/scaffold if archive snapshot was unreadable
    }
  }

  // Step 3: Clone from remote Git repository or scaffold starter workspace
  const provisioned = await cloneOrScaffoldGitWorkspace(project.id, {
    name: project.name,
    repositoryUrl: project.repositoryUrl,
    branch: existingSource?.branch || project.defaultBranch || "main",
    githubToken,
    framework: project.framework,
    language: project.language,
    allowScaffoldFallback: true,
  })

  workspacePath = provisioned.workspacePath
  const archiveData = await packWorkspaceToBase64Zip(workspacePath)

  const manifestJson = JSON.stringify({
    repositoryUrl: project.repositoryUrl || null,
    cloned: provisioned.cloned,
    cloneError: provisioned.cloneError,
    fileCount: provisioned.fileList.length,
    files: provisioned.fileList.slice(0, 500),
    detectedFramework: provisioned.detectedFramework,
    detectedLanguage: provisioned.detectedLanguage,
    dependencies: provisioned.detectedDependencies,
  })

  if (existingSource?.id) {
    await prisma.projectSource
      .update({
        where: { id: existingSource.id },
        data: {
          sourcePath: workspacePath,
          manifestJson,
          ...(archiveData ? { archiveData } : {}),
        },
      })
      .catch(() => {})
    existingSource.sourcePath = workspacePath
    existingSource.manifestJson = manifestJson
  } else {
    const created = await prisma.projectSource
      .create({
        data: {
          projectId: project.id,
          type: project.repositoryUrl ? "git_clone" : "zip_upload",
          branch: project.defaultBranch || "main",
          sourcePath: workspacePath,
          manifestJson,
          archiveData,
        },
      })
      .catch(() => null)
    if (created && Array.isArray(project.sources)) {
      project.sources.push(created)
    }
  }

  return workspacePath
}
