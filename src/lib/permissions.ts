import { prisma } from "@/lib/db"
import { AuthError } from "@/lib/auth"

export type RoleName = "viewer" | "member" | "admin" | "owner"

const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

export function hasMinimumRole(role: string, minimumRole: RoleName): boolean {
  return (ROLE_RANK[role] ?? -1) >= ROLE_RANK[minimumRole]
}

export async function requireOrganizationAccess(
  organizationId: string,
  userId: string,
  minimumRole: RoleName = "viewer"
): Promise<{ organizationId: string; role: string }> {
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new AuthError("Forbidden", 403)
  }

  if (!hasMinimumRole(membership.role, minimumRole)) {
    throw new AuthError("Insufficient permissions", 403)
  }

  return { organizationId, role: membership.role }
}

export async function requireWorkspaceAccess(
  workspaceId: string,
  userId: string,
  minimumRole: RoleName = "viewer"
): Promise<{ workspaceId: string; organizationId: string; role: string }> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      organization: {
        include: {
          memberships: {
            where: { userId },
          },
        },
      },
    },
  })

  if (!workspace) {
    throw new AuthError("Workspace not found", 404)
  }

  const membership = workspace.organization.memberships[0]
  if (!membership) {
    throw new AuthError("Forbidden", 403)
  }

  if (!hasMinimumRole(membership.role, minimumRole)) {
    throw new AuthError("Insufficient permissions", 403)
  }

  return {
    workspaceId: workspace.id,
    organizationId: workspace.organizationId,
    role: membership.role,
  }
}

export async function resolveUserDefaultWorkspace(
  userId: string,
  minimumRole: RoleName = "viewer"
): Promise<{ workspaceId: string; organizationId: string; role: string }> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          workspaces: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  for (const m of memberships) {
    if (!hasMinimumRole(m.role, minimumRole)) continue
    const ws = m.organization.workspaces[0]
    if (ws) {
      return {
        workspaceId: ws.id,
        organizationId: m.organizationId,
        role: m.role,
      }
    }
  }

  throw new AuthError("Forbidden", 403)
}

export async function getUserAccessibleWorkspaceIds(
  userId: string,
  minimumRole: RoleName = "viewer"
): Promise<string[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          workspaces: {
            select: { id: true },
          },
        },
      },
    },
  })

  const ids: string[] = []
  for (const m of memberships) {
    if (!hasMinimumRole(m.role, minimumRole)) continue
    for (const ws of m.organization.workspaces) {
      ids.push(ws.id)
    }
  }
  return ids
}

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minimumRole: RoleName = "viewer"
): Promise<{ projectId: string; workspaceId: string; role: string }> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: {
        include: {
          organization: {
            include: {
              memberships: {
                where: { userId },
              },
            },
          },
        },
      },
    },
  })

  if (!project) {
    throw new AuthError("Project not found", 404)
  }

  const membership = project.workspace.organization.memberships[0]
  if (!membership) {
    throw new AuthError("Forbidden", 403)
  }

  if (!hasMinimumRole(membership.role, minimumRole)) {
    throw new AuthError("Insufficient permissions", 403)
  }

  return {
    projectId: project.id,
    workspaceId: project.workspaceId,
    role: membership.role,
  }
}
