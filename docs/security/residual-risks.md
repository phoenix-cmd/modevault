# Residual Risks & Coverage Gaps — MODELVAULT

**Date:** 2026-11-23  
**Status:** All 31 findings (`MV-SEC-001`..`MV-SEC-031`) remain **Open** (read-only audit phase; zero application code modified).

---

## 1. Open Residual Risk Summary

| Risk Area | Related Findings | Severity | Current State | Required Action Before Launch |
|---|---|---|---|---|
| **Authentication Bypass & Token Forgery** | `MV-SEC-001`, `MV-SEC-007`, `MV-SEC-008`, `MV-SEC-031` | **Critical** | Dynamically confirmed (`DT-001`, `DT-002`): any invalid cookie resolves to `user_demo_001` on 24 routes, and `.env` `NEXTAUTH_SECRET` mismatch leaves hardcoded `"modelvault-dev-secret-change-me"` active. | Remove `getCurrentUserOrDefault()`, verify sessions in `src/proxy.ts`, fail closed without strong `AUTH_SECRET` / `INTEGRATIONS_ENCRYPTION_KEY`. |
| **Cross-Tenant Data & Password Hash Exposure** | `MV-SEC-024`, `MV-SEC-002`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-023`, `MV-SEC-025`, `MV-SEC-026`, `MV-SEC-027` | **Critical / High** | Dynamically confirmed (`DT-005`..`DT-011`): cross-tenant leakage of `User.passwordHash`, projects, ZIP uploads, executions, diffs, live SSE streams, and cross-tenant corruption of review comments, notifications, and `ApiAccount` balances. | Implement `requireOrgAccess`, `requireWorkspaceAccess`, `requireProjectAccess`, and strict `userId` ownership checks across all 41 routes. |
| **Host Remote Code Execution via Preview Manager** | `MV-SEC-003`, `MV-SEC-004`, `MV-SEC-014`, `MV-SEC-021`, `MV-SEC-029` | **Critical** | Confirmed in source (`src/lib/preview-manager.ts:41-47`): `spawn(command, { cwd, shell: true, env: { ...process.env } })` runs on the host and `/api/projects/[id]/preview/proxy` has no auth. | Disable host preview spawning in multi-tenant environments; isolate execution in ephemeral microVMs/containers with no host env inheritance; authenticate and sandbox preview proxy/iframe. |
| **OAuth, Session Lifecycle, Rate Limiting & CSRF** | `MV-SEC-009`, `MV-SEC-011`, `MV-SEC-012`, `MV-SEC-028` | **High / Medium** | Confirmed in source & `DT-003`/`DT-004`: stateless token works after logout, GitHub OAuth lacks `state`/PKCE, no rate limiting or CSRF `Origin` checks. | Add OAuth `state` + PKCE, DB-backed session revocation, IP/account throttling, and CSRF `Origin` verification. |
| **Verification Engine & Approval Non-Repudiation** | `MV-SEC-020`, `MV-SEC-030` | **Medium** | Confirmed in source: `/verify` runs 5 regexes in browser JS only; `POST /api/executions/[id]/approve` does not check `status === "awaiting_approval"` or bind to a commit/diff hash. | Run verification scans server-side and bind approvals cryptographically to `(executionId, commitSha, diffSha256)`. |
| **Dependency & Database Architecture Hygiene** | `MV-SEC-018`, `MV-SEC-019`, `MV-SEC-022`, `MV-SEC-031` | **Medium / Low** | Confirmed via `npm audit --json` (6 advisories: `dompurify` in `monaco-editor`, `deepmerge-ts`/`effect` in `prisma`) and Git history (`prisma/dev.db` committed in 8 commits). | Patch `dompurify`, evaluate Prisma upgrade, purge `prisma/dev.db` from Git history, migrate production to managed PostgreSQL, and enforce CI security gates. |

---

## 2. Assessment Coverage Gaps & External Dependencies Not Present in Repo

Consistent with Section 25 ("Never claim a test passed if it was not executed"), the following architectural components mentioned in the product description were **not present in the repository** and therefore could not be verified dynamically:

| Component / Area | Observed Repository Reality | Coverage Status |
|---|---|---|
| **Cloud Sandbox Infrastructure (MicroVMs / Containers / seccomp / egress firewall)** | No Dockerfile, Kubernetes manifest, Firecracker/gVisor config, or cloud sandbox SDK exists in the repo; `src/lib/preview-manager.ts` spawns local child processes on the host. | **Assessed in code (`MV-SEC-003`, `MV-SEC-021`); cloud runtime not deployed** |
| **External Coding Agent Adapters (Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Continue, Aider)** | `AgentDefinition` rows exist in SQLite, but `POST /api/executions` and `POST /api/workflows/execute` synthesize deterministic/random events and write `MODELVAULT_EXECUTION.md` locally rather than invoking real external agent CLIs or LLM APIs. | **Assessed in code (`MV-SEC-020`); real LLM/agent adapters not implemented** |
| **PostgreSQL Row-Level Security (RLS) & Database Roles** | `prisma/schema.prisma` uses `provider = "sqlite"`; `scripts/prisma-schema.mjs` only string-replaces `"sqlite"` with `"postgresql"` and generates no RLS policies or least-privilege roles. | **Assessed in code (`MV-SEC-019`); no PostgreSQL instance or RLS policies present** |
| **Redis & BullMQ Job Queues / WebSockets** | Neither `redis` nor `bullmq` nor `ws`/`socket.io` is listed in `package.json`; real-time streaming uses a single Next.js `ReadableStream` SSE endpoint (`GET /api/executions/[id]/events`). | **SSE endpoint audited & dynamically tested (`MV-SEC-023`, `DT-007`); Redis/BullMQ/WS not present** |
| **Billing Webhooks (Stripe / Payment Processor)** | No webhook endpoints exist under `src/app/api/**`; billing and usage records are created directly via `POST /api/billing` and `POST /api/api-usage`. | **Direct billing/usage APIs audited & dynamically tested (`MV-SEC-025`, `DT-011`); no webhook routes present** |

---

## 3. Release Gate Decision (Section 24 Evaluation)

Per Section 24, MODELVAULT **fails 7 of the 8 mandatory release gate criteria**:

1. **Confirmed critical vulnerabilities remain unresolved:** **FAIL** (`MV-SEC-001`, `MV-SEC-002`, `MV-SEC-003`, `MV-SEC-024`).
2. **Confirmed high-risk tenant isolation vulnerabilities remain unresolved:** **FAIL** (`MV-SEC-002`, `MV-SEC-004`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-023`, `MV-SEC-024`, `MV-SEC-025`, `MV-SEC-026`).
3. **Unrestricted code execution can reach the host or other tenants:** **FAIL** (`MV-SEC-003` host `spawn` with `shell: true` and `process.env`).
4. **API credentials are accessible to unauthorized users:** **FAIL** (`MV-SEC-001` allows any invalid cookie to read/overwrite/delete `user_demo_001` integrations; `MV-SEC-003` inherits host `process.env`; `MV-SEC-008` uses hardcoded `INTEGRATIONS_ENCRYPTION_KEY` fallback).
5. **Authentication can be bypassed:** **FAIL** (`MV-SEC-001` + `MV-SEC-007` invalid cookie fallback; `MV-SEC-008` + `MV-SEC-024` offline token forgery for any user ID).
6. **Sensitive execution logs are exposed across organizations:** **FAIL** (`MV-SEC-006` + `MV-SEC-023` verified in `DT-007`).
7. **Production preview environments can be accessed without authorization:** **FAIL** (`MV-SEC-004` unauthenticated `/api/projects/[id]/preview/proxy`).
8. **Critical security checks are missing from the release process:** **FAIL** (`MV-SEC-018`, `MV-SEC-022`).

**Final Release Recommendation:** **NO-GO.**
