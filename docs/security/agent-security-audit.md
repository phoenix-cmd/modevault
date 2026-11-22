# Agent, Orchestration, Workflow & Verification Security Audit — MODELVAULT

**Date:** 2026-11-23  
**Method:** Complete code review of execution, orchestrator, workflow, verification (`/verify`), and Git workspace subsystems + controlled dynamic verification (`DT-007`, `DT-008`, `DT-012`).

---

## 1. Subsystems Audited

- `src/app/api/agents/route.ts` — Agent registry catalog (`Claude Code 3.7`, `Codex 5.2`, `Gemini CLI 2.5`, `OpenCode Reviewer`, etc.).
- `src/app/api/orchestrator/plan/route.ts` — Prompt-based multi-stage execution planner.
- `src/app/api/executions/route.ts` — Execution listing and execution creation (writes `MODELVAULT_EXECUTION.md`, creates Git branch/commit, records tasks/events/artifacts).
- `src/app/api/executions/[id]/route.ts` — Execution detail retrieval.
- `src/app/api/executions/[id]/events/route.ts` — Server-Sent Events (SSE) execution stream.
- `src/app/api/executions/[id]/approve/route.ts` — Human approval / rejection / revision handler.
- `src/app/api/executions/[id]/comments/route.ts` — Diff line review comments (`GET`, `POST`, `PATCH`).
- `src/app/api/workflows/route.ts` & `src/app/api/workflows/execute/route.ts` — Visual DAG workflow catalog and execution engine.
- `src/app/(dashboard)/verify/page.tsx` — MODELVAULT Verify security scanner UI and approval console.
- `src/app/api/git/route.ts` & `src/lib/project-workspace.ts` — Local Git CLI execution and workspace file management.

---

## 2. Confirmed Vulnerabilities Across Agent, Workflow, Verification & Git Subsystems

### 2.1 Cross-Tenant Execution, Prompt, Diff & Live SSE Stream Disclosure — `MV-SEC-006` & `MV-SEC-023` (High, Confirmed in `DT-007`)
- `GET /api/executions` returns every execution across all organizations when `projectId` is omitted (`MV-SEC-006`).
- `GET /api/executions/[id]` and `GET /api/executions/[id]/events` perform **zero authentication or project membership checks** (`MV-SEC-023`). In dynamic test `DT-007`, Organization B Owner retrieved Organization A's confidential prompt (`CONFIDENTIAL_PROMPT_ORG_A`) and live SSE terminal stream payload (`ORG_A_STREAM_DATA`).

### 2.2 Cross-Execution Review Comment Tampering (IDOR), Unscoped Workflow Catalog & Unauthenticated Orchestrator Planning — `MV-SEC-026` (High, Confirmed in `DT-008`)
- `PATCH /api/executions/[id]/comments` checks `"viewer"` access on the URL's `[id]`, then executes `prisma.reviewComment.update({ where: { id: commentId }, data: { status } })` without scoping by `executionId: id`. In `DT-008`, Organization B Owner called `PATCH /api/executions/exec_synth_b/comments` with Organization A's `commentId: "cmt_synth_a1"` and marked Organization A's comment `"resolved"`.
- `GET /api/workflows` and `POST /api/workflows` have no authentication or workspace scoping (`WorkflowDefinition.workspaceId` is never populated or filtered).
- `POST /api/orchestrator/plan` has no authentication or authorization and falls back to `prisma.project.findFirst()`.

### 2.3 Client-Side-Only Verification Scanner (`/verify`) & Unbound Approvals — `MV-SEC-030` (Medium, Confirmed)
- **Client-side regex scanner:** `inspectExecution()` in `src/app/(dashboard)/verify/page.tsx:66-137` runs 5 regular expressions in browser JavaScript against `+` lines of the first `git_diff` artifact (`MV-SQL-001`, `MV-XSS-002`, `MV-EXEC-003`, `MV-SEC-004`, `MV-CRYPTO-005`). No server-side scan runs, no scan report is stored in the database, and the backend does not check scan findings before approving.
- **Unbound approval & missing state-machine check:** `POST /api/executions/[id]/approve` (`src/app/api/executions/[id]/approve/route.ts:18-63`) accepts `{ action, feedback }` without verifying `execution.status === "awaiting_approval"` and without binding the approval to a commit SHA or diff SHA-256 digest (TOCTOU vulnerability). Furthermore, any `"member"` (including the execution creator) can self-approve.

### 2.4 Git CLI Argument Injection Risk, Hook Execution Risk & Shared Worktree Contention — `MV-SEC-014` (Medium, Confirmed)
- **Missing `--` option terminator on branch operations:** While `stageFiles`, `unstageFiles`, `discardFiles`, and `getGitDiff` pass `"--"` before file paths, `createBranch(rootPath, branchName)` (`src/lib/project-workspace.ts:249-256`), `checkoutBranch(rootPath, branchName)` (`line 258`), and `gitPull` (`line 349`) pass `branchName` directly to `git checkout` / `git pull` without validating against leading dashes (`-`) or Git ref syntax (`git check-ref-format`).
- **Git hooks & config not hardened:** `initializeGitRepository` and subsequent `git` calls run directly inside `data/projects/<projectId>` without setting `-c core.hooksPath=/dev/null`, `-c protocol.allow=never`, or `GIT_TERMINAL_PROMPT=0`. If an uploaded archive or repository contains `.git/hooks/*` or malicious `.git/config` directives, Git operations can trigger arbitrary command execution on the host.
- **Shared mutable worktree across concurrent runs:** `POST /api/executions` and `POST /api/workflows/execute` both run `createBranch`, `writeWorkspaceFile`, and `git add -A && git commit` directly inside the single project workspace directory (`source.sourcePath`) rather than an isolated per-execution Git worktree, allowing concurrent runs to overwrite or commit each other's files.
- **Synthetic Git operations mixed with real state (`MV-SEC-020`):** In `POST /api/git`, `action === "revert"` and `action === "pr"` write database records with synthetic SHAs (`rev_...`) and hardcoded URLs (`https://github.com/acme/trade-engine/pull/...`) without running Git or calling GitHub.

---

## 3. Required Remediation Controls

1. **Enforce `requireProjectAccess` on all execution, comment, workflow, orchestrator, and SSE endpoints** (`MV-SEC-006`, `MV-SEC-023`, `MV-SEC-026`) and scope `reviewComment.update` by `{ id: commentId, executionId: id }` with `"member"` role minimum.
2. **Validate Git branch names with a strict regex** (`/^[A-Za-z0-9._\/-]+$/`, rejecting leading `-`, `..`, `.lock`, and control characters) and pass `-c core.hooksPath=/dev/null -c protocol.file.allow=never` with `GIT_TERMINAL_PROMPT=0` on every `execFile("git", ...)` invocation (`MV-SEC-014`).
3. **Move verification scanning to the backend and bind approvals to immutable digests** (`(executionId, commitSha, diffSha256)`) while enforcing `execution.status === "awaiting_approval"` and separation of duties (`MV-SEC-030`).
