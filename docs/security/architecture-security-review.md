# Architecture Security Review — MODELVAULT

**Date:** 2026-11-23  
**Method:** Read-only repository/config/code review. No live infrastructure inspection.

## 1. Observed Architecture

### Frontend / App
- **Framework:** Next.js 16.4.6, React 19.4.6, TypeScript, Tailwind 4, shadcn/Radix/Lucide/Motion/Recharts/TanStack/Monaco/React Flow (`package.json`).
- **Routing:** App Router under `src/app`, authenticated dashboard group `(dashboard)`, public routes `/`, `/login`, `/register`.
- **Request gate:** `src/proxy.ts` checks for presence of `mv_session` cookie and redirects non-public paths to `/login`; matcher excludes static/image/favicon.

### Backend/API
- **API routes:** Next.js route handlers under `src/app/api/**` (43 route files found).
- **Auth:** Custom HMAC-signed cookie token (`mv_session`) in `src/lib/auth.ts`; bcrypt password hashing in login/register.
- **DB access:** Prisma singleton in `src/lib/db.ts`; schema in `prisma/schema.prisma`.
- **Validation:** Zod schemas in `src/lib/validation.ts`; used by some routes but not consistently.
- **Permissions:** `requireProjectAccess` in `src/lib/permissions.ts` checks project->workspace->organization membership role rank.

### Data
- **Schema:** SQLite datasource in `prisma/schema.prisma`; models for User, Account, Session, VerificationToken, Organization, Membership, Workspace, Project, ProjectSource, RuntimeEnvironment, Execution, ExecutionTask, Artifact, ExecutionEvent, Workflow, AgentProfile, GitOperation, IntegrationCredential, ApiAccount, Subscription, BillingRecord, ApiUsageRecord, Notification, SyncLog, Provider, Plan, ExchangeRate.
- **Dev DB:** `prisma/dev.db` present (modified in worktree; not committed).
- **DB resolver:** `src/lib/db.ts` defaults to local `prisma/dev.db`, copies to `/tmp/dev.db` on Vercel.

### Execution/Workspace
- **Workspace files:** `src/lib/project-workspace.ts` stores project workspaces under `data/projects/<projectId>`, uses `execFile("git", ...)`.
- **Preview:** `src/lib/preview-manager.ts` spawns local process with `shell: true` and inherited env.
- **Execution simulation:** `src/app/api/executions/route.ts` and `workflows/execute/route.ts` create synthetic tasks/events/artifacts/costs; some real git/file mutations occur.

## 2. Security-Relevant Observations

### Positive
- Prisma ORM used broadly, reducing classic SQL injection risk in normal query paths.
- `crypto.timingSafeEqual` used for session HMAC comparison (`src/lib/auth.ts`).
- AES-256-GCM used for integration secret encryption (`src/lib/crypto.ts`).
- `isSafeRelativePath` checks in workspace file operations; `path.normalize` and `..` rejection.
- Some routes use Zod validation and `requireProjectAccess`.
- Passwords hashed with bcrypt (`bcryptjs`, cost 10 observed).

### Concerns
- **Auth boundary inconsistency:** many routes use `getCurrentUserOrDefault()` demo fallback; proxy only checks cookie presence.
- **Authorization gaps:** several endpoints missing authn/authz/ownership checks (projects, upload, notifications id, executions list unscoped, preview proxy).
- **Host command execution:** preview spawns shell commands on host with inherited env.
- **No sandbox/IaC evidence:** no Docker/K8s/seccomp/egress policy config in repo.
- **SQLite/dev fallback in production path:** conflicts with stated Postgres multi-tenant architecture.
- **No CSRF/rate limiting/security headers visible.**
- **Simulation + real mutation blend:** audit/provenance ambiguity.

## 3. Component Review

| Component | Evidence | Security posture | Key gaps |
|---|---|---|---|
| Auth/session | `src/lib/auth.ts`, `auth/*` | Weak-Medium | Hardcoded secret fallback, 7d stateless token, no revocation/rotation, demo fallback, no rate limit/lockout |
| Request gate | `src/proxy.ts` | Weak | Cookie presence only, no token verification, no CSRF/origin enforcement |
| Authorization | `src/lib/permissions.ts`, route usage | Mixed | Good helper exists but inconsistent adoption; no workspace-level helper; IDOR gaps |
| Project upload/import | `projects/upload/route.ts` | Weak | No authz, no archive limits, writes to filesystem, git init, binary handling issues |
| File/workspace access | `project-workspace.ts`, `projects/[id]/files` | Medium | Path checks exist; needs stronger containment, symlink/device checks, quotas, audit |
| Git ops | `git/route.ts`, `project-workspace.ts` | Weak-Medium | Uses execFile (good), but host git, no hooks/protocol hardening, fake revert/PR artifacts |
| Preview/sandbox | `preview-manager.ts`, preview routes | Critical risk | Host shell spawn, env inheritance, unauth proxy, in-memory global state |
| Executions/orchestration | `executions/*`, `workflows/execute`, `orchestrator/plan` | Weak | Unscoped list, simulated artifacts, budget/policy enforcement unclear |
| Integrations/secrets | `integrations/route.ts`, `crypto.ts` | Medium | AES-GCM good; fallback key, no KMS/rotation/audit, authz relies on demo fallback pattern |
| Notifications | `notifications/*` | Weak | `[id]` lacks auth/ownership; create/list use demo fallback |
| Billing/subscriptions/usage | billing/subscriptions/api-usage routes | Unknown-Medium | Auth fallback reliance; validation and webhook controls not fully reviewed |
| Database | `db.ts`, schema | Weak for prod claims | SQLite fallback, no RLS evidence, no migration/backup/role hardening evidence |
| Logging/monitoring | `logger.ts` | Medium-Low | Structured logs but no redaction policy, error details leak |
| Supply chain/CI | `package.json`, no workflows | Weak | No visible security CI gates/scanners/SBOM/signing |

## 4. Data Flow Risks

1. **Upload -> filesystem -> git init -> preview/agent execution**: untrusted input crosses into execution-sensitive zone with insufficient isolation.
2. **Cookie -> proxy presence check -> route fallback user**: broken auth chain can grant unintended access.
3. **DB environment.startCommand -> spawn(shell:true)**: stored command becomes host execution.
4. **Project workspace -> git commands -> remote push/pull**: repo content and git config may influence operations; credential handling not fully visible.
5. **Integration secrets -> encrypted DB storage -> future runtime injection**: encryption exists, but key management/least privilege/runtime exposure need verification.

## 5. Architecture Recommendations

- **Deny-by-default authz middleware**: verify session signature/expiry and enforce route-level authorization; remove demo fallback from prod handlers.
- **Tenant isolation service layer**: centralize `requireOrgAccess`, `requireWorkspaceAccess`, `requireProjectAccess`, `requireResourceOwnership` and use in every route.
- **Isolate execution**: move preview/agent/git execution to disposable sandbox VMs/containers with no host env inheritance, restricted FS, egress allowlist, metadata IP blocking, resource quotas.
- **Secure upload pipeline**: pre-auth, scan, quarantine, extract in sandbox, enforce limits, store in object storage with tenant prefix.
- **Secrets/KMS**: use managed KMS, per-tenant encryption keys/envelopes, short-lived credentials, secret redaction.
- **Production data architecture**: PostgreSQL with least-privilege roles; consider RLS as defense-in-depth after app-layer checks.
- **Security observability**: audit logs for authz decisions, admin actions, secret access, sandbox start/stop, git push/pull, approvals.
- **CI/CD gates**: SAST, SCA, secrets, IaC, container scan, SBOM, provenance, DAST on staging.

## 6. Release Blockers (Architecture)

- Demo-user auth fallback and cookie-presence gate.
- Missing authz on critical endpoints.
- Host command execution model for previews.
- No evidenced sandbox isolation for untrusted code execution.
- No verified security CI/scanner/release gate process.
