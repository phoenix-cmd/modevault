# MODELVAULT Security Audit & Vulnerability Assessment

**Assessment date:** 2026-11-23  
**Assessor:** Principal Application Security Engineer / Cloud Security Architect / Senior Penetration Tester / DevSecOps Specialist  
**Target:** MODELVAULT repository at `c:\Users\bs162\Desktop\modevault`  
**Engagement type:** Audit-first, evidence-based manual code review (all 41 API route handlers, 14 `src/lib/*` modules, `src/proxy.ts`, `prisma/schema.prisma`, `next.config.ts`, UI sinks), `npm audit --json` dependency analysis, Git history secret/database scan, and 13 controlled non-destructive dynamic verification tests (`DT-001`..`DT-013`) against an isolated temporary SQLite database copy.  
**Application code modified:** **No.** (`prisma/dev.db` and application source files were left untouched.)

---

## 1. Executive Summary

**Overall Security Posture: CRITICAL RISK — NO-GO FOR PUBLIC MULTI-TENANT PRODUCTION LAUNCH.**

While MODELVAULT implements several positive baseline patterns—including parameterized Prisma ORM queries (no raw SQL injection sinks), `crypto.timingSafeEqual` in HMAC verification, AES-256-GCM encryption in `src/lib/crypto.ts`, relative-path traversal validation in `src/lib/project-workspace.ts` (`DT-013`), and role-rank verification in `requireProjectAccess()` (`DT-012`)—our audit uncovered **31 security findings (4 Critical, 10 High, 8 Medium, 5 Low, 4 Informational)**, of which **12 attack paths were dynamically reproduced** in an isolated multi-tenant test harness (`DT-001`..`DT-012`).

### Severity Breakdown

| Severity | Count | Finding IDs | Key Themes |
|---|---:|---|---|
| **Critical** | **4** | `MV-SEC-001`, `MV-SEC-002`, `MV-SEC-003`, `MV-SEC-024` | Demo-user authentication bypass (`user_demo_001` fallback), unauthenticated/cross-tenant project & ZIP upload ingestion, host shell RCE via `preview-manager.ts`, and full cross-tenant user directory + bcrypt `passwordHash` disclosure on `GET /api/organizations` |
| **High** | **10** | `MV-SEC-004`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-007`, `MV-SEC-008`, `MV-SEC-009`, `MV-SEC-023`, `MV-SEC-025`, `MV-SEC-026`, `MV-SEC-028` | Offline session token forgery via hardcoded `AUTH_SECRET` (active due to `.env` `NEXTAUTH_SECRET` mismatch), unauthenticated preview proxy, cross-tenant execution/diff/SSE stream disclosure, cross-tenant `ApiAccount` balance corruption via negative `cost`, cross-execution comment IDOR, notification BOLA, GitHub OAuth missing `state`/PKCE, and missing rate-limiting/CSRF |
| **Medium** | **8** | `MV-SEC-010`, `MV-SEC-011`, `MV-SEC-012`, `MV-SEC-013`, `MV-SEC-014`, `MV-SEC-027`, `MV-SEC-030`, `MV-SEC-031` | ZIP upload lack of size/count/ratio limits & binary corruption, 409 email enumeration & pre-filled login creds, stateless session replay after logout, Git option/hook hardening gaps, silent `findFirst()` project fallback & host path leak, client-only `/verify` regex scanning & unbound approvals, and 6 `npm audit` dependency vulnerabilities (`dompurify` in `monaco-editor`, `deepmerge-ts`/`effect` in `prisma`) |
| **Low** | **5** | `MV-SEC-015`, `MV-SEC-016`, `MV-SEC-017`, `MV-SEC-018`, `MV-SEC-029` | Missing CSP/security headers, raw `err.message` leaks, missing Zod schemas on 15+ routes, missing CI security gates, `verifySession` buffer-length `RangeError`, un-sandboxed same-origin preview `<iframe>`, and unvalidated `actionUrl`/`invoiceUrl` schemes |
| **Informational** | **4** | `MV-SEC-019`, `MV-SEC-020`, `MV-SEC-021`, `MV-SEC-022` | SQLite `/tmp/dev.db` Vercel fallback & `prisma/dev.db` committed in 8 Git commits, synthetic vs. real execution artifact mixing, absence of container/microVM sandbox infrastructure in repo, and CI/staging assurance gaps |
| **Total** | **31** | `MV-SEC-001` .. `MV-SEC-031` | — |

---

## 2. Main Confirmed Attack Paths

1. **Complete Account Takeover of Any Tenant User (`MV-SEC-024` + `MV-SEC-008` + `MV-SEC-031`, verified in `DT-010` & `DT-002`):**
   - Attacker sends `GET /api/organizations` with `Cookie: mv_session=1` -> receives every organization, workspace ID, member user ID, email, and bcrypt `passwordHash` (`DT-010`).
   - Because `.env` defines `NEXTAUTH_SECRET` while `src/lib/auth.ts` reads `process.env.AUTH_SECRET`, the server uses the fallback key `"modelvault-dev-secret-change-me"`. Attacker signs a valid `mv_session` cookie offline for any dumped `user.id` and takes over that account (`DT-002`).
2. **Zero-Knowledge Demo-Owner Authentication Bypass (`MV-SEC-007` + `MV-SEC-001`, verified in `DT-001`):**
   - Even without forging a token, sending `Cookie: mv_session=invalid` passes `src/proxy.ts` and causes all 24 routes using `getCurrentUserOrDefault()` to execute as `user_demo_001` (`owner` of `org_acme_001` / `ws_core_001`), granting full access to subscriptions, billing, API accounts, encrypted integration credentials, and `ws_core_001` project files/previews.
3. **Cross-Tenant Source Code, Prompt, Diff & Live SSE Exfiltration (`MV-SEC-002`, `MV-SEC-006`, `MV-SEC-023`, verified in `DT-005`, `DT-006`, `DT-007`):**
   - Organization B user lists and injects projects/ZIP uploads into Organization A's `workspaceId` (`DT-005`, `DT-006`), lists all Organization A executions (`GET /api/executions`, `DT-007`), fetches Organization A's confidential prompts and code diffs (`GET /api/executions/[id]`), and streams Organization A's real-time SSE agent events (`GET /api/executions/[id]/events`, `DT-007`).
4. **Host Remote Code Execution & Environment Secret Exfiltration via Preview Manager (`MV-SEC-003` + `MV-SEC-004`):**
   - `startPreview(projectId)` in `src/lib/preview-manager.ts:41-47` executes `environment.startCommand` from the database directly on the Next.js host using `spawn(command, { cwd, shell: true, env: { ...process.env } })`. Combined with unauthenticated `GET /api/projects/[id]/preview/proxy` (`MV-SEC-004`), any running preview is also exposed without authentication.
5. **Cross-Tenant Financial Ledger & Review Integrity Tampering (`MV-SEC-025`, `MV-SEC-026`, `MV-SEC-005`, verified in `DT-011`, `DT-008`, `DT-009`):**
   - Organization B user posts negative-cost usage (`cost: -9000`) to Organization A's `apiAccountId` (`POST /api/api-usage`, `DT-011`), corrupting Organization A's `prepaidBalance` (`500 -> 9500`) and `totalSpent` (`10 -> -8990`); resolves Organization A's code review comments via `PATCH /api/executions/[id]/comments` (`DT-008`); and deletes Organization A's security notifications (`DT-009`).

---

## 3. Highest-Priority Fixes (Release Blockers)

1. **Remove `getCurrentUserOrDefault()` from all API handlers (`MV-SEC-001`, `MV-SEC-007`):** Enforce cryptographic session verification in `src/proxy.ts` and a strict `requireAuthenticatedUser()` guard returning `401` across all protected routes.
2. **Fail closed on missing secrets & fix `.env` key names (`MV-SEC-008`, `MV-SEC-031`):** Remove `"modelvault-dev-secret-change-me"` and `"modelvault-local-development-secret"` fallbacks; align `.env` to provide high-entropy `AUTH_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY`.
3. **Close all BOLA/IDOR and unscoped endpoints (`MV-SEC-002`, `MV-SEC-004`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-023`, `MV-SEC-024`, `MV-SEC-025`, `MV-SEC-026`, `MV-SEC-027`):**
   - Scope `GET /api/organizations` to caller memberships and strip `passwordHash` via explicit `select`.
   - Enforce `requireWorkspaceAccess` on `/api/projects`, `/api/projects/upload`, and `/api/workflows`.
   - Enforce `requireProjectAccess` on `/api/projects/[id]/preview/proxy`, `/api/executions`, `/api/executions/[id]`, `/api/executions/[id]/events`, and `/api/orchestrator/plan`.
   - Verify resource ownership (`userId: user.id` / `executionId: id`) on `/api/notifications/[id]`, `/api/api-usage`, `/api/billing`, and `/api/executions/[id]/comments`.
   - Remove all `prisma.project.findFirst()` fallbacks when a requested `projectId` is missing or invalid.
4. **Isolate preview and agent execution (`MV-SEC-003`, `MV-SEC-014`, `MV-SEC-021`, `MV-SEC-029`):** Never run project commands with `shell: true` or inherited `process.env` on the web host; move execution into isolated microVM/container sandboxes, harden Git CLI flags (`core.hooksPath=/dev/null`, `protocol.allow=never`, `--` option terminators), and sandbox the preview `<iframe>` on a dedicated preview origin.
5. **Harden authentication, OAuth, uploads, approvals, and dependencies (`MV-SEC-009`..`MV-SEC-012`, `MV-SEC-028`, `MV-SEC-030`, `MV-SEC-031`):** Add OAuth `state` + PKCE and verified-email checks, server-side session revocation, rate limiting, CSRF Origin verification, ZIP size/entry/ratio limits, server-side commit-bound verification approvals, and `dompurify`/`prisma` dependency updates.

---

## 4. Deliverable Index (`docs/security/`)

- [README.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/README.md) — Executive summary, scope, top attack paths, release gate status
- [threat-model.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/threat-model.md) — System overview, trust boundaries, assets, STRIDE & abuse cases
- [architecture-security-review.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/architecture-security-review.md) — Component security review & data-flow risk analysis
- [asset-inventory.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/asset-inventory.md) — Application, database, filesystem, credential, and integration assets
- [attack-surface.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/attack-surface.md) — Public and authenticated endpoints, input vectors, filesystem & command surfaces
- [authentication-audit.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/authentication-audit.md) — Session signing, `.env` mismatch, GitHub OAuth, logout, CSRF, and ASVS mapping
- [tenant-isolation-audit.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/tenant-isolation-audit.md) — Complete 41-route authorization matrix and multi-tenant BOLA analysis
- [sandbox-security-audit.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/sandbox-security-audit.md) — Preview `spawn(shell:true)` RCE, preview proxy, and target microVM controls
- [agent-security-audit.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/agent-security-audit.md) — Orchestrator, workflow engine, `/verify` scanner, approvals, and Git operations
- [dependency-audit.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/dependency-audit.md) — `npm audit --json` results (6 advisories), manifest inventory, and Git history scan
- [penetration-test-results.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/penetration-test-results.md) — Dynamic test harness results (`DT-001`..`DT-013`) and false-positive register
- [findings.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/findings.md) — Complete mandatory-format vulnerability catalog (`MV-SEC-001` .. `MV-SEC-031`)
- [findings.json](file:///c:/Users/bs162/Desktop/modevault/docs/security/findings.json) — Machine-readable findings report (`MV-SEC-001` .. `MV-SEC-031`)
- [remediation-roadmap.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/remediation-roadmap.md) — Prioritized P0–P3 engineering remediation plan and patch blueprints
- [residual-risks.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/residual-risks.md) — Open risks, coverage gaps, and formal risk-acceptance criteria
- [security-test-plan.md](file:///c:/Users/bs162/Desktop/modevault/docs/security/security-test-plan.md) — Regression test specification mapped to `MV-SEC-001` .. `MV-SEC-031`
