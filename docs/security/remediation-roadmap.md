# Remediation Roadmap & Patch Blueprints — MODELVAULT

**Date:** 2026-11-23  
**Scope:** Complete prioritized remediation plan for findings `MV-SEC-001` through `MV-SEC-031`.  
**Audit Phase Rule:** Per Section 2 & Section 22 (Phase 7), **no application code has been modified during the audit**. This document provides concrete patch blueprints and architectural remediation steps awaiting explicit engineering authorization.

---

## 1. Phase 0 — Immediate Release Blockers (P0: Must Fix Before Any Public or Multi-Tenant Deployment)

| Priority | Finding ID(s) | Summary | Target Files | Verification Test |
|---|---|---|---|---|
| **P0-1** | `MV-SEC-001`, `MV-SEC-007` | Remove `getCurrentUserOrDefault()` from all API routes; introduce `requireAuthenticatedUser()` returning `401`; verify session HMAC signature & expiry in `src/proxy.ts`. | `src/lib/auth.ts`, `src/proxy.ts`, 24 `src/app/api/**/route.ts` files | `DT-001` retest: `Cookie: mv_session=invalid` returns `401` on all protected APIs |
| **P0-2** | `MV-SEC-008`, `MV-SEC-031` | Remove hardcoded fallback secrets (`"modelvault-dev-secret-change-me"`, `"modelvault-local-development-secret"`); fail closed if `AUTH_SECRET` or `INTEGRATIONS_ENCRYPTION_KEY` is unset; align `.env` key names. | `src/lib/auth.ts`, `src/lib/crypto.ts`, `.env` | `DT-002` retest: token signed with default dev secret returns `401` |
| **P0-3** | `MV-SEC-024` | Require authentication on `GET/POST /api/organizations`; filter organizations by `memberships: { some: { userId: user.id } }`; replace `include: { user: true }` with `select: { id: true, name: true, email: true, image: true }` so `passwordHash` is never returned. | `src/app/api/organizations/route.ts` | `DT-010` retest: Org B sees only Org B; `passwordHash` absent from response |
| **P0-4** | `MV-SEC-002`, `MV-SEC-027` | Require authentication and `requireWorkspaceAccess(workspaceId, user.id, "viewer"/"member")` on `GET/POST /api/projects` and `POST /api/projects/upload`; remove `prisma.project.findFirst()` fallback and `workspacePath` disclosure in `GET /api/projects/[id]/files`. | `src/lib/permissions.ts`, `src/app/api/projects/route.ts`, `src/app/api/projects/upload/route.ts`, `src/app/api/projects/[id]/files/route.ts` | `DT-005`, `DT-006`, `DT-012` retests: cross-workspace project list/create/upload returns `403`; unknown project ID returns `404` |
| **P0-5** | `MV-SEC-003`, `MV-SEC-004`, `MV-SEC-029` | Disable host `spawn(command, { shell: true, env: process.env })` in multi-tenant deployments; enforce `requireProjectAccess(id, user.id, "viewer")` and path normalization on `GET /api/projects/[id]/preview/proxy`; add `sandbox="allow-scripts allow-forms"` to preview `<iframe>`. | `src/lib/preview-manager.ts`, `src/app/api/projects/[id]/preview/proxy/route.ts`, `src/app/(dashboard)/studio/page.tsx` | Unauthenticated/cross-tenant preview proxy returns `401`/`403`; arbitrary `startCommand` shell metacharacters rejected |
| **P0-6** | `MV-SEC-006`, `MV-SEC-023`, `MV-SEC-026` | Require authentication and tenant/project membership scoping on `GET /api/executions`, `GET /api/executions/[id]`, `GET /api/executions/[id]/events`, `GET/POST /api/workflows`, and `POST /api/orchestrator/plan`; scope `PATCH /api/executions/[id]/comments` by `{ id: commentId, executionId: id }` with `"member"` role. | `src/app/api/executions/route.ts`, `src/app/api/executions/[id]/route.ts`, `src/app/api/executions/[id]/events/route.ts`, `src/app/api/executions/[id]/comments/route.ts`, `src/app/api/workflows/route.ts`, `src/app/api/orchestrator/plan/route.ts` | `DT-007`, `DT-008` retests: Org B receives `403`/`404` on Org A executions, SSE streams, and review comments |
| **P0-7** | `MV-SEC-005`, `MV-SEC-025` | Enforce ownership (`userId: user.id`) on `PATCH/DELETE /api/notifications/[id]`, `POST /api/api-usage` (`apiAccountId`), and `POST /api/billing` (`subscriptionId`); enforce non-negative finite number validation on `cost`, `amount`, `price`, and usage counters. | `src/app/api/notifications/[id]/route.ts`, `src/app/api/api-usage/route.ts`, `src/app/api/billing/route.ts`, `src/app/api/subscriptions/[id]/route.ts`, `src/app/api/api-accounts/[id]/route.ts` | `DT-009`, `DT-011` retests: cross-user notification/apiAccount IDs return `404`; negative `cost` returns `422` |

---

## 2. Phase 1 — High-Priority Hardening (P1: Before Beta / External Customer Onboarding)

| Priority | Finding ID(s) | Action | Target Files |
|---|---|---|---|
| **P1-1** | `MV-SEC-028` | Add cryptographic OAuth `state` cookie + PKCE to GitHub OAuth; reduce sign-in scope to `"read:user user:email"`; only accept verified primary emails from `/user/emails`. | `src/app/api/auth/github/route.ts`, `src/app/api/auth/github/callback/route.ts` |
| **P1-2** | `MV-SEC-012`, `MV-SEC-029` | Persist hashed session tokens in Prisma `Session` table; revoke server-side on `POST /api/auth/logout` and password changes; check `sigBuf.length === expBuf.length` before `crypto.timingSafeEqual`. | `src/lib/auth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts` |
| **P1-3** | `MV-SEC-009`, `MV-SEC-011` | Add IP + account rate limiting on `/api/auth/login` and `/api/auth/register`; add `Origin` / `Sec-Fetch-Site` CSRF validation middleware for state-changing requests; remove pre-filled demo credentials from `src/app/login/page.tsx`. | `src/proxy.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/login/page.tsx` |
| **P1-4** | `MV-SEC-010` | Enforce ZIP upload limits (`MAX_ZIP_BYTES = 25MB`, `MAX_FILES = 500`, `MAX_UNCOMPRESSED_BYTES = 100MB`, `MAX_RATIO = 50`), reject symlinks (`unixPermissions`), and write binary files as raw `Buffer` instead of base64 UTF-8 strings. | `src/app/api/projects/upload/route.ts`, `src/lib/project-workspace.ts` |
| **P1-5** | `MV-SEC-014`, `MV-SEC-030` | Validate Git branch names (`/^[A-Za-z0-9._\/-]+$/`, no leading `-`), pass `-c core.hooksPath=/dev/null -c protocol.file.allow=never` to `git`, run server-side verification scans, and bind `POST /api/executions/[id]/approve` to `(commitSha, diffSha256)` in `"awaiting_approval"` state. | `src/lib/project-workspace.ts`, `src/app/api/git/route.ts`, `src/app/api/executions/[id]/approve/route.ts` |
| **P1-6** | `MV-SEC-031` | Upgrade/override `dompurify` (`>=3.4.17`) to fix the 5 `monaco-editor` DOM XSS advisories, remove unused `jsonwebtoken`, and schedule `prisma` `7.10.1+` upgrade testing. | `package.json`, `package-lock.json` |

---

## 3. Proposed Code Patch Blueprints (Ready for Authorized Implementation)

### 3.1 `src/lib/auth.ts` & `src/lib/permissions.ts`
```ts
// 1. Fail closed when AUTH_SECRET is missing in production and fix timingSafeEqual length check:
function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret === "modelvault-dev-secret-change-me") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: AUTH_SECRET environment variable must be set in production")
    }
    return "modelvault-dev-secret-change-me"
  }
  return secret
}

export async function verifySession(token: string): Promise<string | null> {
  const [encodedPayload, signature] = token.split(".")
  if (!encodedPayload || !signature) return null
  const expected = crypto.createHmac("sha256", getJwtSecret()).update(encodedPayload).digest("base64url")
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }
  // ... verify exp and active Session record in database
}

// 2. Replace getCurrentUserOrDefault() with requireAuthenticatedUser():
export async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new AuthError("Unauthorized", 401)
  }
  return user
}
```

### 3.2 `src/app/api/organizations/route.ts` (`MV-SEC-024`)
```ts
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const orgs = await prisma.organization.findMany({
    where: { memberships: { some: { userId: user.id } } },
    include: {
      workspaces: true,
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }, // NEVER select passwordHash
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json({ data: orgs })
}
```

### 3.3 `src/app/api/api-usage/route.ts` (`MV-SEC-025`)
```ts
// Verify ownership of apiAccountId and enforce non-negative numbers:
const account = await prisma.apiAccount.findFirst({
  where: { id: apiAccountId, userId: user.id },
})
if (!account) {
  return NextResponse.json({ data: null, error: "API account not found" }, { status: 404 })
}
if ((cost !== undefined && (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0)) ||
    (inputTokens !== undefined && inputTokens < 0) ||
    (outputTokens !== undefined && outputTokens < 0)) {
  return NextResponse.json({ data: null, error: "Usage and cost values must be non-negative" }, { status: 422 })
}
```
