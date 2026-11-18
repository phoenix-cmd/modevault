import { prisma } from "@/lib/db"

const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
}

export async function requireProjectAccess(
  projectId: string,
  userId: string,
  minimumRole: "viewer" | "member" | "admin" | "owner" = "viewer"
): Promise<{ projectId: string; role: string }> {
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
    throw new Error("Project not found")
  }

  const membership = project.workspace.organization.memberships[0]
  if (!membership) {
    throw new Error("Forbidden")
  }

  if ((ROLE_RANK[membership.role] ?? -1) < ROLE_RANK[minimumRole]) {
    throw new Error("Insufficient permissions")
  }

  return { projectId: project.id, role: membership.role }
}
