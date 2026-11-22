# Attack Surface — MODELVAULT

**Date:** 2026-11-23  
**Method:** Repo route/config/code inventory; no live port scan or authenticated crawl.

## 1. Network/API Surface

### Public/Unauthenticated by design (expected)
| Endpoint | Methods | Evidence | Notes |
|---|---|---|---|
| `/` | GET | app route | Public marketing |
| `/login`, `/register` | GET | app routes | Public auth pages |
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` | Credential auth, no rate limit visible |
| `/api/auth/register` | POST | `src/app/api/auth/register/route.ts` | Account creation, enumeration risk |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | Cookie clear only |
| `/api/auth/github` | GET/POST? | route exists | Needs OAuth state/PKCE review |
| `/api/auth/github/callback` | GET | route exists | OAuth callback validation critical |
| `/api/health` | GET | `src/app/api/health/route.ts` | Minimal info disclosure; confirm no sensitive details |

### Intended authenticated (proxy cookie-presence gate)
All non-public matched paths under `src/proxy.ts` matcher, including dashboard pages and most `/api/*`.

### High-risk endpoints with observed weak/missing authz
| Endpoint | Methods | Observed issue | Evidence |
|---|---|---|---|
| `/api/projects` | GET, POST | No authn/authz; client-controlled `workspaceId`; defaults to `ws_core_001` | `src/app/api/projects/route.ts` |
| `/api/projects/upload` | POST | No authn/authz; ZIP extraction to filesystem; git init | `src/app/api/projects/upload/route.ts` |
| `/api/projects/[id]/preview/proxy` | GET | No authn/authz; proxies to localhost preview port | `src/app/api/projects/[id]/preview/proxy/route.ts` |
| `/api/notifications/[id]` | PATCH, DELETE | No authn/authz/ownership | `src/app/api/notifications/[id]/route.ts` |
| `/api/executions` | GET | `projectId` omitted returns all executions | `src/app/api/executions/route.ts` |
| Many routes using `getCurrentUserOrDefault` | various | Demo-user fallback; invalid cookie may be accepted as demo | `src/lib/auth.ts`, grep results |

## 2. Input Surfaces

| Surface | Input types | Validation | Risk |
|---|---|---|---|
| Auth forms | email, password, name | Zod in login/register | brute force, enumeration, CSRF |
| Project create | JSON body, workspaceId/name/repo/framework/language | Minimal manual checks | authz/IDOR/mass assignment |
| ZIP upload | multipart file, name, workspaceId | File presence only | zip slip, zip bomb, DoS, malicious files |
| File read/write | path, content | `isSafeRelativePath` in workspace lib | path traversal/symlink/encoding edge cases |
| Git actions | action, branchName, commitMessage, files, etc. | `gitActionSchema` | command abuse, repo mutation, fake audit records |
| Execution/workflow prompts | prompt, workflowId, projectId | partial Zod | prompt injection, over-broad mutation, cost abuse |
| Preview proxy path | `path` query param | none visible | localhost probing/path abuse |
| Notifications | id param, JSON body | none in `[id]` | IDOR/tampering |

## 3. File System Surface

- Workspace root: `process.cwd()/data/projects/<projectId>` (`project-workspace.ts`).
- Upload extracts ZIP entries into workspace.
- File tree/read/write endpoints operate on workspace paths.
- Git repo initialization/commands run in workspace cwd.
- Preview manager spawns process with `cwd` set to project source path.

**Risks:** path traversal, symlink escape, malicious file write, disk exhaustion, unsafe executable content, git hook/config abuse.

## 4. Command Execution Surface

| Component | Command | Source of influence | Mitigation observed | Risk |
|---|---|---|---|---|
| Preview start | `spawn(startCommand, {shell:true, env:process.env})` | DB `RuntimeEnvironment.startCommand` | Vercel simulated only | Critical RCE/host compromise |
| Git operations | `execFile("git", args, {cwd})` | route params/branch/file args/repo contents | execFile, no shell | Medium; git hardening needed |
| N/A build/test | none observed in app routes | — | — | — |

## 5. Authentication / Session Surface

- Cookie: `mv_session`, `httpOnly`, `sameSite=lax`, `secure` in production, `path=/`, `maxAge=7d`.
- Token: base64url JSON payload `{sub, exp}` + HMAC SHA256 base64url signature.
- No server-side session revocation/rotation observed.
- No CSRF token/origin checks observed.
- Proxy checks cookie presence only.

## 6. Data Store Surface

- Prisma ORM to configured DATABASE_URL; currently sqlite schema.
- Multi-tenant models exist, but enforcement is route-dependent.
- No RLS evidence in schema.
- `dev.db` in repo/worktree (should not be committed).

## 7. Third-Party / Outbound Surface

- Git remote operations via git CLI (`push/pull/fetch`) - can contact configured remotes.
- OAuth GitHub routes exist; callback validation must be reviewed.
- AI provider/sandbox/webhook integrations described by product but not fully implemented/evidenced.

## 8. Client-Side Surface

- React/Next.js UI, Monaco editor, React Flow, previews/iframes potentially.
- No explicit CSP/security headers in `next.config.ts`.
- `dangerouslySetInnerHTML` not observed by quick grep, but full UI XSS review not completed.

## 9. Attack Surface Priorities

1. Unauthenticated/weakly authorized API endpoints.
2. Upload -> workspace -> execution chain.
3. Preview host process spawn and proxy.
4. Session/auth fallback and cookie gate.
5. Git/agent command/prompt injection surfaces.
6. Secrets/integration credential handling.
7. Missing rate limits/CSRF/security headers.
