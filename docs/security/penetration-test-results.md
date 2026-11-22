# Penetration Test & Dynamic Verification Results — MODELVAULT

**Date:** 2026-11-23  
**Engagement type:** Audit-first manual security review + controlled, non-destructive local dynamic verification (`DT-001`..`DT-013`).  
**Target environment:** Isolated local Next.js server (`http://127.0.0.1:3199`) backed by a disposable scratch copy of the SQLite database (`security-audit-test.db`).  
**Application code modified:** **No.**  
**Database / worktree impact:** Zero — temporary database and temporary uploaded workspace directory were deleted automatically in the `finally` block; `prisma/dev.db` was untouched.

---

## 1. Rules of Engagement Compliance

- **Read-only code review first:** All 41 API route handlers, 14 `src/lib/*` modules, `src/proxy.ts`, `prisma/schema.prisma`, `next.config.ts`, and dashboard pages were inspected before dynamic testing.
- **No destructive tests:** No denial-of-service, no zip-bomb exhaustion, no host compromise payload, and no external third-party scanning was performed.
- **Synthetic multi-tenant harness:** Created two synthetic organizations matching Section 5 of the audit specification:
  - **Organization A (`org_synth_a` / workspace `ws_synth_a`):**
    - Owner: `alice.owner@orga.local` (`role: "owner"`)
    - Developer: `bob.dev@orga.local` (`role: "member"`)
    - Viewer: `cara.viewer@orga.local` (`role: "viewer"`)
  - **Organization B (`org_synth_b` / workspace `ws_synth_b`):**
    - Owner: `dave.owner@orgb.local` (`role: "owner"`)
    - Developer: `erin.dev@orgb.local` (`role: "member"`)
- **Zero credential disclosure:** `.env` values and database hashes were never printed or logged in plaintext.

---

## 2. Dynamic Verification Results (`DT-001` .. `DT-013`)

| Test ID | Scenario Tested | Target Endpoint(s) | Related Finding(s) | Observed Result | Security Verdict |
|---|---|---|---|---|---|
| `DT-001` | Send request with no cookie vs. arbitrary invalid cookie `Cookie: mv_session=invalid-arbitrary-token` | `GET /api/subscriptions`, `GET /api/integrations`, `GET /api/projects/proj_fintech_001/files` | `MV-SEC-001`, `MV-SEC-007` | Missing cookie returned `HTTP 307` redirect to `/login`. Invalid cookie passed `src/proxy.ts` and resolved via `getCurrentUserOrDefault()` to `user_demo_001`, returning `HTTP 200` with 8 subscriptions, demo integrations, and project files. | **VULNERABLE (Critical)** |
| `DT-002` | Offline session token forgery using hardcoded fallback secret `"modelvault-dev-secret-change-me"` (active because `.env` sets `NEXTAUTH_SECRET` while `auth.ts` reads `AUTH_SECRET`) | `GET /api/auth/me` | `MV-SEC-008`, `MV-SEC-031` | Forged HMAC-SHA256 token for Organization A Owner (`alice.owner@orga.local`) was accepted with `HTTP 200` on `/api/auth/me`. | **VULNERABLE (High/Critical)** |
| `DT-003` | Session replay after `POST /api/auth/logout` and negative expiration timestamp (`exp`) test | `POST /api/auth/logout`, `GET /api/auth/me` | `MV-SEC-012` | `POST /api/auth/logout` returned `HTTP 200`, but replaying the pre-logout `mv_session` cookie still returned `HTTP 200` with the user profile. Negative `exp` token was properly rejected (`HTTP 401`). | **VULNERABLE (Medium)** |
| `DT-004` | Account enumeration via duplicate registration | `POST /api/auth/register` | `MV-SEC-011` | Registering an existing email (`alice.owner@orga.local`) returned `HTTP 409` with `{"error":"Email is already registered"}`. | **VULNERABLE (Medium)** |
| `DT-005` | Cross-tenant project enumeration and project creation by Organization B Owner into Organization A's `workspaceId` (`ws_synth_a`) | `GET /api/projects?workspaceId=ws_synth_a`, `POST /api/projects` | `MV-SEC-002` | Organization B Owner listed Organization A's confidential project (`proj_synth_a`, `HTTP 200`) and created a new project inside Organization A's workspace `ws_synth_a` (`HTTP 201`). | **VULNERABLE (Critical)** |
| `DT-006` | Cross-tenant ZIP upload into Organization A's `workspaceId` (`ws_synth_a`) + `../traversal.txt` entry check | `POST /api/projects/upload` | `MV-SEC-002`, `MV-SEC-010` | Organization B Owner uploaded a ZIP archive directly into `ws_synth_a` (`HTTP 200`), extracting files and initializing a Git repo on disk. The `../traversal.txt` entry was filtered (`zipSlipEscapedRoot: false`). | **VULNERABLE to Cross-Tenant Upload (Critical); Zip Slip `../` filtered** |
| `DT-007` | Cross-tenant execution listing, direct execution detail read, and real-time SSE stream subscription by Organization B Owner against Organization A's `exec_synth_a` | `GET /api/executions`, `GET /api/executions/exec_synth_a`, `GET /api/executions/exec_synth_a/events` | `MV-SEC-006`, `MV-SEC-023` | All three returned `HTTP 200` to Organization B Owner, exposing Organization A's prompt (`CONFIDENTIAL_PROMPT_ORG_A`), artifacts, and SSE terminal stream payload (`ORG_A_STREAM_DATA`). | **VULNERABLE (High)** |
| `DT-008` | Cross-execution review comment IDOR: Organization B Owner calls `PATCH /api/executions/exec_synth_b/comments` with Organization A's `commentId: "cmt_synth_a1"` | `PATCH /api/executions/[id]/comments` | `MV-SEC-026` | Returned `HTTP 200` and modified Organization A's comment `cmt_synth_a1` (on `exec_synth_a`) to `status: "resolved"`. | **VULNERABLE (High)** |
| `DT-009` | Cross-tenant notification modification and deletion by Organization B Owner against Organization A's `notif_synth_a1` | `PATCH /api/notifications/notif_synth_a1`, `DELETE /api/notifications/notif_synth_a1` | `MV-SEC-005` | Both `PATCH` and `DELETE` succeeded with `HTTP 200` without any ownership verification. | **VULNERABLE (High)** |
| `DT-010` | Unscoped tenant/member directory and password hash leak | `GET /api/organizations` | `MV-SEC-024` | Returned `HTTP 200` with all `8` organizations in the database, `11` member email entries, and `exposesPasswordHashField: true` (every member's bcrypt `passwordHash` serialized in JSON). | **VULNERABLE (Critical)** |
| `DT-011` | Cross-tenant API usage injection & negative-cost ledger manipulation by Organization B Owner against Organization A's `api_synth_a1` | `POST /api/api-usage`, `GET /api/api-accounts/api_synth_a1` | `MV-SEC-025` | Organization B Owner submitted `{"apiAccountId":"api_synth_a1","cost":-9000}` (`HTTP 201`). Organization A's `prepaidBalance` jumped from `500` to `9500` and `totalSpent` dropped from `10` to `-8990`. | **VULNERABLE (High)** |
| `DT-012` | `requireProjectAccess` RBAC verification (Cross-tenant Org B access, Org A Viewer write/approve attempt, and non-existent project ID fallback) | `GET/PUT /api/projects/[id]/files`, `POST /api/executions/[id]/approve` | `MV-SEC-027` | `requireProjectAccess` properly blocked Organization B Owner on `GET /api/projects/proj_synth_a/files` (`HTTP 403`) and blocked Organization A Viewer from `PUT /api/projects/proj_synth_a/files` (`HTTP 403`) and `POST /api/executions/exec_synth_a/approve` (`HTTP 403`). However, requesting `GET /api/projects/nonexistent_id_999/files` with a dummy cookie fell back via `prisma.project.findFirst()` and returned `proj_fintech_001` (`HTTP 200`). | **RBAC works when invoked; fail-open `findFirst()` fallback is VULNERABLE (Medium)** |
| `DT-013` | Path traversal check on workspace file read (`?file=..%2F..%2F..%2Fpackage.json`) | `GET /api/projects/[id]/files` | `MV-SEC-010` | `readWorkspaceFile` / `isSafeRelativePath` rejected the traversal path with `HTTP 404` (`{"error":"Invalid file path"}`). | **PASS (Control effective)** |

---

## 3. Automated Dependency & Git History Checks Executed

| Check | Tool / Method | Result | Evidence |
|---|---|---|---|
| NPM dependency vulnerability audit | `npm audit --json` (npm v11.9.0) | **6 vulnerabilities found** (4 High, 2 Low across 572 total dependencies) | `dompurify <=3.4.16` (5 XSS advisories via `monaco-editor`, Low, fix available); `deepmerge-ts <8.0.0` (High, CWE-674) and `effect <=3.22.0` (High, CWE-1333) via `@prisma/config` -> `prisma 6.19.3` (`MV-SEC-031`) |
| Git history sensitive file & token prefix scan | `git log -S` (`sk-`, `ghp_`, `PRIVATE KEY`) & `git log --all --full-history -- "**/dev.db" "**/.env*"` across 59 commits | No `.env` files or real live API keys committed (`sk-smoke-test-1234` synthetic fixture only); **`prisma/dev.db` was committed in 8 historical commits** | Commits `2977872`, `7f29fac`, `678e8ea`, `9b5cfb1`, `2839175`, `97b3f42`, `5cfe4fd`, `bd09daf` (`MV-SEC-019`) |

---

## 4. Areas Not Dynamically Tested (Scope & Safety Boundaries)

1. **Host command injection / sandbox escape active exploitation (`MV-SEC-003`):** Confirmed conclusively by code inspection (`spawn(command, { cwd, shell: true, env: { ...process.env } })` in `src/lib/preview-manager.ts:41-47`). No shell payload was executed on the workstation host.
2. **Archive bomb / resource exhaustion (`MV-SEC-010`):** Confirmed absence of size/entry/ratio limits in `src/app/api/projects/upload/route.ts`; no decompression bomb was uploaded per non-destructive rules.
3. **Cloud infrastructure, PostgreSQL RLS, Redis/BullMQ, and external OAuth callbacks:** Not deployed in the local workspace (`prisma/schema.prisma` uses SQLite; Redis/BullMQ are not installed in `package.json`; GitHub OAuth credentials are not configured in `.env`).

---

## 5. False Positives & Verified Controls Register

| Control / Hypothesis | Verification Outcome | Notes |
|---|---|---|
| Classic SQL Injection via Prisma queries | **No vulnerability found (Verified safe)** | `rg` across `src/` confirmed zero uses of `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, or raw SQL string concatenation. |
| Path traversal in `readWorkspaceFile` / `writeWorkspaceFile` (`?file=../../...`) | **Control verified effective (`DT-013`)** | `isSafeRelativePath()` in `src/lib/project-workspace.ts:18-23` rejects absolute paths and `..` segments (`HTTP 404`). |
| Cross-tenant access on routes that call `requireProjectAccess` with a valid project ID and a real authenticated non-member user | **Control verified effective (`DT-012`)** | Organization B Owner received `HTTP 403` on `GET /api/projects/proj_synth_a/files`; Organization A Viewer received `HTTP 403` on `PUT /api/projects/proj_synth_a/files` and `POST /api/executions/exec_synth_a/approve`. (However, the control is undermined when callers use an invalid cookie that falls back to `user_demo_001` via `MV-SEC-001`, or when a route falls back to `prisma.project.findFirst()` via `MV-SEC-027`). |
| `dangerouslySetInnerHTML` XSS in `src/app/layout.tsx` | **False positive (Verified safe)** | Only used at `src/app/layout.tsx:50` with a static constant `themeScript` literal containing no user input. |
