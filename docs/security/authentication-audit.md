# Authentication Audit — MODELVAULT

**Date:** 2026-11-23  
**Method:** Complete code review of all authentication modules (`src/lib/auth.ts`, `src/proxy.ts`, `src/app/api/auth/**`, `src/app/login/page.tsx`, `src/app/register/page.tsx`, `prisma/schema.prisma`, `.env` key names) + controlled dynamic verification (`DT-001`..`DT-004`).

---

## 1. Components Reviewed

- `src/lib/auth.ts` — Custom HMAC-SHA256 session token signing (`signSession`), verification (`verifySession`), user lookup (`getCurrentUser`), and demo-user fallback (`getCurrentUserOrDefault`).
- `src/proxy.ts` — Next.js request gate checking `Boolean(request.cookies.get("mv_session")?.value)`.
- `src/app/api/auth/login/route.ts` — Email + password authentication using `bcryptjs.compare`.
- `src/app/api/auth/register/route.ts` — Account + default organization/workspace registration using `bcryptjs.hash(password, 10)`.
- `src/app/api/auth/logout/route.ts` — Cookie clearing (`maxAge: 0`).
- `src/app/api/auth/me/route.ts` — Current user endpoint using `getCurrentUser()`.
- `src/app/api/auth/github/route.ts` & `src/app/api/auth/github/callback/route.ts` — GitHub OAuth redirect and code exchange flow.
- `src/app/login/page.tsx` & `prisma/seed.js` — Client login UI pre-filled with `"demo@modelvault.dev"` / `"password"`.

---

## 2. Confirmed Authentication & Session Vulnerabilities

### A1. Demo-User Fallback Bypasses Authentication Across 24 API Routes — `MV-SEC-001` (Critical, Confirmed in `DT-001`)
- `getCurrentUserOrDefault()` in `src/lib/auth.ts:72-83` silently queries and returns `user_demo_001` (`demo@modelvault.dev`, Owner of `org_acme_001` / `ws_core_001`) whenever `getCurrentUser()` returns `null`.
- Because `src/proxy.ts:17` only checks `Boolean(request.cookies.get("mv_session")?.value)`, sending `Cookie: mv_session=invalid-arbitrary-token` passes the proxy and authenticates the caller as `user_demo_001` on all 24 routes calling `getCurrentUserOrDefault()`.

### A2. Cookie-Presence-Only Request Gate — `MV-SEC-007` (High, Confirmed in `DT-001`)
- `src/proxy.ts` performs no cryptographic signature verification, no expiration check, and no database session check. Furthermore, `PUBLIC_PATHS` uses prefix matching (`pathname.startsWith(path)`), meaning any route starting with `/register`, `/login`, `/api/auth`, or `/api/health` is exempt.

### A3. Hardcoded `AUTH_SECRET` Active Due to `.env` `NEXTAUTH_SECRET` Mismatch — `MV-SEC-008` & `MV-SEC-031` (High/Critical, Confirmed in `DT-002`)
- `src/lib/auth.ts:6` sets `const JWT_SECRET = process.env.AUTH_SECRET || "modelvault-dev-secret-change-me"`.
- Inspection of `.env` key names revealed that `.env` defines `NEXTAUTH_SECRET`, **not** `AUTH_SECRET`. As a result, `process.env.AUTH_SECRET` is `undefined` at runtime and the server signs/verifies all session tokens with `"modelvault-dev-secret-change-me"`.
- Combined with `GET /api/organizations` (`MV-SEC-024`, `DT-010`) which leaks every user's `id` and `passwordHash`, an attacker can forge a valid `mv_session` cookie offline for any user in the database (`DT-002`).

### A4. GitHub OAuth Missing `state` Parameter, Missing PKCE, Unverified Profile Email Linking, and Excessive `repo` Scope — `MV-SEC-028` (High, Confirmed)
- `src/app/api/auth/github/route.ts:12-16` redirects to `https://github.com/login/oauth/authorize` without a `state` parameter or PKCE `code_challenge`, and requests `scope = "read:user user:email repo"`.
- `src/app/api/auth/github/callback/route.ts:8-49` does not validate `state` (enabling OAuth login CSRF) and links to existing accounts via `githubUser.email` before checking `/user/emails` for `primary && verified`.

### A5. Stateless 7-Day Session Tokens Remain Valid After Logout — `MV-SEC-012` (Medium, Confirmed in `DT-003`)
- Although `prisma/schema.prisma` defines `Session`, `Account`, and `VerificationToken` models, `0` rows exist in `Session` and `src/lib/auth.ts` never reads or writes the `Session` table.
- `POST /api/auth/logout` only sends `Set-Cookie: mv_session=; Max-Age=0`. Replaying a captured `mv_session` cookie after logout returned `HTTP 200` on `GET /api/auth/me` (`DT-003`).

### A6. Missing Rate Limiting, Account Lockout, and CSRF Protection — `MV-SEC-009` (High, Confirmed)
- Neither `/api/auth/login` nor `/api/auth/register` enforces IP/account rate limiting or lockout.
- State-changing `POST`/`PUT`/`PATCH`/`DELETE` endpoints rely solely on `SameSite=Lax` cookies without validating `Origin` / `Sec-Fetch-Site` headers or anti-CSRF tokens.

### A7. Account Enumeration, Weak Password Policy & Pre-Filled Demo Credentials — `MV-SEC-011` (Medium, Confirmed in `DT-004`)
- `POST /api/auth/register` returns `HTTP 409 {"error":"Email is already registered"}` (`DT-004`).
- `passwordSchema` in `src/lib/validation.ts:39` only checks `z.string().min(8).max(200)`.
- `src/app/login/page.tsx:11-12` pre-fills `demo@modelvault.dev` and `password` in client state, matching `prisma/seed.js:20`.

### A8. `verifySession` Unchecked Buffer Length Before `crypto.timingSafeEqual` — `MV-SEC-029` (Low, Confirmed)
- `src/lib/auth.ts:41` calls `crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))` without checking `sigBuf.length === expBuf.length`, throwing a `RangeError` whenever a malformed signature has a different length.

---

## 3. OWASP ASVS 5.0.0 Level 2 Compliance Mapping (Authentication & Session)

| ASVS Section | Requirement Summary | Status | Implementation Evidence |
|---|---|---|---|
| **V2.1** Password Security | Min 8 chars, max >=64, breached password check, no hardcoded default credentials | **FAIL** | Min 8 / max 200 (`validation.ts:39`), `bcrypt` cost 10 (`register/route.ts:19`), but seeded user has password `"password"` (`seed.js:20`) and `GET /api/organizations` leaks all `passwordHash` values (`MV-SEC-024`) |
| **V2.2** General Authenticator Security | Fail-closed authentication, no demo fallback, anti-automation | **FAIL** | `getCurrentUserOrDefault()` falls back to `user_demo_001` (`auth.ts:72-83`, `MV-SEC-001`) |
| **V2.4** Credential Recovery & Anti-Automation | Rate limiting, brute-force resistance, no account enumeration | **FAIL** | No rate limiting (`MV-SEC-009`); `409` email enumeration on register (`MV-SEC-011`) |
| **V2.10** OAuth / OIDC Client | CSRF `state` validation, PKCE, verified email linking, least-privilege scopes | **FAIL** | No `state` or PKCE; requests `repo` scope; prefers `githubUser.email` (`MV-SEC-028`) |
| **V3.2 / V3.3** Session Binding & Termination | Server-side session revocation on logout, strong signing key | **FAIL** | Stateless HMAC token valid after logout (`DT-003`, `MV-SEC-012`); fallback signing key active (`DT-002`, `MV-SEC-008`) |
| **V3.4** Cookie-based Session Management | `HttpOnly`, `Secure`, `SameSite`, scoped path | **PASS (Partial)** | `httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/"` (`login/route.ts:28-34`) |
| **V3.5** CSRF Defenses | Origin/Fetch-Metadata verification or CSRF tokens on state-changing requests | **FAIL** | No `Origin` / `Sec-Fetch-Site` check or CSRF token (`MV-SEC-009`) |
