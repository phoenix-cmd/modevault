# MODELVAULT Security Findings

**Date:** 2026-11-23  
**Method:** Audit-first manual code review (all 41 API routes, all `src/lib/*` services, Prisma schema, Next.js config, and UI security sinks) + `npm audit --json` dependency analysis + controlled non-destructive dynamic verification (`DT-001`..`DT-013`) against an isolated temporary SQLite database copy. **No application source code was modified.**

## Severity summary

| Severity | Count | Finding IDs |
|---|---:|---|
| Critical | 4 | `MV-SEC-001`, `MV-SEC-002`, `MV-SEC-003`, `MV-SEC-024` |
| High | 10 | `MV-SEC-004`, `MV-SEC-005`, `MV-SEC-006`, `MV-SEC-007`, `MV-SEC-008`, `MV-SEC-009`, `MV-SEC-023`, `MV-SEC-025`, `MV-SEC-026`, `MV-SEC-028` |
| Medium | 8 | `MV-SEC-010`, `MV-SEC-011`, `MV-SEC-012`, `MV-SEC-013`, `MV-SEC-014`, `MV-SEC-027`, `MV-SEC-030`, `MV-SEC-031` |
| Low | 5 | `MV-SEC-015`, `MV-SEC-016`, `MV-SEC-017`, `MV-SEC-018`, `MV-SEC-029` |
| Informational | 4 | `MV-SEC-019`, `MV-SEC-020`, `MV-SEC-021`, `MV-SEC-022` |
| **Total** | **31** | `MV-SEC-001` .. `MV-SEC-031` |

## Coverage notes

- Evidence is based on complete source inspection of `c:\Users\bs162\Desktop\modevault`, `npm audit --json` output, and 13 controlled dynamic verification tests (`DT-001`..`DT-013`) executed on an isolated temporary SQLite copy (`security-audit-test.db`) with synthetic Organization A (`Owner`, `Member`, `Viewer`) and Organization B (`Owner`, `Member`) accounts.
- Cloud infrastructure, external production services, third-party model APIs, and live sandbox escape payloads were **not** tested (in compliance with audit rules of engagement).
- Findings marked **Confirmed** were verified directly in source code and/or reproduced dynamically in the isolated local harness; findings marked **Likely** depend on deployment-time infrastructure configuration.

---

### Finding ID: MV-SEC-001

**Title:** Demo-user authentication fallback allows unauthorized access when session cookie is present but invalid  
**Severity:** Critical  
**Confidence:** Confirmed  
**CVSS 4.0:** 9.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-287 Improper Authentication; CWE-863 Incorrect Authorization (secondary)  
**OWASP Category:** A07:2025 Authentication Failures; A01:2025 Broken Access Control  
**ASVS Requirement:** V2.2 Authentication security, V3.3 Session management, V8.2 General authorization controls  
**Affected Component:** Authentication/session resolution, API routes using demo fallback  
**Affected File:** `src/lib/auth.ts`, `src/proxy.ts`, multiple `src/app/api/**/route.ts`  
**Affected Endpoint:** Multiple authenticated-appearing APIs, e.g. `/api/subscriptions`, `/api/billing`, `/api/api-accounts`, `/api/integrations`, `/api/notifications`, `/api/dashboard`, `/api/analytics` (representative)

**Description:**

`getCurrentUserOrDefault()` returns the real authenticated user when session verification succeeds, but silently falls back to the hardcoded demo user (`user_demo_001`) when no valid session is present. Many API routes use this helper for data access/mutation. Combined with a proxy gate that only checks for cookie presence (`Boolean(request.cookies.get("mv_session")?.value)`), any request carrying an arbitrary non-empty `mv_session` value can bypass the presence gate and be treated as the demo user by fallback routes.

**Evidence:**

`src/lib/auth.ts`:
```ts
export async function getCurrentUserOrDefault(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (user) return user

  const demo = await prisma.user.findUnique({
    where: { id: "user_demo_001" },
    select: { id: true, email: true, name: true },
  })
  if (demo) return demo

  throw new Error("No demo user available")
}
```

`src/proxy.ts`:
```ts
const hasSession = Boolean(request.cookies.get("mv_session")?.value)
if (!hasSession) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}
```

Representative route (`src/app/api/subscriptions/route.ts`):
```ts
const user = await getCurrentUserOrDefault()
const subscriptions = await prisma.subscription.findMany({
  where: { userId: user.id },
  ...
})
```

**Attack Preconditions:**

- Target environment contains seeded/demo user `user_demo_001` (or equivalent fallback user).
- Attacker can send HTTP requests to API endpoints.
- Proxy/middleware behavior matches `src/proxy.ts` (cookie presence only) or endpoint is reachable.

**Attack Scenario:**

1. Attacker sends request to `/api/subscriptions` with `Cookie: mv_session=invalid`.
2. Proxy sees non-empty cookie and allows request.
3. `verifySession` fails; `getCurrentUserOrDefault()` returns demo user.
4. API returns/modifies demo-user subscriptions. Same pattern applies to billing, integrations, API accounts, notifications, and other fallback routes.

**Impact:**

Unauthorized read/write of demo-user data; potential exposure/modification of financial records, integration metadata, API account records, notifications, and other user-scoped resources. In a misconfigured production environment, this becomes a practical authentication bypass.

**Reproduction:**

Safe local/staging only:
1. Seed demo user and demo data in an isolated test DB.
2. Send `GET /api/subscriptions` with no cookie; observe redirect/401 depending on proxy.
3. Send `GET /api/subscriptions` with `Cookie: mv_session=not-a-valid-token`.
4. Confirm response contains demo-user data and no valid authentication was provided.
5. Repeat with POST/PATCH/DELETE endpoints that use `getCurrentUserOrDefault()`.

**Remediation:**

- Remove `getCurrentUserOrDefault()` from all production API paths. Use `getCurrentUser()` and return 401/403 when absent.
- Restrict demo-user fallback to explicit development-only seed flows guarded by `NODE_ENV === "development"` and a dedicated opt-in flag, never in request handlers.
- Validate session signature/expiry/server-side revocation in middleware and server handlers.
- Add centralized `requireAuthenticatedUser()` helper that throws 401.

**Verification:**

- Invalid/missing session cookie receives 401 on protected APIs.
- No route returns data with `mv_session=invalid`.
- Automated tests cover all routes previously using `getCurrentUserOrDefault()`.

**Regression Test:**

- Add integration tests for representative endpoints asserting 401 with absent/invalid/expired cookie.
- Add static check banning `getCurrentUserOrDefault` in `src/app/api/**` except explicitly approved dev-only files.

---

### Finding ID: MV-SEC-002

**Title:** Project creation/listing/upload endpoints lack authentication and workspace authorization  
**Severity:** Critical  
**Confidence:** Confirmed  
**CVSS 4.0:** 9.8 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`)  
**CWE:** CWE-862 Missing Authorization; CWE-284 Improper Access Control  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization, V8.2 General authorization controls, V5.3 File handling  
**Affected Component:** Project API, project upload/import  
**Affected File:** `src/app/api/projects/route.ts`, `src/app/api/projects/upload/route.ts`  
**Affected Endpoint:** `GET/POST /api/projects`, `POST /api/projects/upload`

**Description:**

The projects list/create endpoint and ZIP upload endpoint perform no user authentication and no workspace/organization authorization. They accept client-controlled `workspaceId` and default to `ws_core_001`. Upload extracts archive contents to the server filesystem and initializes a git repository.

**Evidence:**

`src/app/api/projects/route.ts`:
```ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const workspaceId = searchParams.get("workspaceId") || "ws_core_001"
  const projects = await prisma.project.findMany({ where: { workspaceId }, ... })
  return NextResponse.json({ data: projects })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, description, framework, language, repositoryUrl, workspaceId } = body
  ...
  const wsId = workspaceId || "ws_core_001"
  const project = await prisma.project.create({ data: { workspaceId: wsId, ... } })
}
```

`src/app/api/projects/upload/route.ts`:
```ts
const formData = await req.formData()
const file = formData.get("file") as File | null
const name = (formData.get("name") as string) || "Imported Project"
const workspaceId = (formData.get("workspaceId") as string) || "ws_core_001"
...
const workspacePath = await ensureProjectWorkspace(project.id)
...
await writeWorkspaceFile(workspacePath, relativePath, content)
...
await initializeGitRepository(workspacePath)
```

**Attack Preconditions:**

- Endpoint reachable by attacker (proxy bypass/cookie-presence issue may assist; endpoint itself has no check).
- Filesystem writable by application process for upload path.

**Attack Scenario:**

1. Attacker calls `GET /api/projects?workspaceId=<target>` to enumerate projects in known/default workspace.
2. Attacker calls `POST /api/projects` or `/api/projects/upload` with arbitrary `workspaceId`.
3. Application creates records and writes uploaded files to server workspace directory, initializing git repo.

**Impact:**

Unauthorized data disclosure, unauthorized project creation, workspace pollution, disk exhaustion, potential malicious file staging on server, and tenant boundary compromise.

**Reproduction:**

Safe local/staging only:
1. In isolated environment, issue unauthenticated `GET /api/projects`.
2. Issue unauthenticated `POST /api/projects` with JSON body for a test workspace.
3. Issue unauthenticated multipart `POST /api/projects/upload` with a small benign ZIP.
4. Verify records/files created without authenticated user context.

**Remediation:**

- Require authenticated user for both endpoints.
- Resolve workspace from server-side membership; never trust client `workspaceId` without authorization.
- Enforce `requireWorkspaceAccess`/equivalent role checks (member/admin/owner for create/upload).
- Add strict upload validation (size, file count, expanded size, MIME/ext, timeout).
- Store uploads in isolated quarantine/storage with tenant-scoped paths and cleanup.

**Verification:**

- Unauthenticated requests return 401.
- Authenticated users cannot list/create/upload into workspaces they do not belong to.
- Uploads rejected when limits exceeded.

**Regression Test:**

- API tests for unauthenticated/other-tenant access to `/api/projects` and `/api/projects/upload`.
- Fuzz/abuse tests for archive limits in CI (safe synthetic fixtures).

---

### Finding ID: MV-SEC-003

**Title:** Preview manager executes DB-controlled start commands on host with shell and inherited environment  
**Severity:** Critical  
**Confidence:** Confirmed  
**CVSS 4.0:** 9.4 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`)  
**CWE:** CWE-78 OS Command Injection; CWE-94 Code Injection (contextual); CWE-250 Execution with Unnecessary Privileges  
**OWASP Category:** A05:2025 Injection; A02:2025 Security Misconfiguration  
**ASVS Requirement:** V1.5 Secure deployment/architecture, V5.3 OS command execution, V15.1 Isolated execution environments  
**Affected Component:** Preview/sandbox execution  
**Affected File:** `src/lib/preview-manager.ts`, `src/app/api/projects/[id]/preview/route.ts`  
**Affected Endpoint:** `POST /api/projects/[id]/preview`

**Description:**

Preview startup spawns a process using `environment.startCommand` from the database with `shell: true`, working directory set to extracted project source, and full `process.env` inherited. This executes on the application host (except Vercel simulated branch), not in a hardened tenant-isolated sandbox.

**Evidence:**

`src/lib/preview-manager.ts`:
```ts
const command = environment.startCommand || "npm run dev"
...
const child = spawn(/* turbopackIgnore: true */ command, {
  cwd,
  shell: true,
  env: { ...process.env, PORT: String(port) },
  stdio: "ignore",
  detached: false,
})
```

`src/app/api/projects/[id]/preview/route.ts` requires member access, then calls `startPreview(id)`.

**Attack Preconditions:**

- Attacker has member-level access to a project (or compromises such account), or can influence project environment command through another vulnerability.
- Application runs in non-Vercel mode where preview process is spawned.

**Attack Scenario:**

1. Attacker gains project member access.
2. Attacker causes project environment `startCommand` to contain malicious shell payload (directly, via compromised DB record, or through any future/adjacent update path).
3. Attacker triggers `POST /api/projects/[id]/preview`.
4. Host executes command with application privileges and inherited env vars.

**Impact:**

Potential remote code execution on application host, secret exfiltration from process environment, lateral movement, source code theft, sandbox escape equivalent because no sandbox boundary exists.

**Reproduction:**

Safe local/staging only, on disposable isolated VM/container:
1. Create synthetic project/environment with benign command like `node -v`.
2. Confirm preview start spawns command.
3. In disposable environment, set a harmless marker command (e.g., create file in temp test dir) to validate command execution path. **Do not run destructive payloads.**

**Remediation:**

- Do not execute user/project-controlled commands on host. Use isolated sandbox/VM per workspace with strict image, seccomp/AppArmor, no privileged mode, no Docker socket, read-only root, separate network policy.
- Remove `shell: true`; pass vetted executable and args only.
- Do not inherit full `process.env`; pass minimal allowlisted vars.
- Validate and constrain start commands to predefined safe templates.
- Enforce CPU/memory/process/disk/time quotas and egress allowlist.

**Verification:**

- Start command cannot include shell metacharacters or arbitrary binaries.
- Preview processes run in isolated sandbox identity without host secrets.
- Attempted host file/env access from preview is denied.

**Regression Test:**

- Unit tests rejecting unsafe commands and ensuring env allowlist.
- Integration tests proving preview runs in sandbox runtime, not host process.

---

### Finding ID: MV-SEC-004

**Title:** Preview proxy endpoint lacks authentication and enables unauthorized localhost preview access  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 8.7 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:L/SC:L/SI:L/SA:N`)  
**CWE:** CWE-862 Missing Authorization; CWE-918 SSRF (limited/local)  
**OWASP Category:** A01:2025 Broken Access Control; A10:2025 Mishandling Exceptional Conditions (secondary)  
**ASVS Requirement:** V4.2 Operation-level authorization, V13.2 URL/HTTP client protections  
**Affected Component:** Live preview proxy  
**Affected File:** `src/app/api/projects/[id]/preview/proxy/route.ts`  
**Affected Endpoint:** `GET /api/projects/[id]/preview/proxy`

**Description:**

The preview proxy endpoint does not authenticate the user or verify project ownership/membership. It proxies requests to `http://localhost:${preview.port}${path}` for any running in-memory preview. The `path` query parameter is user-controlled and concatenated into the upstream URL.

**Evidence:**

```ts
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const preview = getPreview(id)
  if (!preview.running || !preview.port) {
    return NextResponse.json({ error: "Preview is not running" }, { status: 404 })
  }

  const path = req.nextUrl.searchParams.get("path") || "/"
  const target = `http://localhost:${preview.port}${path}`
  const upstream = await fetch(target, { headers: { Accept: req.headers.get("accept") || "*/*" } })
  ...
}
```

**Attack Preconditions:**

- A preview is running for a known/guessable project ID.
- Attacker can reach the endpoint.

**Attack Scenario:**

1. Attacker identifies/guesses project ID with active preview.
2. Attacker calls `/api/projects/{id}/preview/proxy?path=/`.
3. Server proxies unauthenticated request to local preview port and returns content.
4. Attacker iterates paths to access preview endpoints; depending on local port bindings, may reach unintended localhost HTTP surfaces.

**Impact:**

Unauthorized access to preview content, cross-tenant data exposure, potential local service probing/SSRF within localhost boundary.

**Reproduction:**

Safe local/staging only:
1. Start a preview for a synthetic project.
2. From an unauthenticated session/browser, request `/api/projects/{id}/preview/proxy?path=/`.
3. Confirm content is returned without auth.

**Remediation:**

- Require authenticated user and `requireProjectAccess(..., "viewer")`.
- Issue short-lived, signed preview tokens bound to user, project, expiry, and session.
- Validate and normalize `path` as a single absolute path segment; reject protocol-relative, backslashes, encoded traversal, and external hosts.
- Proxy only to an allowlisted preview host/port mapping managed by server, not arbitrary localhost ports.
- Add audit logs and rate limits.

**Verification:**

- Unauthenticated requests return 401/403.
- Cross-tenant user cannot access another project's preview proxy.
- Invalid path/host inputs rejected.

**Regression Test:**

- Integration tests for authz on preview proxy.
- Tests for path normalization and token expiry.

---

### Finding ID: MV-SEC-005

**Title:** Notification ID endpoints allow unauthorized object modification and deletion  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 8.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:H/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-639 Authorization Bypass Through User-Controlled Key; CWE-862 Missing Authorization  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization, V8.2 General authorization controls  
**Affected Component:** Notifications API  
**Affected File:** `src/app/api/notifications/[id]/route.ts`  
**Affected Endpoint:** `PATCH /api/notifications/[id]`, `DELETE /api/notifications/[id]`

**Description:**

Notification update/delete handlers accept an ID from the URL and perform database operations without authenticating the user or verifying notification ownership.

**Evidence:**

```ts
const { id } = await params
const body = await request.json()
const { isRead } = body

const notification = await prisma.notification.update({
  where: { id },
  data: { isRead: isRead !== undefined ? isRead : true },
})
```

DELETE similarly calls `prisma.notification.delete({ where: { id } })` with no auth.

**Attack Preconditions:**

- Attacker can reach endpoint.
- Attacker knows/guesses notification ID.

**Attack Scenario:**

1. Attacker obtains or guesses notification ID.
2. Sends PATCH/DELETE request.
3. Server modifies/deletes notification without ownership check.

**Impact:**

Unauthorized modification/deletion of user notifications, audit trail disruption, potential targeted hiding of security/approval alerts.

**Reproduction:**

Safe local/staging only:
1. Create two synthetic users with notifications.
2. As user B (or unauthenticated, depending on proxy), PATCH/DELETE user A notification ID.
3. Confirm mutation succeeds.

**Remediation:**

- Require authenticated user.
- Scope query by both `id` and `userId`: `updateMany/deleteMany({ where: { id, userId: user.id } })` and check affected count.
- Return 404 for missing/non-owned resources to avoid ID oracle.

**Verification:**

- Cross-user notification ID returns 404/403 and no mutation.
- Owner can update/delete own notification.

**Regression Test:**

- API authorization tests for BOLA/IDOR on notification endpoints.

---

### Finding ID: MV-SEC-006

**Title:** Executions listing endpoint returns all executions when projectId is omitted  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 8.2 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-862 Missing Authorization; CWE-200 Information Exposure  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization, V8.2 General authorization controls  
**Affected Component:** Executions API  
**Affected File:** `src/app/api/executions/route.ts`  
**Affected Endpoint:** `GET /api/executions`

**Description:**

When `projectId` is not provided, the handler builds an empty `where` filter and returns all executions with project/tasks/artifacts included. No user authentication or tenant scoping is applied in that branch.

**Evidence:**

```ts
const where: { projectId?: string } = {}
if (projectId) {
  const user = await getCurrentUserOrDefault()
  try { await requireProjectAccess(projectId, user.id, "viewer") } catch { return 403 }
  where.projectId = projectId
}

const executions = await prisma.execution.findMany({
  where,
  include: { project: true, tasks: true, artifacts: true },
  orderBy: { createdAt: "desc" },
})
```

**Attack Preconditions:**

- Endpoint reachable.
- Executions exist in DB.

**Attack Scenario:**

1. Attacker requests `GET /api/executions` without `projectId`.
2. API returns executions across projects/tenants.

**Impact:**

Cross-tenant exposure of execution metadata, prompts, task details, artifacts, and potentially sensitive code diffs/log content.

**Reproduction:**

Safe local/staging only:
1. Create executions in two synthetic organizations/projects.
2. Request `GET /api/executions` with no `projectId`.
3. Confirm response includes records outside requester scope.

**Remediation:**

- Require authentication for all execution reads.
- Always scope by memberships/workspaces/projects accessible to current user.
- If `projectId` provided, verify access and filter by both `projectId` and tenant membership.
- Paginate and limit fields returned by default.

**Verification:**

- Unscoped request returns 401/403 or only caller-authorized executions.
- Cross-tenant execution IDs not returned.

**Regression Test:**

- Add BOLA tests for execution list/detail/events/artifacts endpoints.

---

### Finding ID: MV-SEC-007

**Title:** Proxy/request gate only checks session cookie presence and is not a complete server-side authorization control  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 7.9 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-602 Client-Side Enforcement of Server-Side Security; CWE-807 Reliance on Untrusted Inputs in a Security Decision  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V3.3 Session management, V4.1 General access control  
**Affected Component:** Request gate/middleware  
**Affected File:** `src/proxy.ts`  
**Affected Endpoint:** All matched routes except public paths

**Description:**

The proxy checks only whether `mv_session` cookie has any value. It does not verify signature, expiry, user existence, revocation, or role. This is not a reliable access-control boundary and creates dangerous coupling with route handlers that assume upstream authentication.

**Evidence:**

```ts
const hasSession = Boolean(request.cookies.get("mv_session")?.value)
if (!hasSession) {
  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", pathname)
  return NextResponse.redirect(loginUrl)
}
return NextResponse.next()
```

No call to `verifySession()` or DB/session store.

**Attack Preconditions:**

- Attacker can set arbitrary cookie value.

**Attack Scenario:**

1. Attacker sets `mv_session=dummy`.
2. Proxy allows request through presence check.
3. Downstream route with weak/missing auth may expose or mutate data.

**Impact:**

Authentication bypass in combination with weak handlers; false sense of protection; increased likelihood of unauthenticated API access.

**Reproduction:**

Safe local/staging only:
1. Send request to protected route with `mv_session=dummy`.
2. Observe proxy allows pass-through (status not redirect to login).
3. Compare with missing cookie behavior.

**Remediation:**

- Verify session token in edge/middleware where feasible, or enforce strict server-side auth in every handler and treat middleware as defense-in-depth only.
- Implement deny-by-default route protection for `/api/*` except explicit public allowlist.
- Add CSRF/origin checks for state-changing cookie-auth requests.

**Verification:**

- Invalid/expired/tampered cookies are rejected before reaching protected handlers.
- All protected API routes independently enforce auth.

**Regression Test:**

- Middleware tests for invalid cookie values.
- Route-level tests ensuring no handler relies solely on proxy.

---

### Finding ID: MV-SEC-008

**Title:** Hardcoded development secret fallbacks for authentication and encryption keys  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 7.7 (`CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-798 Use of Hard-coded Credentials; CWE-321 Use of Hard-coded Cryptographic Key  
**OWASP Category:** A04:2025 Cryptographic Failures  
**ASVS Requirement:** V6.4 Secret management, V11.1 Cryptographic architecture  
**Affected Component:** Auth token signing, integration secret encryption  
**Affected File:** `src/lib/auth.ts`, `src/lib/crypto.ts`  
**Affected Endpoint:** Authentication/session; `/api/integrations`

**Description:**

Auth and crypto modules fall back to hardcoded development secrets when environment variables are missing. In a misconfigured deployment, attackers could forge session tokens or decrypt/forge encrypted integration payloads depending on exposure.

**Evidence:**

`src/lib/auth.ts`:
```ts
const JWT_SECRET = process.env.AUTH_SECRET || "modelvault-dev-secret-change-me"
```

`src/lib/crypto.ts`:
```ts
const secret =
  process.env.INTEGRATIONS_ENCRYPTION_KEY ||
  process.env.AUTH_SECRET ||
  "modelvault-local-development-secret"
```

**Attack Preconditions:**

- Deployment missing required secrets or using default development config.
- Attacker knows source defaults (public repo/source leak) or guesses common dev defaults.

**Attack Scenario:**

1. Misconfigured environment starts with fallback secret.
2. Attacker crafts valid HMAC session token using known default.
3. Attacker accesses protected resources as chosen user ID (if other controls permit).

**Impact:**

Session forgery, account takeover, credential decryption risk, integrity compromise of encrypted secrets.

**Reproduction:**

Safe local/staging only:
1. Start app without `AUTH_SECRET` in isolated test env.
2. Generate token signed with default secret for synthetic user.
3. Verify whether app accepts it.

**Remediation:**

- Fail startup if required secrets missing in non-test environments.
- Use strong random secrets from secret manager/KMS; rotate keys.
- Separate `AUTH_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY`; support key versioning.
- Add startup health check that refuses insecure defaults.

**Verification:**

- App refuses to boot in production/staging without valid secrets.
- Tokens signed with default secret rejected.

**Regression Test:**

- Config validation unit tests; CI check for hardcoded secret fallbacks in prod paths.

---

### Finding ID: MV-SEC-009

**Title:** Missing anti-automation controls: no rate limiting, lockout, or CSRF defenses on sensitive cookie-auth flows  
**Severity:** High  
**Confidence:** Likely  
**CVSS 4.0:** 7.6 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:L/VI:H/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-307 Improper Restriction of Excessive Authentication Attempts; CWE-352 CSRF; CWE-770 Resource Allocation Without Limits  
**OWASP Category:** A07:2025 Authentication Failures  
**ASVS Requirement:** V2.4 Anti-automation, V3.5 Browser/CSRF protections, V4.2 Access control  
**Affected Component:** Auth endpoints and cookie-authenticated state-changing APIs  
**Affected File:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/proxy.ts`, various POST/PATCH/DELETE handlers  
**Affected Endpoint:** `/api/auth/login`, `/api/auth/register`, many state-changing `/api/*` routes

**Description:**

Code review found no rate limiting, CAPTCHA/anti-automation, account lockout, or CSRF token/origin verification on authentication and cookie-authenticated state-changing endpoints. Session cookies are `SameSite=Lax`, which provides partial CSRF mitigation but is insufficient as sole defense for all browser contexts and deployment patterns.

**Evidence:**

`login` route performs bcrypt compare and issues cookie with no throttle/lockout. `register` creates account with no anti-automation. No CSRF middleware/token validation observed in `proxy.ts` or handlers.

**Attack Preconditions:**

- Attacker can send repeated requests or induce victim browser requests.

**Attack Scenario:**

1. Attacker brute-forces/password-sprays login endpoints.
2. Or attacker induces authenticated browser to submit state-changing request to vulnerable cookie-auth endpoint lacking CSRF checks.

**Impact:**

Account compromise risk, automated abuse, unwanted state changes, resource exhaustion.

**Reproduction:**

Safe local/staging only:
1. Send repeated login attempts for synthetic account; observe no throttling/lockout.
2. From authenticated browser context, attempt cross-site state-changing POST to selected endpoint; verify CSRF protections.

**Remediation:**

- Add rate limiting by IP/account/tenant (Redis-backed).
- Add lockout/backoff and alerting for auth failures.
- Implement CSRF tokens or strict Origin/Fetch-Metadata checks for cookie-auth state-changing requests.
- Add audit logs for auth anomalies.

**Verification:**

- Excessive attempts receive 429/temporary lock.
- Cross-site state-changing requests without CSRF proof are rejected.

**Regression Test:**

- Integration tests for throttling, lockout, and CSRF rejection.

---

### Finding ID: MV-SEC-010

**Title:** ZIP upload pipeline lacks resource limits and robust archive hardening  
**Severity:** Medium  
**Confidence:** Confirmed  
**CVSS 4.0:** 6.9 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:H/SC:N/SI:N/SA:N`)  
**CWE:** CWE-409 Improper Handling of Highly Compressed Data; CWE-770 Allocation of Resources Without Limits  
**OWASP Category:** A05:2025 Injection / A02:2025 Security Misconfiguration (resource abuse)  
**ASVS Requirement:** V5.2 File upload validation, V5.3 File handling, V15.2 Resource controls  
**Affected Component:** Project ZIP upload/import  
**Affected File:** `src/app/api/projects/upload/route.ts`  
**Affected Endpoint:** `POST /api/projects/upload`

**Description:**

The upload handler reads full archive into memory, parses with JSZip, iterates entries, and writes extracted files to disk with no explicit max file size, max entry count, max expanded size, compression ratio limit, extraction timeout, symlink/device checks, or content-type validation. It also converts binary files to base64 strings and writes them as UTF-8 text.

**Evidence:**

```ts
const arrayBuffer = await file.arrayBuffer()
const zip = await JSZip.loadAsync(arrayBuffer)
...
for (const relativePath of safeEntries) {
  const content = await zipEntry.async("string").catch(async () => {
    const buffer = await zipEntry.async("nodebuffer")
    return buffer.toString("base64")
  })
  await writeWorkspaceFile(workspacePath, relativePath, content)
}
```

No `file.size`, `fileList.length`, total bytes, or timeout checks before extraction.

**Attack Preconditions:**

- Attacker can reach upload endpoint (currently unauthenticated per MV-SEC-002).

**Attack Scenario:**

1. Attacker uploads oversized or highly compressed archive.
2. Server allocates memory/CPU/disk while parsing/extracting.
3. Service degrades or filesystem fills.

**Impact:**

Denial of service/resource exhaustion, disk filling, degraded availability, potential cost amplification.

**Reproduction:**

Safe local/staging only:
1. Create synthetic large-but-safe ZIP and nested-many-files ZIP within test limits.
2. Observe absence of enforced limits and resource consumption behavior.
3. Do not perform destructive exhaustion against shared environments.

**Remediation:**

- Enforce strict limits: compressed size, entry count, per-file size, total uncompressed size, compression ratio, path length, extraction timeout.
- Reject symlinks, special files, absolute paths, `..`, control chars, duplicate normalized paths.
- Stream extraction to quarantine; scan before promoting.
- Store binary files as binary; preserve safe metadata.

**Verification:**

- Oversized/over-count/ratio-exceeding archives rejected with 4xx.
- Extraction runs within bounded memory/time.

**Regression Test:**

- Add archive-abuse fixture tests (zip slip paths, symlink entries, many files, large uncompressed).

---

### Finding ID: MV-SEC-011

**Title:** User enumeration and weak registration/password posture  
**Severity:** Medium  
**Confidence:** Confirmed  
**CVSS 4.0:** 5.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-204 Observable Response Discrepancy; CWE-521 Weak Password Requirements  
**OWASP Category:** A07:2025 Authentication Failures  
**ASVS Requirement:** V2.1 Password security, V2.2 Authentication, V2.4 Anti-automation  
**Affected Component:** Registration/login validation  
**Affected File:** `src/app/api/auth/register/route.ts`, `src/lib/validation.ts`, `src/app/api/auth/login/route.ts`  
**Affected Endpoint:** `POST /api/auth/register`, `POST /api/auth/login`

**Description:**

Registration returns `409 Email is already registered`, enabling account enumeration. Password policy only enforces minimum 8 chars and max 200; no breached-password checks, complexity/contextual rules, or rate limiting. Login message is generic (good) but lacks anti-automation.

**Evidence:**

```ts
const existing = await prisma.user.findUnique({ where: { email } })
if (existing) {
  return NextResponse.json({ error: "Email is already registered" }, { status: 409 })
}
```

`passwordSchema = z.string().min(8).max(200)`.

**Attack Preconditions:**

- Public registration/login accessible.

**Attack Scenario:**

1. Attacker submits registration attempts for target emails.
2. 409 responses confirm account existence.
3. Attacker focuses password spraying/bruteforce on confirmed accounts.

**Impact:**

Account enumeration; increased account takeover likelihood.

**Reproduction:**

Safe local/staging only:
1. Register synthetic user.
2. Attempt registration with same email; observe 409.
3. Attempt with unknown email; observe different response.

**Remediation:**

- Return generic registration response ("If eligible, verify your email") where appropriate.
- Add rate limiting and abuse detection.
- Enforce stronger password policy and breached-password screening.
- Require email verification before full account activation.

**Verification:**

- Registration responses do not reveal account existence.
- Weak/breached passwords rejected.

**Regression Test:**

- Tests for generic registration responses and password policy.

---

### Finding ID: MV-SEC-012

**Title:** Session lifecycle lacks revocation, rotation, and strong invalidation controls  
**Severity:** Medium  
**Confidence:** Likely  
**CVSS 4.0:** 6.3 (`CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-613 Insufficient Session Expiration; CWE-384 Session Fixation (risk)  
**OWASP Category:** A07:2025 Authentication Failures  
**ASVS Requirement:** V3.3 Session timeout/invalidation, V3.6 Session lifecycle, V3.7 Defenses against session abuse  
**Affected Component:** Session management  
**Affected File:** `src/lib/auth.ts`, `src/app/api/auth/logout/route.ts`, `prisma/schema.prisma`  
**Affected Endpoint:** All cookie-authenticated endpoints

**Description:**

Sessions are stateless HMAC tokens containing `sub` and `exp` (7 days), stored in cookie. There is no server-side session store lookup/revocation on normal requests, no rotation on privilege change/login, and logout only clears cookie client-side. Prisma has `Session`/`VerificationToken` models but custom auth code does not use them for session revocation.

**Evidence:**

`signSession` sets `exp: Date.now() + 7 * 24 * 60 * 60 * 1000`. `verifySession` validates signature and expiry only. `logout` sets empty cookie. `getCurrentUser` does not check DB session revocation.

**Attack Preconditions:**

- Token theft or leakage; or need to revoke compromised session.

**Attack Scenario:**

1. Attacker steals valid session token.
2. Legitimate user logs out; cookie removed locally but token remains valid until expiry.
3. Attacker continues using stolen token for up to remaining 7 days.

**Impact:**

Extended session abuse window, inability to revoke compromised sessions.

**Reproduction:**

Safe local/staging only:
1. Login as synthetic user, capture cookie.
2. Logout in browser.
3. Replay captured cookie to protected API before expiry.
4. Observe whether token still accepted.

**Remediation:**

- Implement server-side session IDs with revocation/rotation; store hash of session token.
- Shorten access token TTL and use refresh rotation.
- Revoke sessions on logout, password change, credential reset, role change.
- Bind session to device/context risk signals where appropriate.

**Verification:**

- Logged-out/revoked token rejected.
- Password change invalidates existing sessions.

**Regression Test:**

- Integration tests for logout invalidation, expiry, and rotation.

---

### Finding ID: MV-SEC-013

**Title:** Secret handling and logging controls may expose sensitive operational data in logs/errors  
**Severity:** Medium  
**Confidence:** Likely  
**CVSS 4.0:** 5.9 (`CVSS:4.0/AV:L/AC:L/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-532 Insertion of Sensitive Information into Log File; CWE-209 Information Exposure Through Error Message  
**OWASP Category:** A09:2025 Security Logging and Alerting Failures  
**ASVS Requirement:** V16.3 Security logging, V6.4 Secret management  
**Affected Component:** Logging, error handling, process spawning  
**Affected File:** `src/lib/logger.ts`, `src/app/api/projects/upload/route.ts`, `src/lib/preview-manager.ts`, multiple API routes  
**Affected Endpoint:** Multiple

**Description:**

Logger serializes arbitrary context and error stacks; many routes log raw errors. Preview manager inherits full process env into spawned preview command. Upload route logs raw ZIP processing errors. Some routes return `err.message` to clients. There is no central redaction policy evident for secrets/tokens/headers.

**Evidence:**

`logger.ts` writes JSON context and error stacks. `errorContext` includes `stack`. Preview spawn: `env: { ...process.env, PORT: String(port) }`. Several routes `return NextResponse.json({ error: err.message ... })`.

**Attack Preconditions:**

- Access to logs, error monitoring, or client-visible error responses; or local process compromise.

**Attack Scenario:**

1. Error occurs during sensitive operation.
2. Stack/message/context includes sensitive path/token/internal detail.
3. Logs or API response expose information useful for exploitation.

**Impact:**

Information disclosure, credential leakage risk, easier reconnaissance.

**Reproduction:**

Safe local/staging only:
1. Trigger controlled validation/processing errors in synthetic environment.
2. Inspect server logs and API responses for sensitive data/redaction behavior.

**Remediation:**

- Implement redaction allowlist/denylist for keys (`authorization`, `cookie`, `token`, `secret`, `password`, `apiKey`).
- Return generic client errors; keep detailed errors in server logs with correlation IDs.
- Do not inherit full process env into subprocesses.
- Scrub stack traces in production logs where feasible.

**Verification:**

- Sensitive fields redacted in logs.
- Client receives generic error messages.

**Regression Test:**

- Unit tests for log redaction and error sanitization.

---

### Finding ID: MV-SEC-014

**Title:** Git command execution and workspace operations have insufficient isolation and policy boundaries  
**Severity:** Medium  
**Confidence:** Likely  
**CVSS 4.0:** 6.8 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:H/VA:L/SC:L/SI:L/SA:N`)  
**CWE:** CWE-284 Improper Access Control; CWE-73 External Control of File Name or Path (secondary)  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization, V15.1 Isolated execution environments  
**Affected Component:** Git/workspace management  
**Affected File:** `src/lib/project-workspace.ts`, `src/app/api/git/route.ts`, `src/app/api/executions/route.ts`  
**Affected Endpoint:** `/api/git`, `/api/executions`, `/api/workflows/execute`

**Description:**

Git operations execute on local workspaces via `execFile("git", ...)`. While `execFile` avoids shell interpolation, the system still operates on local filesystem paths tied to project sources. Workspace paths and git operations are available to authenticated members; there is limited evidence of sandboxing, repo hook disabling, git config hardening, or isolation from host secrets. Some git actions (branch/checkout/create commit) can mutate worktrees; revert action in API records synthetic revert without performing real git revert.

**Evidence:**

`project-workspace.ts` uses `execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 })`. `commitWorkspace` does `git add -A` and commits. `initializeGitRepository` configures local git user. No `GIT_TERMINAL_PROMPT=0`, no `core.hooksPath` hardening, no safe.directory/allowlist beyond cwd.

**Attack Preconditions:**

- Authenticated member access to a project with local workspace; or exploitation of auth flaws above.

**Attack Scenario:**

1. Attacker imports or modifies repository containing malicious git attributes/hooks/config patterns in workspace.
2. Git operation triggers unexpected behavior in insufficiently hardened environment.
3. Or attacker uses git endpoints to mutate project workspace beyond intended scope.

**Impact:**

Workspace tampering, unexpected command execution in poorly hardened git environments, integrity loss of source artifacts.

**Reproduction:**

Safe local/staging only:
1. Create synthetic repo with benign `.gitattributes`/hook-like files.
2. Run supported git operations and observe whether hooks/config are ignored/hardened.

**Remediation:**

- Run git in hardened sandbox/container with no host secrets.
- Set `GIT_TERMINAL_PROMPT=0`, disable hooks (`core.hooksPath=/dev/null` or equivalent), restrict protocols.
- Use allowlisted git commands/args and strict repo path validation.
- Separate audit records from actual git outcomes; do not fake successful operations.

**Verification:**

- Git hooks/config injection files cannot execute.
- Git operations constrained to authorized workspace.

**Regression Test:**

- Tests for path validation, hook disabling, and command allowlisting.

---

### Finding ID: MV-SEC-015

**Title:** Missing baseline security headers and browser hardening controls  
**Severity:** Low  
**Confidence:** Likely  
**CVSS 4.0:** 3.7 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-693 Protection Mechanism Failure  
**OWASP Category:** A02:2025 Security Misconfiguration  
**ASVS Requirement:** V3.5 Browser security controls, V14.4 HTTP security headers  
**Affected Component:** Next.js config/layout  
**Affected File:** `next.config.ts`, `src/app/layout.tsx`  
**Affected Endpoint:** All web responses

**Description:**

No explicit CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protections, or cross-origin isolation policies are configured in `next.config.ts`. Presence/absence at deployment edge is unknown.

**Evidence:**

`next.config.ts` only sets cache/turbopack options; no `headers()` security configuration.

**Attack Preconditions:**

- Browser-rendered vulnerability or malicious embedding context.

**Attack Scenario:**

1. XSS or clickjacking-prone page exists.
2. Missing browser hardening increases exploit impact.

**Impact:**

Increased impact of client-side attacks.

**Reproduction:**

Safe local/staging only:
1. Run app and inspect response headers.
2. Confirm absence/misconfiguration of baseline security headers.

**Remediation:**

- Add strict CSP (nonce/hash strategy), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`/`X-Frame-Options` as appropriate, HSTS in production HTTPS.

**Verification:**

- Security header scan confirms expected policies.

**Regression Test:**

- Automated header checks in CI/e2e.

---

### Finding ID: MV-SEC-016

**Title:** Verbose internal error details returned to clients in multiple routes  
**Severity:** Low  
**Confidence:** Confirmed  
**CVSS 4.0:** 3.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-209 Generation of Error Message Containing Sensitive Information  
**OWASP Category:** A02:2025 Security Misconfiguration  
**ASVS Requirement:** V16.5 Error handling  
**Affected Component:** API error handling  
**Affected File:** `src/app/api/projects/route.ts`, `src/app/api/projects/upload/route.ts`, `src/app/api/executions/route.ts`, others  
**Affected Endpoint:** Multiple

**Description:**

Several handlers return `err.message` directly to clients. Internal messages may reveal filesystem paths, schema details, or library behavior.

**Evidence:**

Examples: `return NextResponse.json({ error: err.message }, { status: 500 })` in projects/executions; upload returns `error.message || "Failed..."`.

**Attack Preconditions:**

- Attacker can trigger errors.

**Attack Scenario:**

1. Attacker submits malformed or edge-case requests.
2. API returns internal error message.
3. Attacker uses details for targeted follow-up.

**Impact:**

Information disclosure aiding reconnaissance.

**Reproduction:**

Safe local/staging only: trigger controlled errors and inspect responses.

**Remediation:**

- Return generic client-safe error codes/messages; log detailed error server-side with correlation ID.

**Verification:**

- 4xx/5xx responses contain no stack/path/internal library messages.

**Regression Test:**

- Error-response snapshot tests.

---

### Finding ID: MV-SEC-017

**Title:** Insufficient input validation on several endpoints outside shared Zod schemas  
**Severity:** Low  
**Confidence:** Confirmed  
**CVSS 4.0:** 4.8 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:L/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-20 Improper Input Validation  
**OWASP Category:** A05:2025 Injection  
**ASVS Requirement:** V5.1 Input validation  
**Affected Component:** Multiple API routes  
**Affected File:** `src/app/api/projects/route.ts`, `src/app/api/projects/upload/route.ts`, `src/app/api/notifications/[id]/route.ts`, `src/app/api/orchestrator/plan/route.ts`  
**Affected Endpoint:** Multiple

**Description:**

Some routes parse JSON/form data without centralized schema validation. Fields like `workspaceId`, `name`, `repositoryUrl`, `isRead`, `prompt`, and upload metadata lack strict type/length/format constraints and ownership checks.

**Evidence:**

Projects route reads body and uses fields directly; notifications PATCH takes `isRead` without schema; orchestrator plan takes `prompt` with no max length/rate/context checks.

**Attack Preconditions:**

- Attacker can call endpoints.

**Attack Scenario:**

1. Submit oversized/malformed/unexpected types.
2. Trigger logic inconsistencies, resource consumption, or downstream unsafe behavior.

**Impact:**

Input abuse, potential DoS, data integrity issues.

**Reproduction:**

Safe local/staging only: send malformed/oversized payloads and observe validation behavior.

**Remediation:**

- Use Zod/Valibot schemas for all inputs (body, query, params, formData).
- Enforce max lengths, enums, formats, and allowlists.

**Verification:**

- Invalid inputs receive 400/422 with safe messages.

**Regression Test:**

- Schema validation unit/integration tests per route.

---

### Finding ID: MV-SEC-018

**Title:** Dependency and supply-chain security posture not continuously verified in CI  
**Severity:** Low  
**Confidence:** Likely  
**CVSS 4.0:** 3.9 (`CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-1395 Dependency on Vulnerable Third-Party Component; CWE-1104 Use of Unmaintained Third Party Components  
**OWASP Category:** A03:2025 Software Supply Chain Failures  
**ASVS Requirement:** V15.2 Security of third-party components  
**Affected Component:** Dependency management / CI  
**Affected File:** `package.json`, `package-lock.json`, absence of `.github/workflows`  
**Affected Endpoint:** Build/runtime supply chain

**Description:**

The repo contains dependency manifests/lockfile but no visible CI workflows for SAST/SCA/secret scanning/SBOM/provenance. Automated vulnerability scanning was not executed in this session; therefore dependency risk is currently unverified.

**Evidence:**

`package.json` includes many dependencies; no `.github` directory observed in root listing. No security scan scripts beyond lint/build/smoke.

**Attack Preconditions:**

- Vulnerable dependency or compromised package introduced.

**Attack Scenario:**

1. Vulnerable transitive dependency exploited in production.
2. No CI gate detects it before deployment.

**Impact:**

Known-vulnerability exposure, supply-chain compromise risk.

**Reproduction:**

Safe local/staging only: run `npm audit`, OSV-Scanner, SCA in CI; generate SBOM.

**Remediation:**

- Add CI for dependency audit, SAST, secrets, IaC/container scans, SBOM, and Dependabot/Renovate with review.

**Verification:**

- CI blocks high/critical vulnerable dependencies.

**Regression Test:**

- Scheduled and PR-time security pipeline.

---

### Finding ID: MV-SEC-019

**Title:** SQLite/dev DB fallback and Vercel /tmp copy behavior are unsafe for multi-tenant production assumptions  
**Severity:** Informational  
**Confidence:** Confirmed  
**CVSS 4.0:** 0.0 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-1059 Incomplete Documentation / configuration mismatch; CWE-642 External Control of Critical State Data (environmental)  
**OWASP Category:** A02:2025 Security Misconfiguration  
**ASVS Requirement:** V14.1 Build and deploy configuration  
**Affected Component:** Database configuration  
**Affected File:** `src/lib/db.ts`, `prisma/schema.prisma`  
**Affected Endpoint:** All DB-backed endpoints

**Description:**

Schema datasource is SQLite (`provider = "sqlite"`), and db resolver copies bundled `prisma/dev.db` to `/tmp/dev.db` on Vercel and falls back to local file paths. This conflicts with the stated PostgreSQL production architecture and is unsuitable for durable, isolated multi-tenant production.

**Evidence:**

`schema.prisma`: `provider = "sqlite"`, `url = env("DATABASE_URL")`. `db.ts` handles Vercel by copying `prisma/dev.db` to `/tmp/dev.db` and defaults to `file:.../prisma/dev.db`.

**Attack Preconditions:**

- Deployment uses fallback/dev DB behavior.

**Attack Scenario:**

1. App deploys with SQLite fallback in ephemeral filesystem.
2. Data loss, cross-instance inconsistency, or insecure local-file exposure occurs.

**Impact:**

Data integrity/availability risk; security controls relying on PostgreSQL/RLS cannot be assumed.

**Reproduction:**

Inspect config and deploy in staging-like environment without proper DATABASE_URL.

**Remediation:**

- Use managed PostgreSQL in production; fail closed if DATABASE_URL missing/invalid.
- Remove `/tmp/dev.db` fallback for production.
- Align Prisma schema/provider/migrations with actual prod DB.

**Verification:**

- Production boot fails without valid PostgreSQL config.
- Migrations/schema match deployed DB.

**Regression Test:**

- Deployment config tests and startup checks.

---

### Finding ID: MV-SEC-020

**Title:** Execution/workflow routes simulate agent behavior and write synthetic artifacts, creating auditability and trust-boundary ambiguity  
**Severity:** Informational  
**Confidence:** Confirmed  
**CVSS 4.0:** 0.0 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-778 Insufficient Logging; CWE-345 Insufficient Verification of Data Authenticity  
**OWASP Category:** A09:2025 Security Logging and Alerting Failures  
**ASVS Requirement:** V16.1 Security logging  
**Affected Component:** Execution/orchestration APIs  
**Affected File:** `src/app/api/executions/route.ts`, `src/app/api/workflows/execute/route.ts`, `src/app/api/orchestrator/plan/route.ts`  
**Affected Endpoint:** `/api/executions`, `/api/workflows/execute`, `/api/orchestrator/plan`

**Description:**

Execution routes generate synthetic tasks/events/diffs/costs in addition to some real workspace git operations. Simulated artifacts may be mistaken for real agent execution evidence if not clearly labeled and segregated.

**Evidence:**

`executions/route.ts` creates random token/cost values and sample events; creates synthetic diff fallback. `workflows/execute` creates predefined tasks and estimated costs. `orchestrator/plan` estimates tokens/cost heuristically.

**Attack Preconditions:**

- Users/operators rely on execution artifacts for security/approval decisions.

**Attack Scenario:**

1. Operator reviews synthetic "diff/test/approval" artifacts.
2. Trusts execution as verified when it was partially simulated.

**Impact:**

Audit integrity confusion, unsafe approvals, governance risk.

**Reproduction:**

Call endpoints in local environment and inspect returned artifacts/events.

**Remediation:**

- Clearly label simulated vs real artifacts; segregate storage.
- Require cryptographically verifiable execution provenance for real runs.
- Do not auto-generate "verified"/"diff_ready" success signals without real evidence.

**Verification:**

- UI/API distinguishes simulated data; audit logs include provenance.

**Regression Test:**

- Tests asserting synthetic data cannot be marked as verified execution evidence.

---

### Finding ID: MV-SEC-021

**Title:** No evidence of sandbox isolation controls, egress restrictions, or container hardening in repository  
**Severity:** Informational  
**Confidence:** Likely  
**CVSS 4.0:** 0.0 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-653 Improper Isolation or Compartmentalization  
**OWASP Category:** A02:2025 Security Misconfiguration  
**ASVS Requirement:** V15.1 Secure deployment/isolation  
**Affected Component:** Execution infrastructure  
**Affected File:** `src/lib/preview-manager.ts`, repo-wide absence of sandbox IaC/config  
**Affected Endpoint:** Preview/execution infrastructure

**Description:**

The repository contains host-process preview spawning and no visible Docker/Kubernetes/seccomp/AppArmor/firewall/egress policy configuration for agent sandboxes. The stated architecture includes cloud sandbox execution, but implementation evidence in-repo is insufficient.

**Evidence:**

`preview-manager.ts` uses local `spawn`. No Dockerfile/compose/K8s/sandbox policy files found outside node_modules. Package manifests do not show sandbox orchestration deps.

**Attack Preconditions:**

- Multi-tenant workloads run in current host-process model.

**Attack Scenario:**

Malicious project/agent escapes intended boundaries by executing on host.

**Impact:**

High blast radius if deployed as-is.

**Reproduction:**

Repository inspection; validate deployment runtime in staging.

**Remediation:**

- Implement hardened sandbox provider integration with per-tenant isolation, network egress allowlists, resource quotas, ephemeral credentials, and audited teardown.

**Verification:**

- Sandbox penetration tests in authorized disposable environment.

**Regression Test:**

- Infrastructure policy tests and runtime conformance checks.

---

### Finding ID: MV-SEC-022

**Title:** Security testing coverage is incomplete: no automated scanner suite, no dynamic staging tests, no CI security gates evidenced  
**Severity:** Informational  
**Confidence:** Confirmed  
**CVSS 4.0:** 0.0 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-1127 Compilation with Insufficient Warnings or Errors (process analogue) / process gap  
**OWASP Category:** A03:2025 Software Supply Chain Failures; A02:2025 Security Misconfiguration  
**ASVS Requirement:** V1.4 Secure SDLC / verification process  
**Affected Component:** Security assurance process  
**Affected File:** `package.json`, repository root (no `.github/workflows`)  
**Affected Endpoint:** N/A

**Description:**

No CI security workflow is visible. This assessment did not execute a complete SAST/SCA/DAST/secret/SBOM/container scan suite or dynamic staging tests. Therefore, absence of findings in untested areas must not be interpreted as security.

**Evidence:**

Root listing has no `.github`. `package.json` scripts include lint/build/smoke only. This session created docs only; no scanner execution evidence.

**Attack Preconditions:**

- Normal development/release process.

**Attack Scenario:**

Vulnerability ships undetected due to missing automated gates.

**Impact:**

Increased likelihood of regressions and undetected vulnerabilities.

**Reproduction:**

Inspect CI/scripts; attempt to locate security pipeline artifacts.

**Remediation:**

- Add mandatory security CI: SAST, SCA, secret scanning, SBOM, IaC/container scans, DAST baseline on staging, dependency review, unit/integration security tests.

**Verification:**

- CI artifacts show passing required security gates for releases.

**Regression Test:**

- PR checks block merges on critical/high findings.

---

## Additional Confirmed & Likely Findings (Deep Code Review, Dependency Scan & Isolated Dynamic Testing)

The findings below (`MV-SEC-023` through `MV-SEC-031`) were uncovered during full-repository route auditing, `npm audit --json` dependency analysis, and controlled non-destructive dynamic verification (`DT-001`..`DT-013`) against an isolated temporary SQLite copy with synthetic Organization A (`Owner`, `Member`, `Viewer`) and Organization B (`Owner`, `Member`) accounts.

---

### Finding ID: MV-SEC-023

**Title:** Unauthenticated / cross-tenant exposure of execution details and live SSE event streams  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 8.7 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-862 Missing Authorization; CWE-639 Authorization Bypass Through User-Controlled Key  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization, V8.2 General authorization controls, V13.3 Real-time / event stream authorization  
**Affected Component:** Executions Detail API & Real-Time SSE Event Stream  
**Affected File:** `src/app/api/executions/[id]/route.ts`, `src/app/api/executions/[id]/events/route.ts`  
**Affected Endpoint:** `GET /api/executions/[id]`, `GET /api/executions/[id]/events`

**Description:**

Neither `GET /api/executions/[id]` nor the Server-Sent Events endpoint `GET /api/executions/[id]/events` calls `getCurrentUser()` or `requireProjectAccess()`. Any caller who supplies a non-empty `mv_session` cookie (to pass `src/proxy.ts`)—or any authenticated user from another organization—can query any `executionId` (easily obtained via `GET /api/executions` per `MV-SEC-006`) and retrieve the full execution object (`project`, `tasks`, `events`, `artifacts`, `gitOperations`, full `prompt`, and code diffs) as well as subscribe to the SSE event stream.

**Evidence:**

`src/app/api/executions/[id]/route.ts` (lines 4–29):
```ts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        project: true,
        tasks: { orderBy: { orderIndex: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
        artifacts: true,
        gitOperations: true,
      },
    })
    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    return NextResponse.json({ data: execution })
```

`src/app/api/executions/[id]/events/route.ts` (lines 4–36):
```ts
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const execution = await prisma.execution.findUnique({
    where: { id },
    include: { events: { orderBy: { createdAt: "asc" } } },
  })
```

**Attack Preconditions:**

- Target execution exists in the database.
- Attacker knows or enumerates `executionId` (trivial via `MV-SEC-006` `GET /api/executions`).

**Attack Scenario:**

1. Attacker from Organization B calls `GET /api/executions` to list all execution IDs across tenants.
2. Attacker calls `GET /api/executions/exec_synth_a` and `GET /api/executions/exec_synth_a/events`.
3. Server returns Organization A's confidential prompts, git diffs, task outputs, and terminal event payloads without checking project membership.

**Impact:**

Complete cross-tenant disclosure of prompts, repository diffs, execution artifacts, and real-time agent terminal events.

**Reproduction:**

Verified dynamically in `DT-007`:
1. Seed `exec_synth_a` in `proj_synth_a` (`ws_synth_a`, Organization A) with prompt `CONFIDENTIAL_PROMPT_ORG_A` and SSE event payload `{"secret":"ORG_A_STREAM_DATA"}`.
2. Authenticate as Organization B owner (`dave.owner@orgb.local`).
3. Request `GET /api/executions/exec_synth_a` -> observed `HTTP 200` with `prompt: "CONFIDENTIAL_PROMPT_ORG_A"`.
4. Request `GET /api/executions/exec_synth_a/events` -> observed `HTTP 200` SSE stream containing `ORG_A_STREAM_DATA`.

**Remediation:**

- Authenticate the caller with `getCurrentUser()` (reject with `401` if null).
- Load `execution.projectId` and enforce `await requireProjectAccess(execution.projectId, user.id, "viewer")` before returning execution data or opening the `ReadableStream`.
- Redact sensitive environment variables and secret patterns from `AgentEvent.payloadJson` and `ExecutionArtifact.content` before persistence and streaming.

**Verification:**

- Cross-tenant and unauthenticated requests to `/api/executions/[id]` and `/api/executions/[id]/events` return `401` or `403`.

**Regression Test:**

- Automated BOLA test asserting Organization B users receive `403` on Organization A's `/api/executions/[id]` and `/api/executions/[id]/events`.

---

### Finding ID: MV-SEC-024

**Title:** Unscoped organization directory endpoint leaks all tenants' users and bcrypt `passwordHash` fields, and allows unauthorized organization creation  
**Severity:** Critical  
**Confidence:** Confirmed  
**CVSS 4.0:** 9.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-200 Exposure of Sensitive Information to an Unauthorized Actor; CWE-862 Missing Authorization; CWE-359 Exposure of Private Personal Information  
**OWASP Category:** A01:2025 Broken Access Control; A04:2025 Cryptographic Failures  
**ASVS Requirement:** V4.1 General access control, V4.2 Operation-level authorization, V2.1 Password storage protection  
**Affected Component:** Organizations API  
**Affected File:** `src/app/api/organizations/route.ts`  
**Affected Endpoint:** `GET /api/organizations`, `POST /api/organizations`

**Description:**

`GET /api/organizations` performs no authentication or tenant filtering and queries `prisma.organization.findMany` with `include: { workspaces: true, memberships: { include: { user: true } } }`. Because `include: { user: true }` selects every column on the `User` model, the JSON response returns **every organization in the database**, every member's email address, and every member's bcrypt **`passwordHash`** (including `user_demo_001` whose password in `prisma/seed.js` is `"password"`). Furthermore, `POST /api/organizations` performs no authentication and allows any caller to create arbitrary organizations and default workspaces.

**Evidence:**

`src/app/api/organizations/route.ts` (lines 4–20):
```ts
export async function GET() {
  try {
    const orgs = await prisma.organization.findMany({
      include: {
        workspaces: true,
        memberships: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({ data: orgs })
```

**Attack Preconditions:**

- Caller passes any non-empty `mv_session` cookie (to pass `src/proxy.ts`) or uses any low-privileged account.

**Attack Scenario:**

1. Attacker sends `GET /api/organizations` with `Cookie: mv_session=1`.
2. Server returns all organizations, workspace IDs (enabling `MV-SEC-002` project enumeration), user IDs (enabling `MV-SEC-008` offline token forgery for any user), user email addresses, and bcrypt `passwordHash` values for offline cracking.

**Impact:**

Full cross-tenant user directory and password-hash dump; immediate account takeover when chained with weak passwords (e.g., seeded `"password"`) or default `AUTH_SECRET` token forgery (`MV-SEC-008`).

**Reproduction:**

Verified dynamically in `DT-010`:
1. Request `GET /api/organizations` as Organization B user (or with dummy cookie `mv_session=1`).
2. Observed `HTTP 200` returning all `8` organizations in the test DB, `11` member email entries, and `exposesPasswordHashField: true` (`m.user.passwordHash` populated with `$2b$10$...` hashes).

**Remediation:**

- Require strict authentication (`getCurrentUser()`) on `GET` and `POST /api/organizations`.
- Filter `prisma.organization.findMany` by `where: { memberships: { some: { userId: user.id } } }`.
- Never use `include: { user: true }`; always use `select: { id: true, name: true, email: true, image: true }` so `passwordHash` can never be serialized.
- When creating an organization in `POST /api/organizations`, bind the authenticated user as `owner` in `memberships.create`.

**Verification:**

- `GET /api/organizations` returns only organizations where the authenticated user is a member, and `passwordHash` is absent from all nested user objects.

**Regression Test:**

- Integration test asserting `JSON.stringify(response).includes("passwordHash") === false` and Organization B cannot see Organization A in `GET /api/organizations`.

---

### Finding ID: MV-SEC-025

**Title:** Missing ownership check and negative-cost injection on `POST /api/api-usage`, plus unverified foreign keys on `/api/billing` and `/api/subscriptions`  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 8.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-639 Authorization Bypass Through User-Controlled Key; CWE-20 Improper Input Validation; CWE-840 Business Logic Errors  
**OWASP Category:** A01:2025 Broken Access Control; A06:2025 Insecure Design  
**ASVS Requirement:** V4.2 Operation-level authorization, V5.1 Input validation, V8.3 Business logic data integrity  
**Affected Component:** Resource Intelligence — API Usage, Billing & Subscription APIs  
**Affected File:** `src/app/api/api-usage/route.ts`, `src/app/api/billing/route.ts`, `src/app/api/subscriptions/[id]/route.ts`  
**Affected Endpoint:** `POST /api/api-usage`, `POST /api/billing`, `PUT/PATCH /api/subscriptions/[id]`

**Description:**

In `POST /api/api-usage`, the handler calls `getCurrentUserOrDefault()` but **never verifies that `body.apiAccountId` belongs to `user.id`**, and **never validates that `cost`, `inputTokens`, `outputTokens`, or `totalTokens` are non-negative finite numbers**. It immediately creates an `ApiUsageRecord` on the target `apiAccountId` and executes:
```ts
if (cost) {
  await prisma.apiAccount.update({
    where: { id: apiAccountId },
    data: {
      totalSpent: { increment: cost },
      prepaidBalance: { decrement: cost },
    },
  })
}
```
An attacker can pass another tenant's `apiAccountId` to corrupt their usage ledger and drain or inflate their `prepaidBalance`, or pass a negative `cost` (e.g., `-9000`) to inflate `prepaidBalance` (`decrement: -9000` adds `9000`) and reduce `totalSpent`. Similarly, `POST /api/billing` accepts an arbitrary `subscriptionId` without verifying that the subscription belongs to `user.id`, and `PUT/PATCH /api/subscriptions/[id]` and `PUT /api/api-accounts/[id]` accept negative prices, negative usage counters, and arbitrary `prepaidBalance`/`totalSpent` overrides.

**Evidence:**

`src/app/api/api-usage/route.ts` (lines 52–105):
```ts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserOrDefault()
    const body = await request.json()
    const { apiAccountId, date, model, inputTokens, outputTokens, cachedTokens, totalTokens, cost, currency, requestCount, dataSource } = body
    if (!apiAccountId) {
      return NextResponse.json({ data: null, error: "apiAccountId is required" }, { status: 400 })
    }
    const computedTotal = totalTokens ?? ((inputTokens || 0) + (outputTokens || 0))
    const record = await prisma.apiUsageRecord.create({ data: { apiAccountId, ... } })
    if (cost) {
      await prisma.apiAccount.update({
        where: { id: apiAccountId },
        data: {
          totalSpent: { increment: cost },
          prepaidBalance: { decrement: cost },
        },
      })
    }
```

**Attack Preconditions:**

- Attacker is authenticated (or uses dummy cookie fallback) and knows or guesses target `apiAccountId` (e.g., `api_001`..`api_004` in seeded environments).

**Attack Scenario:**

1. Attacker from Organization B sends `POST /api/api-usage` with `apiAccountId: "api_synth_a1"` and `cost: -9000` (or `+50000`).
2. Server inserts a forged usage record into Organization A's API account and mutates Organization A's `prepaidBalance` and `totalSpent`.

**Impact:**

Cross-tenant financial ledger corruption, budget/quota bypass, and arbitrary manipulation of prepaid balances and spend analytics.

**Reproduction:**

Verified dynamically in `DT-011`:
1. Organization A's `api_synth_a1` starts with `prepaidBalance: 500`, `totalSpent: 10`.
2. Organization B owner sends `POST /api/api-usage` with `{"apiAccountId":"api_synth_a1","cost":-9000}`.
3. Observed `HTTP 201`; Organization A's `api_synth_a1` balance became `prepaidBalance: 9500` and `totalSpent: -8990`.

**Remediation:**

- Verify ownership before creating usage records: `const account = await prisma.apiAccount.findFirst({ where: { id: apiAccountId, userId: user.id } })`; return `404` if not found.
- In `POST /api/billing`, if `subscriptionId` is provided, verify `prisma.subscription.findFirst({ where: { id: subscriptionId, userId: user.id } })`.
- Enforce strict Zod schemas requiring non-negative finite numbers (`z.number().finite().nonnegative()`) for `cost`, `amount`, `price`, `inputTokens`, `outputTokens`, `cachedTokens`, `totalTokens`, `usedMessages`, `usedTokens`, `usedRequests`, and `usedCredits`.

**Verification:**

- Cross-user `apiAccountId` or `subscriptionId` returns `404`.
- Negative `cost`, `amount`, or token values return `422`.

**Regression Test:**

- Integration tests for cross-tenant `apiAccountId` rejection and negative `cost` validation on `/api/api-usage`.

---

### Finding ID: MV-SEC-026

**Title:** Cross-execution review comment manipulation (IDOR) and missing authorization on workflow catalog & orchestrator planning  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 7.5 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-639 Authorization Bypass Through User-Controlled Key; CWE-862 Missing Authorization  
**OWASP Category:** A01:2025 Broken Access Control  
**ASVS Requirement:** V4.2 Operation-level authorization  
**Affected Component:** Execution Review Comments, Workflow Catalog & Orchestrator Plan APIs  
**Affected File:** `src/app/api/executions/[id]/comments/route.ts`, `src/app/api/workflows/route.ts`, `src/app/api/workflows/execute/route.ts`, `src/app/api/orchestrator/plan/route.ts`  
**Affected Endpoint:** `POST/PATCH /api/executions/[id]/comments`, `GET/POST /api/workflows`, `POST /api/workflows/execute`, `POST /api/orchestrator/plan`

**Description:**

Multiple object-level and role-level authorization flaws exist across the orchestration and review endpoints:
1. **Cross-execution comment IDOR (`PATCH /api/executions/[id]/comments`):** `assertExecutionAccess(id)` checks `viewer` access on the URL's `[id]` parameter, but the subsequent update runs `prisma.reviewComment.update({ where: { id: commentId }, data: { status } })` **without scoping by `executionId: id`** and while requiring only `"viewer"` role. An attacker with viewer access to any execution in their own org can pass a `commentId` belonging to another tenant's execution and mark their security/code review comments `"resolved"`. Similarly, `POST /api/executions/[id]/comments` allows `"viewer"` role to create comments and inject `"review_comment"` events.
2. **Global workflow catalog modification (`GET/POST /api/workflows`):** Performs no authentication or workspace scoping; any caller can list all workflows across tenants or inject new `WorkflowDefinition` rows with arbitrary `nodesJson`/`edgesJson` into the global catalog.
3. **Fallback to `prisma.project.findFirst()` when `projectId` is omitted:** In `POST /api/orchestrator/plan` (no authentication at all), `GET/POST /api/git`, and `POST /api/workflows/execute`, omitting `projectId` queries `prisma.project.findFirst()`. In `POST /api/orchestrator/plan`, this leaks the first project's name without any access check.

**Evidence:**

`src/app/api/executions/[id]/comments/route.ts` (lines 91–109):
```ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!(await assertExecutionAccess(id))) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 })
    }
    const parsed = await parseJson(req, commentPatchSchema)
    if ("response" in parsed) return parsed.response
    const { commentId, status } = parsed.data

    const updated = await prisma.reviewComment.update({
      where: { id: commentId },
      data: { status: status || "resolved" },
    })
```

**Attack Preconditions:**

- Attacker has viewer access to at least one project/execution (e.g., their own default organization created at registration) and knows/enumerates a target `commentId`.

**Attack Scenario:**

1. Attacker from Organization B calls `PATCH /api/executions/exec_synth_b/comments` (where `exec_synth_b` belongs to Organization B) with `{"commentId": "cmt_synth_a1", "status": "resolved"}`.
2. `assertExecutionAccess("exec_synth_b")` succeeds for Organization B.
3. `prisma.reviewComment.update` updates Organization A's comment `cmt_synth_a1` on `exec_synth_a` to `"resolved"`.

**Impact:**

Cross-tenant tampering of code/security review comments; pollution of global workflow definitions; unauthorized read of project metadata via `/api/orchestrator/plan`.

**Reproduction:**

Verified dynamically in `DT-008`:
1. Seed `cmt_synth_a1` (`status: "open"`) on Organization A's `exec_synth_a`.
2. Authenticate as Organization B owner and call `PATCH /api/executions/exec_synth_b/comments` with `{"commentId":"cmt_synth_a1","status":"resolved"}`.
3. Observed `HTTP 200` with `updatedCommentExecutionId: "exec_synth_a"` and `newStatus: "resolved"`.

**Remediation:**

- In `PATCH /api/executions/[id]/comments`, require `"member"` role and scope the update by `{ id: commentId, executionId: id }` (`updateMany` + count check).
- In `POST /api/executions/[id]/comments`, require `"member"` role and bind `authorName` to the authenticated user's name/email rather than arbitrary client input.
- Require authentication and workspace membership on `GET/POST /api/workflows` and `POST /api/orchestrator/plan`; remove all `prisma.project.findFirst()` fallbacks when `projectId` is missing.

**Verification:**

- Cross-execution `commentId` updates return `404`.
- Unauthenticated or cross-workspace `/api/workflows` and `/api/orchestrator/plan` requests return `401`/`403`.

**Regression Test:**

- Integration test asserting `PATCH /api/executions/exec_B/comments` with `commentId` from `exec_A` returns `404` and leaves `cmt_A` unchanged.

---

### Finding ID: MV-SEC-027

**Title:** Silent `prisma.project.findFirst()` fallback on non-existent project ID and server filesystem path disclosure in `/api/projects/[id]/files`  
**Severity:** Medium  
**Confidence:** Confirmed  
**CVSS 4.0:** 5.3 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-636 Not Failing Securely ('Failing Open'); CWE-200 Exposure of Sensitive Information  
**OWASP Category:** A01:2025 Broken Access Control; A02:2025 Security Misconfiguration  
**ASVS Requirement:** V4.1 Fail-secure access control, V16.5 Error/path disclosure  
**Affected Component:** Project Files API  
**Affected File:** `src/app/api/projects/[id]/files/route.ts`  
**Affected Endpoint:** `GET /api/projects/[id]/files`

**Description:**

In `GET /api/projects/[id]/files`, if `prisma.project.findUnique({ where: { id } })` returns `null`, lines 239–245 silently fall back to `project = await prisma.project.findFirst({ include: { sources: true } })` instead of returning `404 Not Found`. Additionally, when a project has an extracted workspace, line 290 returns `workspacePath: source.sourcePath` (an absolute host filesystem path such as `C:\Users\...\data\projects\<id>`) in the client JSON response.

**Evidence:**

`src/app/api/projects/[id]/files/route.ts` (lines 232–245 and 283–292):
```ts
    let project = await prisma.project.findUnique({
      where: { id },
      include: { sources: true },
    })

    if (!project) {
      project = await prisma.project.findFirst({
        include: { sources: true },
      })
    }
...
      return NextResponse.json({
        data: {
          projectId: project.id,
          projectName: project.name,
          branch: project.defaultBranch,
          tree,
          allFiles,
          workspacePath: source.sourcePath,
        },
      })
```

**Attack Preconditions:**

- Caller has viewer access to the first project in the DB (or uses an invalid cookie triggering the `user_demo_001` fallback, who owns `proj_fintech_001`).

**Attack Scenario:**

1. Caller requests `GET /api/projects/nonexistent_id_999/files` with a dummy cookie.
2. Instead of `404`, the endpoint silently loads `proj_fintech_001` and returns its file tree and host `workspacePath`.

**Impact:**

Fail-open object resolution masking invalid project IDs and leaking absolute host filesystem paths (`workspacePath`) to clients.

**Reproduction:**

Verified dynamically in `DT-012`:
1. Request `GET /api/projects/nonexistent_id_999/files` with `Cookie: mv_session=dummy`.
2. Observed `HTTP 200` returning `projectId: "proj_fintech_001"`.

**Remediation:**

- Delete the `if (!project) { project = await prisma.project.findFirst(...) }` fallback; immediately return `404` when `findUnique` returns `null`.
- Remove `workspacePath: source.sourcePath` from the JSON response.

**Verification:**

- `GET /api/projects/nonexistent_id_999/files` returns `404`.
- Response payload does not include `workspacePath`.

**Regression Test:**

- API test asserting `404` on unknown project IDs and absence of `workspacePath` in `/api/projects/[id]/files`.

---

### Finding ID: MV-SEC-028

**Title:** GitHub OAuth lacks CSRF `state` parameter / PKCE and links accounts solely by unverified GitHub profile email  
**Severity:** High  
**Confidence:** Confirmed  
**CVSS 4.0:** 7.7 (`CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:A/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-352 Cross-Site Request Forgery (OAuth login CSRF); CWE-287 Improper Authentication; CWE-346 Origin Validation Error  
**OWASP Category:** A07:2025 Authentication Failures  
**ASVS Requirement:** V2.10 OAuth / OpenID Connect client security, V3.5 CSRF protection  
**Affected Component:** GitHub OAuth Authentication  
**Affected File:** `src/app/api/auth/github/route.ts`, `src/app/api/auth/github/callback/route.ts`  
**Affected Endpoint:** `GET /api/auth/github`, `GET /api/auth/github/callback`

**Description:**

The GitHub OAuth implementation has three security flaws:
1. **Missing OAuth `state` parameter and PKCE:** `GET /api/auth/github` redirects to `https://github.com/login/oauth/authorize` with only `client_id`, `redirect_uri`, and `scope` (`"read:user user:email repo"`), omitting a cryptographically random `state` parameter bound to an `HttpOnly` cookie and omitting PKCE (`code_challenge`). `GET /api/auth/github/callback` exchanges `code` without verifying any `state`. This enables OAuth login CSRF (forcing a victim browser to sign into the attacker's GitHub-linked MODELVAULT account).
2. **Pre-account takeover / unverified email linking:** In `callback/route.ts` (lines 38–49), the handler prefers `githubUser.email` (the public GitHub profile email field, which is not guaranteed to be verified by GitHub in all edge cases or enterprise configs) before falling back to `/user/emails`, and then links directly to any existing `User` via `prisma.user.findUnique({ where: { email } })` without checking whether the existing password-based user has verified their email or authorized GitHub account linking.
3. **Excessive OAuth scope:** Requests `repo` (full read/write access to all public and private repositories) merely for user sign-in, even though the access token is immediately discarded and never stored.

**Evidence:**

`src/app/api/auth/github/route.ts` (lines 12–16):
```ts
  const redirectUri = `${req.nextUrl.origin}/api/auth/github/callback`
  const scope = "read:user user:email repo"
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`
  return NextResponse.redirect(url)
```

`src/app/api/auth/github/callback/route.ts` (lines 38–49):
```ts
    const email =
      githubUser.email ||
      (await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      })
        .then((r) => r.json())
        .then((emails: Array<{ email: string; primary: boolean; verified: boolean }>) =>
          emails.find((e) => e.primary && e.verified)?.email
        )) ||
      `${githubUser.login}@github.local`

    let user = await prisma.user.findUnique({ where: { email } })
```

**Attack Preconditions:**

- `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are configured in the deployed environment.

**Attack Scenario:**

1. Attacker initiates GitHub OAuth flow, intercepts their own callback `?code=...`, and embeds `/api/auth/github/callback?code=...` in a link/page visited by a victim developer.
2. Victim's browser follows the link and is silently logged into the attacker's MODELVAULT session, where the victim may enter sensitive API keys or upload proprietary source code.

**Impact:**

OAuth login CSRF (session swapping to capture victim-uploaded source code or API keys), potential account-linking hijack, and over-privileged GitHub `repo` token exposure during auth.

**Reproduction:**

Code inspection confirmed (`src/app/api/auth/github/route.ts` lines 12–16 and `callback/route.ts` lines 8–49): neither `state` nor `code_verifier` exists anywhere in the flow.

**Remediation:**

- Generate a 32-byte random `state` and PKCE `code_verifier`, store them in a short-lived `HttpOnly`, `SameSite=Lax`, `Secure` cookie, and verify `state` in `/api/auth/github/callback` using `crypto.timingSafeEqual`.
- Reduce sign-in OAuth scope to `"read:user user:email"`; request repository access separately via a dedicated GitHub App installation flow.
- Always fetch `/user/emails` and only accept an email entry where `e.verified === true && e.primary === true`; require explicit user confirmation before linking an OAuth identity to an existing unverified password account.

**Verification:**

- Callback requests missing or mismatching `state` are rejected with `400`/`403`.
- Only verified GitHub emails from `/user/emails` are accepted.

**Regression Test:**

- Unit/integration tests for OAuth `state` validation and rejection of unverified emails.

---

### Finding ID: MV-SEC-029

**Title:** Potential `RangeError` crash in `verifySession` on malformed signature length and unvalidated `javascript:` URI storage in `actionUrl` / `invoiceUrl`  
**Severity:** Low  
**Confidence:** Confirmed  
**CVSS 4.0:** 4.8 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:P/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-20 Improper Input Validation; CWE-79 Cross-site Scripting (stored URI scheme risk)  
**OWASP Category:** A05:2025 Injection  
**ASVS Requirement:** V3.3 Session token parsing, V5.1 URL scheme validation  
**Affected Component:** Session verification (`src/lib/auth.ts`), Notifications (`actionUrl`), Billing (`invoiceUrl`)  
**Affected File:** `src/lib/auth.ts`, `src/app/api/notifications/route.ts`, `src/app/api/billing/route.ts`  
**Affected Endpoint:** `POST /api/notifications`, `POST /api/billing`, `verifySession()` callers

**Description:**

1. **`crypto.timingSafeEqual` buffer length mismatch:** In `src/lib/auth.ts` line 41, `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))` is called without first checking that both `Buffer` instances have equal byte lengths. In Node.js, `crypto.timingSafeEqual` throws `RangeError: Input buffers must have the same byte length` when lengths differ. Although `getCurrentUser()` catches the exception and returns `null`, direct callers of `verifySession(token)` will encounter an unhandled `RangeError` exception on any malformed cookie signature.
2. **Unvalidated URL schemes in `Notification.actionUrl` and `BillingRecord.invoiceUrl`:** `POST /api/notifications` stores arbitrary `actionUrl` strings and `POST /api/billing` stores arbitrary `invoiceUrl` strings in the database without checking that the URL uses `https:`/`http:` or a safe relative path (`/...`). While the current UI does not render `actionUrl` or `invoiceUrl` inside `<a href={...}>`, storing unvalidated `javascript:` or `data:` URIs creates a latent stored-XSS trap as soon as any UI component renders those fields as links.
3. **Un-sandboxed preview `<iframe>`:** In `src/app/(dashboard)/studio/page.tsx` lines 572–578, `<iframe src={previewUrl} ... />` is rendered without a `sandbox` attribute and served from the same origin (`/api/projects/[id]/preview/proxy`), meaning any script executed inside a proxied HTML preview runs in the MODELVAULT origin context with full access to same-origin APIs and cookies.

**Evidence:**

`src/lib/auth.ts` (lines 41–43):
```ts
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null
  }
```

`src/app/(dashboard)/studio/page.tsx` (lines 572–578):
```tsx
  <iframe
    key={previewFrameKey}
    src={previewUrl}
    title="Live project preview"
    className="h-full w-full border-0"
    allow="clipboard-read; clipboard-write; fullscreen"
  />
```

**Attack Preconditions:**

- For preview iframe origin sharing: preview proxy returns HTML/JS from a project workspace and victim views it in `/studio`.

**Attack Scenario:**

1. Malicious project preview serves HTML containing `<script>fetch('/api/integrations', ...)</script>`.
2. Victim opens `/studio` preview; because `/api/projects/[id]/preview/proxy` is on the same origin as MODELVAULT and the `<iframe>` has no `sandbox` attribute, the preview script executes in MODELVAULT's origin.

**Impact:**

Same-origin script execution from preview content inside `/studio`; latent stored-XSS via `actionUrl`/`invoiceUrl`; unhandled `RangeError` if `verifySession` is invoked outside `getCurrentUser()`.

**Reproduction:**

Inspect `src/lib/auth.ts:41`, `src/app/(dashboard)/studio/page.tsx:572-578`, `src/app/api/notifications/route.ts:53`, and `src/app/api/billing/route.ts:75`.

**Remediation:**

- In `verifySession()`, compare byte lengths (`const sigBuf = Buffer.from(signature); const expBuf = Buffer.from(expected); if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null`).
- Add `sandbox="allow-scripts allow-forms"` (explicitly omitting `allow-same-origin`) on the preview `<iframe>` in `/studio`, and serve previews from a separate isolated subdomain (`*.preview.modelvault.run`).
- Validate `actionUrl` and `invoiceUrl` with Zod to allow only `https://` URLs or `/`-prefixed relative paths.

**Verification:**

- `verifySession("a.b")` returns `null` without throwing `RangeError`.
- Preview iframe cannot access `window.parent` or same-origin `document.cookie` / `/api/*` endpoints.

**Regression Test:**

- Unit test calling `verifySession("short.sig")` and asserting `null` return value; unit test rejecting `javascript:alert(1)` in `actionUrl`/`invoiceUrl`.

---

### Finding ID: MV-SEC-030

**Title:** Verification Engine (`/verify`) performs client-side-only regex checks and `POST /api/executions/[id]/approve` lacks commit/diff digest binding and state-machine enforcement  
**Severity:** Medium  
**Confidence:** Confirmed  
**CVSS 4.0:** 6.4 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:N/VI:H/VA:N/SC:N/SI:N/SA:N`)  
**CWE:** CWE-602 Client-Side Enforcement of Server-Side Security; CWE-345 Insufficient Verification of Data Authenticity; CWE-367 Time-of-check Time-of-use (TOCTOU)  
**OWASP Category:** A06:2025 Insecure Design; A08:2025 Software or Data Integrity Failures  
**ASVS Requirement:** V4.2 Operation-level authorization, V10.2 Malicious code / integrity verification, V16.1 Non-repudiation  
**Affected Component:** MODELVAULT Verify (`src/app/(dashboard)/verify/page.tsx`) & Execution Approval API (`src/app/api/executions/[id]/approve/route.ts`)  
**Affected File:** `src/app/(dashboard)/verify/page.tsx`, `src/app/api/executions/[id]/approve/route.ts`  
**Affected Endpoint:** `POST /api/executions/[id]/approve`

**Description:**

Auditing the Verification Engine (Section 14 & 15) revealed two architectural integrity weaknesses:
1. **Client-side-only lexical security scanning:** All security findings shown in `/verify` (`MV-SQL-001`, `MV-XSS-002`, `MV-EXEC-003`, `MV-SEC-004`, `MV-CRYPTO-005`) are computed solely in browser JavaScript (`inspectExecution(execution)` in `src/app/(dashboard)/verify/page.tsx` lines 66–137) by running 5 regular expressions against `+` lines of the first `git_diff` artifact. No server-side scanner runs, no findings are persisted in the database, and the backend does not block approval when critical findings exist.
2. **Unbound approval & missing state-machine check (`POST /api/executions/[id]/approve`):** The approval endpoint accepts `{ action: "approve" | "reject" | "request_revision", feedback }` without binding the approval to a specific commit SHA, diff SHA-256 digest, or scanner ruleset version. It also does not verify that `execution.status === "awaiting_approval"` (allowing re-approval of already-cancelled or failed executions) and allows any `"member"` (including the same user who triggered the execution) to self-approve without separation of duties. Finally, approving an execution only updates `GitOperation.status` in SQLite to `"committed"` without performing an atomic Git merge bound to the reviewed commit.

**Evidence:**

`src/app/api/executions/[id]/approve/route.ts` (lines 33–43):
```ts
    let nextStatus = "completed"
    if (action === "reject") nextStatus = "cancelled"
    else if (action === "request_revision") nextStatus = "running"

    const updated = await prisma.execution.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date() : null,
      },
    })
```

**Attack Preconditions:**

- User has `"member"` access to the project.

**Attack Scenario:**

1. An execution produces a diff containing a critical vulnerability or is modified concurrently in the workspace.
2. Any project member calls `POST /api/executions/[id]/approve` directly with `{"action":"approve"}`, bypassing UI warnings, or approves while the underlying workspace branch has changed since the diff artifact was captured.

**Impact:**

Loss of approval non-repudiation, TOCTOU mismatch between reviewed diff and approved state, self-approval of unverified changes, and ability to approve executions with critical security findings.

**Reproduction:**

Inspect `src/app/(dashboard)/verify/page.tsx:66-137` and `src/app/api/executions/[id]/approve/route.ts:18-63`.

**Remediation:**

- Execute verification scans server-side inside an isolated worker, persist immutable `VerificationReport` records bound to `(executionId, commitSha, diffSha256, scannerVersion, rulesetHash)`, and block `"approve"` on the backend when unresolved critical findings exist (unless an explicit owner override with audit justification is recorded).
- Require `expectedCommitSha` and `expectedDiffHash` in `approvalSchema`; reject the approval with `409 Conflict` if the execution is not in `"awaiting_approval"` status or if the artifact/commit digest has changed.
- Require `"admin"` or `"owner"` role (and disallow self-approval where separation of duties is enabled) for production branch approvals.

**Verification:**

- `POST /api/executions/[id]/approve` fails with `409` if `status !== "awaiting_approval"` or if `expectedDiffHash` does not match the stored artifact SHA-256.

**Regression Test:**

- Integration test verifying that changing the artifact or omitting `expectedDiffHash` causes `POST /api/executions/[id]/approve` to reject with `409`/`422`.

---

### Finding ID: MV-SEC-031

**Title:** Confirmed vulnerable transitive dependencies (`dompurify <=3.4.16` XSS via `monaco-editor`, `deepmerge-ts` stack exhaustion, `effect` ReDoS via `prisma`) and `.env` / `AUTH_SECRET` variable mismatch  
**Severity:** Medium  
**Confidence:** Confirmed  
**CVSS 4.0:** 6.6 (`CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:P/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N`)  
**CWE:** CWE-1395 Dependency on Vulnerable Third-Party Component; CWE-79 Cross-site Scripting; CWE-1333 Inefficient Regular Expression Complexity  
**OWASP Category:** A03:2025 Software Supply Chain Failures; A02:2025 Security Misconfiguration  
**ASVS Requirement:** V15.2 Third-party component security, V14.1 Configuration consistency  
**Affected Component:** NPM Dependencies (`package-lock.json`) & Environment Configuration (`.env` vs `src/lib/auth.ts`)  
**Affected File:** `package-lock.json`, `package.json`, `.env`, `src/lib/auth.ts`  
**Affected Endpoint:** Client IDE surfaces using `monaco-editor` (`/studio`, `/agents`); build/CLI tooling (`prisma`); session signing (`src/lib/auth.ts`)

**Description:**

1. **`npm audit --json` findings (6 total: 4 High, 2 Low):**
   - **`dompurify <= 3.4.16` (via `monaco-editor 0.56.0-dev-20260113 - 0.57.0`, Low, `fixAvailable: true`):** Affected by 5 advisories (`GHSA-p98j-92pf-mc4p`, `GHSA-6688-9rhm-gjv2`, `GHSA-c6gr-qvv4-5v3f`, `GHSA-cg2g-xh64-v4q7`, `GHSA-mrv2-3pqr-j5jr` — `CWE-79` DOM XSS / sanitizer bypasses). Because MODELVAULT renders untrusted repository files and diffs inside Monaco Editor on `/studio` and `/agents`, any markdown/hover tooltip rendered through Monaco's internal DOMPurify instance is exposed if untrusted hover content is enabled.
   - **`deepmerge-ts < 8.0.0` (`GHSA-ggr8-5vv4-36mx`, High, `CWE-674` stack exhaustion) and `effect <= 3.22.0` (`GHSA-7589-6fvf-x4pw`, High, `CWE-1333` ReDoS) via `@prisma/config` -> `prisma 6.19.3`:** Transitive dependencies of the `prisma` CLI package (build/migration tooling; not imported by `@prisma/client` at runtime).
2. **Active `.env` variable name mismatch (`NEXTAUTH_SECRET` vs `AUTH_SECRET`):** Inspection of `.env` key names confirmed that `.env` defines `NEXTAUTH_SECRET` and `NEXTAUTH_URL`, whereas `src/lib/auth.ts` reads `process.env.AUTH_SECRET` and `src/lib/crypto.ts` reads `process.env.INTEGRATIONS_ENCRYPTION_KEY || process.env.AUTH_SECRET`. Consequently, even when `.env` is loaded, `process.env.AUTH_SECRET` is `undefined`, causing the running server to actively use the hardcoded default secrets (`"modelvault-dev-secret-change-me"` and `"modelvault-local-development-secret"`), as dynamically confirmed in test `DT-002`.

**Evidence:**

`npm audit --json` metadata output:
```json
{
  "vulnerabilities": { "info": 0, "low": 2, "moderate": 0, "high": 4, "critical": 0, "total": 6 },
  "dependencies": { "prod": 158, "dev": 373, "optional": 83, "peer": 4, "peerOptional": 0, "total": 572 }
}
```
`.env` keys observed: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (`AUTH_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY` absent).

**Attack Preconditions:**

- For `.env` mismatch: default `.env` configuration is used, leaving `AUTH_SECRET` unset so offline session forgery (`MV-SEC-008` / `DT-002`) succeeds immediately.
- For `dompurify` in `monaco-editor`: attacker supplies malicious file/diff content rendered by Monaco hover/markdown widgets.

**Attack Scenario:**

1. Attacker knows `NEXTAUTH_SECRET` was set in `.env` instead of `AUTH_SECRET`, so `src/lib/auth.ts` fell back to `"modelvault-dev-secret-change-me"`.
2. Attacker signs an arbitrary session cookie offline (`DT-002`) and authenticates as any user ID.

**Impact:**

Active fallback to hardcoded signing/encryption keys in environments using `.env` conventions; potential DOM XSS in Monaco markdown/hover rendering via vulnerable transitive `dompurify`.

**Reproduction:**

1. Run `npm audit --json` -> confirms 6 vulnerable package entries (`dompurify`, `monaco-editor`, `deepmerge-ts`, `effect`, `@prisma/config`, `prisma`).
2. Run `DT-002` against local server -> confirms offline token forged with `"modelvault-dev-secret-change-me"` is accepted (`HTTP 200` on `/api/auth/me`).

**Remediation:**

- Update `dompurify` / `monaco-editor` via `npm audit fix` (or package `overrides` for `dompurify: "^3.4.17+"`) and evaluate upgrading `prisma` / `@prisma/client` in a dedicated branch.
- Remove unused `jsonwebtoken` from `package.json`.
- Update `.env.example` / deployment config validation to require `AUTH_SECRET` and `INTEGRATIONS_ENCRYPTION_KEY` (and fail startup if missing).

**Verification:**

- `npm audit --omit=dev` reports 0 vulnerabilities on runtime dependencies.
- Server refuses to start when `AUTH_SECRET` or `INTEGRATIONS_ENCRYPTION_KEY` is unset.

**Regression Test:**

- CI `npm audit --audit-level=high` check and startup env validation test.

