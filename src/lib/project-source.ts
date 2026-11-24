import { prisma } from "@/lib/db"
import {
  cloneOrScaffoldGitWorkspace,
  ensureGitRemoteOrigin,
  flattenWorkspaceTree,
  initializeGitRepository,
  isGitRepository,
  listWorkspaceTree,
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
  }>
}

/**
 * Ensures a project has a valid local source workspace directory on disk,
 * an initialized Git repository, a configured `origin` remote (when `repositoryUrl` is set),
 * and a persisted `ProjectSource` database record.
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

  const manifestJson = JSON.stringify({
    repositoryUrl: project.repositoryUrl || null,
    cloned: provisioned.cloned,
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
        },
      })
      .catch(() => null)
    if (created && Array.isArray(project.sources)) {
      project.sources.push(created)
    }
  }

  return workspacePath
}
