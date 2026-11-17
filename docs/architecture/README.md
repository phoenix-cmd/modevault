# MODELVAULT Architecture

## Current stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4 + shadcn-style primitives
- Prisma + SQLite (development) with a schema that already models
  organizations, workspaces, projects, sources, environments, executions,
  tasks, agent events, artifacts, git operations, workflows, subscriptions,
  API accounts, billing, notifications and sync logs.
- Zustand, TanStack Table, React Flow, Monaco, Recharts, Motion.

## Implemented today

- Subscription, API usage, billing, analytics and dashboard flows are backed by
  Prisma and are the most complete verticals.
- Projects can be created and ZIP archives can be inspected for framework and
  dependency detection.
- Executions, workflows and git operations are persisted, but most agent
  activity, file trees and diffs are currently simulated.
- Studio, integrations, models, permissions and organizations are largely
  frontend-only.

## Staged roadmap

### Stage 1 — Real project workspaces (current)

Make uploaded projects real on disk:

- persist and extract ZIP archives under a controlled workspace root
- store `ProjectSource.sourcePath`
- serve a real file tree and file contents
- allow saving edited files
- initialize a local Git repository and expose real branches, commits and diffs

### Stage 2 — Execution and agent activity

- replace synthetic execution events with a local executor that applies real
  file changes
- stream events with Server-Sent Events
- record artifacts and diffs from the workspace

### Stage 3 — Authentication and organizations

- email/password auth, sessions, organization membership
- replace hardcoded demo user/workspace identifiers

### Stage 4 — Live preview and Git operations

- start project dev servers in isolated processes
- authenticated reverse proxy for previews
- real branch, commit, pull request and rollback flows

### Stage 5 — Workflow runtime and orchestration

- execute saved workflow graphs
- conditional branches, retries, approvals and versioning

### Stage 6 — Production hardening

- PostgreSQL migration, RLS, sandbox isolation, tests and observability
