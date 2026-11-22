# Threat Model — MODELVAULT

**Date:** 2026-11-23  
**Method:** Audit-first repository review (no live threat simulation, no production access).  
**Status:** Draft based on code/config evidence; requires validation against deployed architecture.

## 1. System Overview

MODELVAULT is described as a multi-tenant AI development/agent orchestration SaaS. Observed in-repo capabilities include:

- Next.js 16 App Router web app/API (`src/app`, `src/app/api`)
- Cookie-based custom session auth (`mv_session`, HMAC-signed token) with Prisma User/Organization/Membership models
- Project creation, ZIP upload/import, workspace file read/write, git operations
- Execution/workflow/orchestrator endpoints that create tasks/events/artifacts and perform limited workspace mutations
- Preview manager spawning local processes for project start commands
- Integrations/credentials storage with AES-256-GCM encryption helper
- Notifications, subscriptions, billing, API usage/accounting, analytics, suggestions
- SQLite/Prisma schema in repo; scripts mention Postgres preparation

## 2. Trust Boundaries

| Boundary | Trusted side | Untrusted side | Evidence | Risk |
|---|---|---|---|---|
| B1 Browser ↔ Next.js API/UI | Server-side handlers after proper authz | Any internet client/browser | `src/proxy.ts`, `src/app/api/**` | Auth bypass, CSRF, IDOR, injection |
| B2 Authenticated user ↔ tenant data | Authorized org/project member | Other tenant/user, unauth user | `src/lib/permissions.ts`, route handlers | Cross-tenant data exposure |
| B3 App server ↔ local filesystem/workspaces | App process | Uploaded ZIP contents, repo files, agent-generated content | `src/app/api/projects/upload/route.ts`, `src/lib/project-workspace.ts` | Path traversal, malicious files, disk exhaustion |
| B4 App server ↔ command execution | Hardened sandbox (expected) | Project start commands, git commands, agent/tool commands | `src/lib/preview-manager.ts`, `src/lib/project-workspace.ts` | RCE, sandbox escape, secret exfiltration |
| B5 App server ↔ DB/Redis/secrets | Backend services | Compromised app path / injection / leaked env | `src/lib/db.ts`, `src/lib/crypto.ts`, Prisma schema | Data compromise, credential theft |
| B6 App server ↔ third-party integrations | MODELVAULT backend | GitHub/GitLab/AI providers/webhooks | `package.json`, integration routes, git routes | Token leakage, SSRF, webhook forgery, supply chain |
| B7 Agent/runtime ↔ user repo/instructions | Policy-enforced orchestrator | Repository files, README, prompts, external docs, tool outputs | execution/orchestrator/git routes | Prompt injection, policy bypass, unsafe actions |
| B8 Preview proxy ↔ local preview services | Authenticated viewer | Arbitrary requester/path | `src/app/api/projects/[id]/preview/proxy/route.ts` | Unauthorized preview access, localhost probing |

## 3. Primary Assets

| Asset | Sensitivity | Impact if compromised |
|---|---|---|
| User accounts/sessions | High | Account takeover, tenant access |
| Organization/project membership boundaries | Critical | Cross-tenant data breach |
| Source code / uploaded projects / git workspaces | Critical | IP theft, malware injection, supply-chain compromise |
| Integration/API credentials (GitHub/GitLab/AI/provider keys) | Critical | External account compromise, cost abuse, data exfiltration |
| Execution logs/events/artifacts/diffs | High | Source/secret leakage, audit tampering |
| Sandbox/runtime environment | Critical | Host compromise, lateral movement |
| Billing/subscription/usage records | High | Financial fraud, data exposure |
| Audit/approval records | High | Unauthorized actions approved, non-repudiation loss |

## 4. Threat Actors

| Actor | Capability | Motivation |
|---|---|---|
| Unauthenticated internet attacker | Can send arbitrary HTTP requests, craft cookies/files | Data theft, RCE, abuse |
| Malicious/compromised tenant user | Valid account, can create projects/prompts/uploads | Cross-tenant access, privilege escalation |
| Malicious project contributor/repo | Controls repo files/README/config | Prompt injection, agent abuse, git hook/config attacks |
| Insider/support/operator misuse | Privileged access (unknown) | Data access/exfiltration |
| Compromised dependency/CI | Supply chain execution | Backdoor, credential theft |
| Malicious agent output/model prompt injection | Influences tool selection/commands | Data exfil, unauthorized git/publish actions |

## 5. Entry Points

- Public/auth endpoints: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/github/*`, `/api/health`
- Project/import endpoints: `/api/projects`, `/api/projects/upload`, `/api/projects/[id]/files`, `/api/projects/[id]/preview*`
- Execution/orchestration: `/api/executions*`, `/api/orchestrator/plan`, `/api/workflows/execute`
- Git: `/api/git`
- Integrations/secrets: `/api/integrations`, `/api/api-accounts*`
- Notifications/billing/subscriptions/usage: `/api/notifications*`, `/api/billing*`, `/api/subscriptions*`, `/api/api-usage*`
- File uploads: multipart ZIP in `/api/projects/upload`
- Browser-controlled headers/cookies/query/path params across all routes

## 6. STRIDE Analysis (Key Components)

### 6.1 Authentication / Session (`src/lib/auth.ts`, `src/proxy.ts`, auth routes)
- **Spoofing:** Hardcoded dev secret fallback; demo-user fallback (`getCurrentUserOrDefault`) can treat invalid cookie requests as demo user. **High/Critical**.
- **Tampering:** Stateless cookie token with no server-side revocation; logout clears cookie only.
- **Repudiation:** Limited auth audit logging visible.
- **Information Disclosure:** Registration enumeration; verbose errors possible.
- **Denial of Service:** No rate limiting/lockout on login/register.
- **Elevation of Privilege:** Cookie-presence proxy + fallback patterns may bypass intended auth.

### 6.2 Multi-Tenant Data Access (Prisma models, route handlers)
- **Spoofing/EoP:** Missing authz in project upload/list, notifications `[id]`, executions list no-project branch; client-controlled workspace/project IDs.
- **Information Disclosure:** Cross-tenant project/execution/notification access possible where ownership checks missing.
- **Tampering:** Unauthorized mutation/deletion of notifications/projects.
- **Repudiation:** Incomplete audit logs for sensitive access.

### 6.3 File Upload / Workspace (`upload/route.ts`, `project-workspace.ts`)
- **Tampering:** Malicious archive contents written to workspace.
- **DoS:** No size/file count/expansion ratio/time limits.
- **EoP/RCE:** If workspace files later executed or interpreted unsafely.
- **Information Disclosure:** Error messages/logs may reveal paths.

### 6.4 Preview/Sandbox (`preview-manager.ts`, preview routes)
- **RCE/EoP:** Host `spawn` with `shell: true`, DB-controlled `startCommand`, inherited full `process.env`.
- **Information Disclosure:** Unauthenticated preview proxy exposes running preview content; localhost probing risk.
- **DoS:** Unbounded process spawning/resource consumption.
- **Tampering:** Preview can modify workspace/host depending on command.

### 6.5 Agent/Orchestration/Git (`executions`, `workflows/execute`, `git`, `project-workspace`)
- **Tampering:** Agents/git ops mutate workspaces; synthetic success artifacts can mislead.
- **EoP:** Missing sandbox/policy enforcement around command execution/tooling.
- **Repudiation:** Simulated audit artifacts mixed with real operations.
- **Information Disclosure:** Prompts/logs/diffs may contain secrets; execution list leak.

### 6.6 Integrations/Secrets (`crypto.ts`, integrations/api-accounts routes)
- **Information Disclosure:** Key preview/storage/logging concerns; hardcoded encryption fallback.
- **Spoofing:** Missing webhook signature verification evidence (no webhook routes found, but integrations planned).
- **Tampering:** Unauthorized integration mutation if authz weak.

## 7. Abuse Cases

1. **Attacker forges demo-user access** by sending `mv_session=invalid` to fallback API routes.
2. **Attacker enumerates/creates projects** in default workspace via unauthenticated `/api/projects`.
3. **Attacker uploads ZIP bomb/malicious archive** to exhaust disk/memory or stage malicious files.
4. **Tenant member triggers malicious preview command** leading to host command execution and env secret theft.
5. **Unauthenticated attacker reads running preview** via proxy endpoint and harvests app data.
6. **Attacker modifies/deletes another user's notifications** by ID guessing.
7. **Attacker pulls all executions** without project filter and exfiltrates prompts/diffs/artifacts.
8. **Malicious repo instructions** trick agent/workflow into unsafe git/publish/secret actions (design risk; runtime controls unverified).
9. **Stolen session cookie reused after logout** because no server-side revocation.
10. **Misconfigured deployment uses hardcoded AUTH_SECRET**, enabling token forgery.

## 8. Risk Ranking (Initial)

| Risk | Likelihood | Impact | Priority |
|---|---:|---:|---|
| Auth fallback/cookie-presence bypass | High | Critical | P0 |
| Missing authz on project/upload/notification/execution endpoints | High | Critical | P0 |
| Host command execution via preview | Medium | Critical | P0 |
| Unauth preview proxy / localhost access | Medium | High | P1 |
| Missing rate limiting/CSRF/session revocation | High | High | P1 |
| Upload resource exhaustion / archive hardening gaps | High | Medium | P1 |
| Secret/config hardening gaps | Medium | High | P1 |
| Insufficient sandbox/egress/isolation evidence | Unknown | Critical | P1 |
| Supply chain/scanner/CI gaps | Medium | Medium | P2 |

## 9. Assumptions / Validation Needed

- Production uses PostgreSQL, hardened sandbox provider, Redis/BullMQ, object storage, and proper secrets manager — **not evidenced in repo**.
- GitHub/GitLab/OAuth/webhook endpoints may exist outside reviewed paths or planned; none fully audited dynamically.
- SSE/WebSocket handlers for execution streams were not identified in API route scan; verify actual realtime implementation.
- RLS/tenant DB enforcement unknown; Prisma schema shows app-level relations only.

## 10. Recommended Threat Model Maintenance

- Update on every new endpoint, agent adapter, sandbox provider, integration, or data store.
- Require security review for changes touching auth, permissions, uploads, command execution, git, previews, secrets, billing.
- Add abuse-case tests to CI and run quarterly penetration tests on authorized staging.
