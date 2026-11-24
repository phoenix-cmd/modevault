import { NextRequest, NextResponse } from "next/server"
import { z, type ZodType } from "zod"
import { logger, errorContext } from "@/lib/logger"

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function getClientKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp.trim()
  return "127.0.0.1"
}

export function checkRateLimit(
  key: string,
  maxRequests = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt <= now) rateLimitStore.delete(k)
    }
  }
  const current = rateLimitStore.get(key)
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, retryAfterSec: Math.ceil(windowMs / 1000) }
  }
  current.count += 1
  const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000))
  if (current.count > maxRequests) {
    return { allowed: false, remaining: 0, retryAfterSec }
  }
  return { allowed: true, remaining: maxRequests - current.count, retryAfterSec }
}

export function isSafeHttpOrRelativeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" || parsed.protocol === "http:"
  } catch {
    return false
  }
}

export const safeUrlSchema = z
  .string()
  .max(2048)
  .refine(isSafeHttpOrRelativeUrl, { message: "URL must use https://, http://, or a safe relative path (/...)" })

const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin123",
  "iloveyou",
])

export const idSchema = z.string().min(1).max(128)
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const passwordSchema = z
  .string()
  .min(8)
  .max(200)
  .refine((val) => !COMMON_WEAK_PASSWORDS.has(val.toLowerCase()), {
    message: "Password is too common; choose a stronger passphrase",
  })

export const gitBranchNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]*$/, "Invalid Git branch name")
  .refine(
    (name) =>
      !name.includes("..") &&
      !name.endsWith("/") &&
      !name.endsWith(".lock") &&
      !name.includes("//") &&
      !name.includes("@{"),
    "Invalid Git branch reference format"
  )

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

export const executionCreateSchema = z.object({
  projectId: idSchema,
  agentSlug: z.string().max(128).optional(),
  agentId: z.string().max(128).optional(),
  prompt: z.string().trim().min(1).max(20000),
  targetBranch: gitBranchNameSchema.optional(),
  title: z.string().max(300).optional(),
})

export const workflowExecuteSchema = z.object({
  workflowId: z.string().max(128).optional(),
  workflowName: z.string().max(200).optional(),
  projectId: idSchema.optional(),
  customPrompt: z.string().max(20000).optional(),
  nodes: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
  edges: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
})

export const approvalSchema = z.object({
  action: z.enum(["approve", "reject", "request_revision"]),
  feedback: z.string().max(5000).optional(),
  expectedCommitSha: z.string().max(120).optional(),
  expectedDiffHash: z.string().max(128).optional(),
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
  branchName: gitBranchNameSchema.optional(),
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
