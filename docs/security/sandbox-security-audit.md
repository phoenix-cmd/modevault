# Sandbox / Execution Security Audit — MODELVAULT

**Date:** 2026-11-23  
**Method:** Code review only. **No sandbox escape, host compromise, or destructive testing performed.**

## 1. Scope

- `src/lib/preview-manager.ts`
- `src/app/api/projects/[id]/preview/route.ts`
- `src/app/api/projects/[id]/preview/proxy/route.ts`
- `src/lib/project-workspace.ts` (command execution for git)
- Execution/workflow routes that mutate workspaces

## 2. Observed Execution Model

### Preview execution
- `startPreview(projectId)` loads project/environment/source from DB.
- Validates existence of source path; sets `cwd` to source path.
- Selects `command = environment.startCommand || "npm run dev"`.
- Spawns process: `spawn(command, { cwd, shell: true, env: { ...process.env, PORT }, stdio: "ignore", detached: false })`.
- In-memory global `Map` stores running previews.
- On Vercel, returns simulated `{status: "simulated"}`.

### Preview proxy
- `GET /api/projects/[id]/preview/proxy` reads in-memory preview by project ID.
- If running, fetches `http://localhost:${preview.port}${path}` with user-supplied `path` query.
- No authentication/authorization.

### Git execution
- `execFileAsync("git", args, {cwd, maxBuffer: 10MB})` in `project-workspace.ts`.

## 3. Critical Risks

### S1. Host command execution / RCE — MV-SEC-003 (Critical)
- **Evidence:** `spawn` with `shell:true`, command from DB, inherited `process.env`.
- **Impact:** Host code execution, env/secret theft, lateral movement, cross-tenant compromise.
- **Required control:** Never run untrusted project commands on host; isolated sandbox with strict policy.

### S2. Unauthenticated preview proxy / local service exposure — MV-SEC-004 (High)
- **Evidence:** No authz in proxy route; user-controlled path appended to localhost URL.
- **Impact:** Unauthorized preview access, potential localhost HTTP probing.

### S3. No sandbox isolation evidence (Critical gap)
- No Docker/K8s/gVisor/Firecracker/microVM/seccomp/AppArmor/SELinux policy files observed.
- No egress filtering, metadata endpoint blocking, resource quotas, or per-sandbox identity.

### S4. Environment/secret inheritance (High)
- Preview inherits full process env. Any host secrets (`DATABASE_URL`, `AUTH_SECRET`, provider keys, cloud creds) may be exposed to spawned process.

### S5. Workspace contamination / persistent environment reuse (High)
- Previews run in project source directory. Malicious command can modify workspace, install persistence, or access adjacent files if path isolation weak.

### S6. Unsafe process lifecycle controls (Medium)
- In-memory Map is process-local; no distributed coordination, no quotas, no timeout enforcement, no audit. Kill uses `process.kill(-pid)`/`child.kill()`; Windows behavior and orphan processes need review.

### S7. Localhost port trust (Medium)
- Proxy assumes localhost port belongs to project preview. Port collisions or malicious local services could be exposed.

## 4. Missing Controls Checklist

| Control | Status | Notes |
|---|---|---|
| Privileged container prohibition | Unknown/No evidence | No container config |
| Docker socket not mounted | Unknown | No config |
| Host filesystem mounts restricted | No | cwd is host workspace path |
| seccomp/AppArmor/SELinux | No evidence | — |
| Network egress allowlist | No evidence | — |
| Cloud metadata access blocked | No evidence | — |
| CPU/memory/pid/disk quotas | No evidence | — |
| Per-tenant sandbox identity | No evidence | — |
| Ephemeral sandbox teardown | Partial | stopPreview kills process; filesystem persists |
| Secret injection least privilege | No | full process env inherited |
| Command allowlist/no shell | No | shell true |
| Audit logging | Minimal | console/logging not sufficient |
| Preview authn/authz/token binding | Partial | preview start/delete has project access; proxy does not |

## 5. Safe Validation Plan (Authorized disposable staging only)

1. Confirm preview spawn path in isolated VM with synthetic secrets in env; verify child process env inheritance (without exfiltrating secrets).
2. Validate command allowlist rejects shell metacharacters and arbitrary binaries.
3. Test egress deny-by-default and metadata IP blocking from sandbox.
4. Test filesystem isolation: sandbox cannot read host `/etc`, app source, other tenant workspaces.
5. Test resource quotas: CPU/memory/disk/pids/timeouts.
6. Test preview proxy authz, path normalization, token expiry, and cross-tenant ID access.
7. Test cleanup/teardown removes processes, temp files, network rules.

## 6. Recommendations

- **Blocker:** disable host-process previews for multi-tenant/public deployment.
- Use hardened sandbox provider (microVM/gVisor/Kata/Firecracker-class isolation depending on threat model).
- Run previews as non-root, read-only rootfs, no host mounts, no Docker socket, no inherited secrets.
- Use signed, short-lived preview URLs bound to user/session/project and validated by proxy/gateway.
- Enforce egress policy and block IMDS/metadata/link-local addresses.
- Add startup/teardown audit logs and kill-timeout guarantees.
- Treat `RuntimeEnvironment.startCommand` as untrusted; replace with vetted templates or immutable build/run config.
