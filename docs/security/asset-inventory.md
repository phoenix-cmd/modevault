# Asset Inventory — MODELVAULT

**Date:** 2026-11-23  
**Source:** Repository/code review only. Production cloud inventory not available.

## 1. Application Assets

| Asset | Type | Location / Evidence | Sensitivity | Owner (assumed) | Notes |
|---|---|---|---|---|---|
| Next.js web app | Application | `src/app`, `package.json` | High | Product/App | Public + authenticated surfaces |
| API route handlers | Application | `src/app/api/**` (43 files) | Critical | Backend | Primary attack surface |
| Auth/session logic | Security control | `src/lib/auth.ts`, `src/proxy.ts` | Critical | AppSec/Backend | Custom cookie auth |
| Permission helper | Security control | `src/lib/permissions.ts` | Critical | Backend | Project-level role checks |
| Workspace/file manager | Service | `src/lib/project-workspace.ts` | Critical | Backend/Platform | Local FS + git exec |
| Preview manager | Service | `src/lib/preview-manager.ts` | Critical | Platform | Spawns host processes |
| Crypto helper | Security control | `src/lib/crypto.ts` | Critical | AppSec | AES-256-GCM for secrets |
| Validation schemas | Security control | `src/lib/validation.ts` | High | Backend | Partial coverage |
| Logger | Observability | `src/lib/logger.ts` | Medium | Platform | JSON logs, no redaction evident |

## 2. Data Assets

| Asset | Storage | Evidence | Sensitivity | Notes |
|---|---|---|---|---|
| User identities | DB `User` | `prisma/schema.prisma` | High | Emails, names, passwordHash |
| Sessions/accounts/tokens | DB `Session`, `Account`, `VerificationToken` | schema | High | Custom auth currently not using DB sessions for revocation |
| Org/workspace memberships | DB `Organization`, `Membership`, `Workspace` | schema | Critical | Tenant boundary core |
| Projects/sources/envs | DB `Project`, `ProjectSource`, `RuntimeEnvironment` | schema | Critical | Includes `sourcePath`, `startCommand` |
| Executions/tasks/events/artifacts | DB execution models | schema | High | May contain prompts, diffs, logs |
| Git operations | DB `GitOperation` | schema | High | Audit/provenance relevance |
| Integration credentials | DB `IntegrationCredential.encryptedKey` | schema, `crypto.ts` | Critical | Encrypted at rest by app layer |
| API accounts/provider keys | DB `ApiAccount` | schema | Critical | Check encryption/storage handling in routes |
| Subscriptions/billing/usage | DB billing/subscription/api usage tables | schema | High | Financial/tenant data |
| Notifications | DB `Notification` | schema | Medium | May contain sensitive action links/messages |
| Local workspace files | Filesystem `data/projects/<id>` | `project-workspace.ts` | Critical | Untrusted code/content |
| SQLite dev DB | `prisma/dev.db` | file present, git modified | High | Must not be committed; may contain dev data |

## 3. Secrets / Credentials (Types)

| Secret type | Expected location | Evidence | Risk |
|---|---|---|---|
| AUTH_SECRET | env | `src/lib/auth.ts` fallback exists | High if missing/default |
| INTEGRATIONS_ENCRYPTION_KEY | env | `src/lib/crypto.ts` fallback exists | High |
| DATABASE_URL | env | `db.ts`, `.env` redacted key present | High |
| NEXTAUTH_* vars | env | `.env` contains keys (values redacted) | Medium; legacy/unused? |
| GitHub/GitLab/OAuth tokens | DB/env/integration | schema/routes mention integrations | Critical |
| AI provider keys | DB/env | product context; schema has ApiAccount/IntegrationCredential | Critical |
| Sandbox/cloud creds | env/provider | not evidenced | Critical |

**Note:** `.env` exists; contents were only key-name inspected with values redacted. No secret values were recorded.

## 4. External Integrations / Dependencies

| Integration | Evidence | Status | Security concern |
|---|---|---|---|
| GitHub/GitLab | git routes, schema fields, product description | Partial/unknown | Token scope, repo access, webhook/auth |
| AI providers (OpenAI/Anthropic/Google etc.) | product context, provider/api account models | Unknown | Key storage, prompt/data leakage, egress |
| Redis/BullMQ | package? not in package.json deps; stated in prompt | Not evidenced in repo | Queue auth, job injection |
| SSE/WebSockets | stated in prompt | Not clearly evidenced in routes | Stream authz/tenant isolation |
| Cloud sandbox provider | stated in prompt | Not evidenced | Isolation, metadata, credentials |
| Vercel | `db.ts` VERCEL handling | Partial | Ephemeral FS, env/secrets, preview deploys |

## 5. Infrastructure Assets (Claimed / To Verify)

| Asset | Status in repo | Verify in staging/prod |
|---|---|---|
| PostgreSQL | Schema currently SQLite; scripts mention postgres | DB role, RLS, TLS, backups, network |
| Redis | Not evidenced | Auth, TLS, ACLs, persistence |
| Object storage | Not evidenced | Bucket ACLs, signed URLs, encryption |
| Sandbox/VM/container platform | Not evidenced | Isolation, egress, quotas, secrets injection |
| CI/CD | No `.github/workflows` seen | Secret scanning, SCA, SAST, provenance |
| Monitoring/logging | logger only | Redaction, SIEM, alerting |

## 6. Asset Protection Gaps

- No central asset classification/tagging in code.
- No evidence of data retention/deletion policy.
- No evidence of backup encryption/access controls.
- No evidence of secrets manager/KMS.
- Dev DB and workspaces may coexist with production code paths.
