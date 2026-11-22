# Security Test Plan & Regression Suite Specification — MODELVAULT

**Date:** 2026-11-23  
**Purpose:** Executable security verification and regression test specification covering all 31 findings (`MV-SEC-001`..`MV-SEC-031`). All active tests must run only against an isolated local or staging environment backed by a disposable database copy and synthetic accounts.

---

## 1. Synthetic Multi-Tenant Test Harness Architecture

As demonstrated in our Phase 4 dynamic verification run (`DT-001`..`DT-013`, recorded in `penetration-test-results.md`), automated security regression tests should:
1. Copy `prisma/dev.db` to a temporary scratch path (`security-audit-test.db`) and start Next.js on a dedicated local test port with `DATABASE_URL=file:<temp_db>`.
2. Provision two synthetic tenants:
   - **Organization A (`org_synth_a` / `ws_synth_a`):** Owner (`alice.owner@orga.local`), Developer/Member (`bob.dev@orga.local`), Viewer (`cara.viewer@orga.local`).
   - **Organization B (`org_synth_b` / `ws_synth_b`):** Owner (`dave.owner@orgb.local`), Developer/Member (`erin.dev@orgb.local`).
3. Execute all negative (unauthenticated, forged-cookie, cross-tenant Org B -> Org A, and low-privilege Org A Viewer -> Member/Admin action) assertions.
4. Tear down the test server, delete temporary extracted workspaces, and delete the temporary database file.

---

## 2. Regression Test Matrix Mapped to Findings (`MV-SEC-001` .. `MV-SEC-031`)

### 2.1 Authentication, Session & OAuth (`MV-SEC-001`, `007`, `008`, `009`, `011`, `012`, `028`, `029`, `031`)

| Test ID | Finding ID(s) | Test Procedure | Baseline Observed (2026-11-23) | Required Post-Fix Expectation |
|---|---|---|---|---|
| `REG-AUTH-01` | `MV-SEC-001`, `MV-SEC-007` | Send `GET /api/subscriptions`, `GET /api/integrations`, and `GET /api/projects/proj_fintech_001/files` with `Cookie: mv_session=invalid-arbitrary-token` | **FAIL (`DT-001`):** Returned `HTTP 200` with `user_demo_001` data | Must return `HTTP 401 Unauthorized` with zero data |
| `REG-AUTH-02` | `MV-SEC-008`, `MV-SEC-031` | Sign an `mv_session` token offline using `"modelvault-dev-secret-change-me"` for `alice.owner@orga.local` and call `GET /api/auth/me` | **FAIL (`DT-002`):** Returned `HTTP 200` as `alice.owner@orga.local` | Server refuses to boot with default secret; forged token returns `HTTP 401` |
| `REG-AUTH-03` | `MV-SEC-012` | Authenticate, call `POST /api/auth/logout`, then replay the pre-logout `mv_session` cookie on `GET /api/auth/me` | **FAIL (`DT-003`):** Replayed token returned `HTTP 200` | Must return `HTTP 401 Unauthorized` (session revoked server-side) |
| `REG-AUTH-04` | `MV-SEC-011` | Submit `POST /api/auth/register` with an already-registered email | **FAIL (`DT-004`):** Returned `HTTP 409 Email is already registered` | Uniform non-enumerating response or rate-limited verification flow |
| `REG-AUTH-05` | `MV-SEC-028` | Call `GET /api/auth/github` and `GET /api/auth/github/callback?code=test` without a valid `state` cookie | **FAIL (Code review):** No `state` cookie generated or verified | `GET /api/auth/github` sets signed/HttpOnly `state` + PKCE cookie; callback without matching `state` returns `HTTP 400/403` |
| `REG-AUTH-06` | `MV-SEC-009` | Send 15 rapid failed `POST /api/auth/login` attempts; send cross-origin `POST /api/integrations` with `Origin: https://evil.example` | **FAIL (Code review):** No rate limit or `Origin` check | Returns `HTTP 429 Too Many Requests` after threshold; cross-origin state change returns `HTTP 403` |
| `REG-AUTH-07` | `MV-SEC-029` | Call `verifySession("payload.short")` where signature byte length differs from SHA-256 base64url length | **FAIL (Code review):** `crypto.timingSafeEqual` throws `RangeError` | Returns `null` cleanly without throwing |

### 2.2 Multi-Tenant Isolation & BOLA/IDOR (`MV-SEC-002`, `004`, `005`, `006`, `023`, `024`, `025`, `026`, `027`)

| Test ID | Finding ID(s) | Test Procedure | Baseline Observed (2026-11-23) | Required Post-Fix Expectation |
|---|---|---|---|---|
| `REG-TENANT-01` | `MV-SEC-024` | As Org B Owner, call `GET /api/organizations` | **FAIL (`DT-010`):** Returned all 8 orgs, 11 emails, and `user.passwordHash` | Returns only Org B; `JSON.stringify(body).includes("passwordHash") === false` |
| `REG-TENANT-02` | `MV-SEC-002` | As Org B Owner, call `GET /api/projects?workspaceId=ws_synth_a` and `POST /api/projects` with `workspaceId: "ws_synth_a"` | **FAIL (`DT-005`):** Listed Org A project (`200`) and created project in Org A (`201`) | Both return `HTTP 403 Forbidden` |
| `REG-TENANT-03` | `MV-SEC-002`, `MV-SEC-010` | As Org B Owner, `POST /api/projects/upload` with `workspaceId: "ws_synth_a"` | **FAIL (`DT-006`):** Uploaded and extracted ZIP into Org A (`200`) | Returns `HTTP 403 Forbidden` |
| `REG-TENANT-04` | `MV-SEC-006`, `MV-SEC-023` | As Org B Owner, call `GET /api/executions`, `GET /api/executions/exec_synth_a`, and `GET /api/executions/exec_synth_a/events` | **FAIL (`DT-007`):** All three returned `HTTP 200` with Org A prompt & SSE stream | `GET /api/executions` returns only Org B runs; Org A `[id]` and `[id]/events` return `HTTP 403/404` |
| `REG-TENANT-05` | `MV-SEC-026` | As Org B Owner, call `PATCH /api/executions/exec_synth_b/comments` with Org A's `commentId: "cmt_synth_a1"` | **FAIL (`DT-008`):** Resolved Org A's comment (`HTTP 200`) | Returns `HTTP 404 Not Found`; `cmt_synth_a1` remains `"open"` |
| `REG-TENANT-06` | `MV-SEC-005` | As Org B Owner, call `PATCH` and `DELETE /api/notifications/notif_synth_a1` | **FAIL (`DT-009`):** Modified and deleted Org A notification (`HTTP 200`) | Returns `HTTP 404 Not Found` |
| `REG-TENANT-07` | `MV-SEC-025` | As Org B Owner, call `POST /api/api-usage` with `{"apiAccountId":"api_synth_a1","cost":-9000}` | **FAIL (`DT-011`):** Inflated Org A `prepaidBalance` to `9500` (`HTTP 201`) | Cross-tenant `apiAccountId` returns `HTTP 404`; negative `cost` returns `HTTP 422` |
| `REG-TENANT-08` | `MV-SEC-027` | Call `GET /api/projects/nonexistent_id_999/files` as an authenticated user | **FAIL (`DT-012`):** Fell back to `findFirst()` and returned `proj_fintech_001` (`HTTP 200`) and host `workspacePath` | Returns `HTTP 404 Not Found`; valid responses omit host `workspacePath` |
| `REG-TENANT-09` | `MV-SEC-004` | As Org B Owner (or unauthenticated), call `GET /api/projects/proj_synth_a/preview/proxy?path=/` | **FAIL (Code review):** No auth check in proxy route | Returns `HTTP 401/403` |

### 2.3 Sandbox, Upload, Git, Verification & Supply Chain (`MV-SEC-003`, `010`, `014`, `015`, `016`, `029`, `030`, `031`)

| Test ID | Finding ID(s) | Test Procedure | Baseline Observed (2026-11-23) | Required Post-Fix Expectation |
|---|---|---|---|---|
| `REG-SBX-01` | `MV-SEC-003` | Attempt to start preview when `ProjectEnvironment.startCommand` contains shell metacharacters (`;`, `&&`, `` ` ``, `$()`) or non-allowlisted binary | **FAIL (Code review):** Passed directly to `spawn(command, { shell: true, env: process.env })` | Rejected with `HTTP 400/422`; execution runs in isolated container/microVM without `shell: true` or host `process.env` |
| `REG-UP-01` | `MV-SEC-010` | Upload ZIP with `../traversal.txt`, oversized entry, >500 files, symlink entry, and binary PNG file | `../` filtered (`DT-006`) and `?file=../../` blocked (`DT-013`), but no size/count limits and binary files corrupted via UTF-8/base64 | Oversized/symlink archives rejected (`HTTP 413/422`); binary files preserved byte-for-byte |
| `REG-GIT-01` | `MV-SEC-014` | Call `POST /api/git` with `action: "branch", branchName: "--help"` or repository containing `.git/hooks/pre-commit` | **FAIL (Code review):** `branchName` passed to `git checkout` without `--` or ref validation; hooks not disabled | Invalid ref name rejected (`HTTP 422`); Git runs with `-c core.hooksPath=/dev/null` |
| `REG-VER-01` | `MV-SEC-030` | Call `POST /api/executions/[id]/approve` without `expectedDiffHash`, with a mismatched diff hash, or when `status === "cancelled"` | **FAIL (Code review):** Unconditionally updates status to `"completed"` | Rejected with `HTTP 409 Conflict` / `HTTP 422` |
| `REG-SCA-01` | `MV-SEC-031` | Run `npm audit --json` in CI | **FAIL:** 6 vulnerabilities (4 High in `prisma` chain, 2 Low in `dompurify`/`monaco-editor`) | `0` unresolved High/Critical or client-runtime XSS vulnerabilities |
