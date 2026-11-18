import { NextRequest, NextResponse } from "next/server"
import { z, type ZodType } from "zod"
import { logger, errorContext } from "@/lib/logger"

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function parseJson<T>(
  req: NextRequest,
  schema: ZodType<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return { response: jsonError("Invalid JSON body", 400) }
  }

  const result = schema.safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    return {
      response: jsonError(
        issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid request body",
        422
      ),
    }
  }
  return { data: result.data }
}

export function logApiError(route: string, err: unknown) {
  logger.error("API route failed", { route, ...errorContext(err) })
}

export const idSchema = z.string().min(1).max(128)
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const passwordSchema = z.string().min(8).max(200)

export const executionCreateSchema = z.object({
  projectId: idSchema.optional(),
  agentSlug: z.string().max(128).optional(),
  agentId: z.string().max(128).optional(),
  prompt: z.string().trim().min(1).max(20000),
  targetBranch: z.string().max(200).optional(),
  title: z.string().max(300).optional(),
})

export const workflowExecuteSchema = z.object({
  workflowId: z.string().max(128).optional(),
  projectId: idSchema.optional(),
  customPrompt: z.string().max(20000).optional(),
})

export const approvalSchema = z.object({
  action: z.enum(["approve", "reject", "request_revision"]),
  feedback: z.string().max(5000).optional(),
})

export const commentCreateSchema = z.object({
  filePath: z.string().min(1).max(1024),
  lineNumber: z.coerce.number().int().nonnegative(),
  comment: z.string().trim().min(1).max(5000),
  authorName: z.string().max(120).optional(),
})

export const commentPatchSchema = z.object({
  commentId: z.string().min(1).max(128),
  status: z.enum(["open", "resolved"]).optional(),
})

export const gitActionSchema = z.object({
  action: z.enum([
    "commit",
    "revert",
    "pr",
    "stage",
    "unstage",
    "discard",
    "branch",
    "checkout",
    "push",
    "pull",
    "fetch",
  ]),
  projectId: idSchema.optional(),
  branchName: z.string().max(200).optional(),
  commitMessage: z.string().max(2000).optional(),
  commitSha: z.string().max(120).optional(),
  prTitle: z.string().max(300).optional(),
  prBody: z.string().max(10000).optional(),
  files: z.array(z.string().max(1024)).max(500).optional(),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
})
