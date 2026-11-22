# Tenant Isolation Audit — MODELVAULT

**Date:** 2026-11-23  
**Method:** Complete route-by-route code audit of all 41 API endpoints + Prisma schema analysis + controlled two-tenant dynamic verification (`DT-001`..`DT-013`) using synthetic **Organization A** (`Owner`, `Member`, `Viewer`) and **Organization B** (`Owner`, `Member`).

---

## 1. Multi-Tenant Data Model & Intended Boundaries

In `prisma/schema.prisma`, tenant data is split across two scoping models:
1. **Organization / Workspace hierarchy:**
   - `Organization` -> `Membership` (`userId`, `organizationId`, `role`: `"owner" | "admin" | "member" | "viewer"`)
   - `Organization` -> `Workspace` (`organizationId`)
   - `Workspace` -> `Project` (`workspaceId`) -> `ProjectSource`, `ProjectEnvironment`, `Execution`, `ExecutionTask`, `AgentEvent`, `ExecutionArtifact`, `GitOperation`, `ReviewComment`
   - `WorkflowDefinition` has an optional `workspaceId` (`String?`), currently left `null` on all created workflows.
2. **User-owned financial & credential models:**
   - `User` -> `Subscription` -> `UsageRecord`, `BillingRecord`
   - `User` -> `ApiAccount` -> `ApiUsageRecord`
   - `User` -> `IntegrationCredential`, `Notification`, `SyncLog`

---

## 2. Complete Route-by-Route Authorization & Tenant Isolation Matrix (All 41 Routes)

| Endpoint | Methods | Auth Helper Used | Tenant / Ownership Check | Vulnerability / Status |
|---|---|---|---|---|
| `/api/auth/login` | `POST` | Public | N/A | No rate limit (`MV-SEC-009`) |
| `/api/auth/register` | `POST` | Public | N/A | 409 email enumeration (`MV-SEC-011`), no rate limit (`MV-SEC-009`) |
| `/api/auth/logout` | `POST` | Cookie clear | N/A | Stateless token remains valid after logout (`MV-SEC-012`, `DT-003`) |
| `/api/auth/me` | `GET` | `getCurrentUser()` | Self (`user.id`) | **Good handler pattern**, but accepts tokens forged with default `AUTH_SECRET` (`MV-SEC-008`, `DT-002`) |
| `/api/auth/github` | `GET` | Public | N/A | Missing OAuth `state` & PKCE; requests excessive `repo` scope (`MV-SEC-028`) |
| `/api/auth/github/callback` | `GET` | Public | N/A | Missing `state` verification; links by unverified profile email (`MV-SEC-028`) |
| `/api/organizations` | `GET`, `POST` | **NONE** | **NONE** | **CRITICAL (`MV-SEC-024`, `DT-010`):** `GET` returns all orgs, workspaces, member emails, and bcrypt `passwordHash` values across all tenants; `POST` creates orgs without auth |
| `/api/projects` | `GET`, `POST` | **NONE** | **NONE** (trusts client `workspaceId`, defaults to `ws_core_001`) | **CRITICAL (`MV-SEC-002`, `DT-005`):** Cross-tenant project enumeration & creation in any workspace |
| `/api/projects/upload` | `POST` | **NONE** | **NONE** (trusts client `workspaceId`, defaults to `ws_core_001`) | **CRITICAL (`MV-SEC-002`, `MV-SEC-010`, `DT-006`):** Cross-tenant/unauth ZIP extraction & git init into any workspace |
| `/api/projects/[id]/files` | `GET`, `PUT` | `getCurrentUserOrDefault()` | `requireProjectAccess(project.id, user.id, "viewer"/"member")` | **RBAC works (`DT-012`)**, but `GET` falls back to `prisma.project.findFirst()` on invalid ID and leaks host `workspacePath` (`MV-SEC-027`), plus demo-user fallback (`MV-SEC-001`, `DT-001`) |
| `/api/projects/[id]/preview` | `GET`, `POST`, `DELETE` | `getCurrentUserOrDefault()` | `requireProjectAccess(id, user.id, "viewer"/"member")` | **CRITICAL RCE (`MV-SEC-003`):** `POST` spawns `environment.startCommand` on host with `shell: true` and `process.env` |
| `/api/projects/[id]/preview/proxy` | `GET` | **NONE** | **NONE** | **HIGH (`MV-SEC-004`):** Unauthenticated cross-tenant proxy to `http://localhost:${preview.port}${path}` |
| `/api/executions` | `GET` | Conditional `getCurrentUserOrDefault()` | **NONE when `projectId` is omitted** | **HIGH (`MV-SEC-006`, `DT-007`):** `GET /api/executions` dumps all executions, prompts, tasks, and diff artifacts across all tenants |
| `/api/executions` | `POST` | `getCurrentUserOrDefault()` | `requireProjectAccess(project.id, user.id, "member")` | Demo-user fallback (`MV-SEC-001`); writes `MODELVAULT_EXECUTION.md` and commits on local workspace |
| `/api/executions/[id]` | `GET` | **NONE** | **NONE** | **HIGH (`MV-SEC-023`, `DT-007`):** Direct cross-tenant read of any execution's prompt, tasks, events, artifacts, and git operations |
| `/api/executions/[id]/events` | `GET` | **NONE** | **NONE** | **HIGH (`MV-SEC-023`, `DT-007`):** Direct cross-tenant SSE subscription to any execution's event stream |
| `/api/executions/[id]/approve` | `POST` | `getCurrentUserOrDefault()` | `requireProjectAccess(execution.projectId, user.id, "member")` | RBAC blocks `viewer` (`DT-012`), but lacks commit/diff hash binding and state-machine check (`MV-SEC-030`), plus demo fallback (`MV-SEC-001`) |
| `/api/executions/[id]/comments` | `GET`, `POST`, `PATCH` | `getCurrentUserOrDefault()` | Checks `viewer` on URL `[id]` only | **HIGH (`MV-SEC-026`, `DT-008`):** `PATCH` updates `where: { id: commentId }` without checking `executionId: id` (cross-tenant comment tampering) and allows `viewer` role to mutate/create |
| `/api/git` | `GET`, `POST` | `getCurrentUserOrDefault()` | `requireProjectAccess(project.id, user.id, "viewer"/"member")` | Falls back to `prisma.project.findFirst()` when `projectId` omitted (`MV-SEC-026`); `branchName` lacks `--` in `git checkout` (`MV-SEC-014`); demo fallback (`MV-SEC-001`) |
| `/api/workflows` | `GET`, `POST` | **NONE** | **NONE** (`workspaceId` unused) | **HIGH (`MV-SEC-026`):** Global unscoped workflow read/write across all tenants |
| `/api/workflows/execute` | `POST` | `getCurrentUserOrDefault()` | `requireProjectAccess(project.id, user.id, "member")` | Falls back to `prisma.project.findFirst()` when `projectId` omitted; demo fallback (`MV-SEC-001`) |
| `/api/orchestrator/plan` | `POST` | **NONE** | **NONE** | **HIGH (`MV-SEC-026`):** No auth or project access check; reads arbitrary `projectId` or `findFirst()` |
| `/api/notifications` | `GET`, `POST` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`); unvalidated `actionUrl` scheme (`MV-SEC-029`) |
| `/api/notifications/mark-all-read` | `POST` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/notifications/[id]` | `PATCH`, `DELETE` | **NONE** | **NONE** (`where: { id }`) | **HIGH (`MV-SEC-005`, `DT-009`):** Any caller can modify or delete any user's notification by ID |
| `/api/subscriptions` | `GET`, `POST` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`, `DT-001`); no negative price validation (`MV-SEC-025`) |
| `/api/subscriptions/[id]` | `GET`, `PUT`, `DELETE`, `PATCH` | `getCurrentUserOrDefault()` | Checks `findFirst({ where: { id, userId: user.id } })` | Demo-user fallback (`MV-SEC-001`); no negative price/usage validation (`MV-SEC-025`) |
| `/api/api-accounts` | `GET`, `POST` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/api-accounts/[id]` | `GET`, `PUT`, `DELETE` | `getCurrentUserOrDefault()` | Checks `findFirst({ where: { id, userId: user.id } })` | Demo-user fallback (`MV-SEC-001`); allows arbitrary `prepaidBalance`/`totalSpent` override (`MV-SEC-025`) |
| `/api/api-usage` | `GET` | `getCurrentUserOrDefault()` | Scoped by `apiAccount: { userId: user.id }` | Demo-user fallback (`MV-SEC-001`) |
| `/api/api-usage` | `POST` | `getCurrentUserOrDefault()` | **NONE on `apiAccountId`** | **HIGH (`MV-SEC-025`, `DT-011`):** Cross-tenant usage injection + negative `cost` balance manipulation on any user's `ApiAccount` |
| `/api/api-usage/summary` | `GET` | `getCurrentUserOrDefault()` | Scoped by `apiAccount: { userId: user.id }` | Demo-user fallback (`MV-SEC-001`) |
| `/api/billing` | `GET` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/billing` | `POST` | `getCurrentUserOrDefault()` | Sets `userId: user.id`, **no check on `subscriptionId`** | **MEDIUM/HIGH (`MV-SEC-025`):** Can link billing record to another user's `subscriptionId`, inject negative `amount`, or store unvalidated `invoiceUrl` (`MV-SEC-029`) |
| `/api/billing/summary` | `GET` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/integrations` | `GET`, `POST`, `DELETE` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | **CRITICAL via `MV-SEC-001` (`DT-001`):** Invalid cookie accesses/overwrites/deletes `user_demo_001` encrypted integration keys |
| `/api/dashboard` | `GET` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/analytics` | `GET` | `getCurrentUserOrDefault()` | Scoped by `userId: user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/suggestions` | `GET` | `getCurrentUserOrDefault()` | Scoped by `user.id` | Demo-user fallback (`MV-SEC-001`) |
| `/api/agents`, `/api/models`, `/api/providers`, `/api/exchange-rates`, `/api/health` | `GET` | Public / catalog | Global read-only catalog | Acceptable for public/authenticated catalog data (except `err.message` on `/api/agents`) |

---

## 3. Systemic Multi-Tenant Isolation Failures Confirmed

1. **Identity collapse to `user_demo_001` (`MV-SEC-001`, `MV-SEC-007`, `DT-001`):** 24 API routes call `getCurrentUserOrDefault()`. Any request with an invalid or expired `mv_session` cookie passes `src/proxy.ts` and executes as `user_demo_001` (who is `owner` of `org_acme_001` / `ws_core_001`).
2. **Global tenant and password-hash directory exposure (`MV-SEC-024`, `DT-010`):** `GET /api/organizations` returns every organization, workspace ID, member profile, and bcrypt `passwordHash` across the entire platform.
3. **Unauthenticated / cross-workspace project & ZIP ingestion (`MV-SEC-002`, `DT-005`, `DT-006`):** Any user can list projects in any `workspaceId`, create projects in another organization's workspace, and upload ZIP archives into another organization's workspace.
4. **Cross-tenant execution, diff, comment, notification, and SSE leakage (`MV-SEC-004`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-023`, `MV-SEC-026`, `DT-007`, `DT-008`, `DT-009`):** Organization B can list all Organization A executions, fetch Organization A execution details and code diffs, stream Organization A live SSE events, resolve Organization A review comments, and modify/delete Organization A notifications.
5. **Cross-tenant financial ledger manipulation (`MV-SEC-025`, `DT-011`):** Organization B can post usage records with positive or negative `cost` against Organization A's `apiAccountId`, directly altering Organization A's `prepaidBalance` and `totalSpent`.
6. **User-scoped vs. Organization-scoped data disconnect:** Subscriptions, API accounts, billing records, and integration credentials are scoped by `userId` rather than `organizationId`/`workspaceId`, and have no RBAC distinction between `owner`, `admin`, `member`, and `viewer`.
7. **Absence of Database Row-Level Security (RLS):** The application uses SQLite locally (`prisma/schema.prisma`) with a single privileged connection and has no PostgreSQL RLS migrations or tenant-scoped session variables.

---

## 4. Required Remediation Architecture

1. **Eliminate `getCurrentUserOrDefault()`** and replace with `requireAuthenticatedUser()` returning `401 Unauthorized`.
2. **Create a unified authorization service (`src/lib/permissions.ts`)** providing:
   - `requireOrgAccess(organizationId, userId, minimumRole)`
   - `requireWorkspaceAccess(workspaceId, userId, minimumRole)`
   - `requireProjectAccess(projectId, userId, minimumRole)`
   - `requireExecutionAccess(executionId, userId, minimumRole)`
3. **Scope all queries and mutations by tenant ownership in Prisma `where` clauses** (e.g., `where: { id, userId: user.id }` or `where: { id, executionId }`) and never return `User` records without an explicit `select` that excludes `passwordHash`.
