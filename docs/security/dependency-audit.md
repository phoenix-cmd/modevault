# Dependency & Supply-Chain Audit — MODELVAULT

**Date:** 2026-11-23  
**Method:** Manifest (`package.json`) and lockfile (`package-lock.json`) inspection + live `npm audit --json` execution (npm `11.9.0`, Node `v25.6.1`) + Git history inspection across all 59 commits.

---

## 1. Files & Tooling Reviewed

- `package.json` and `package-lock.json` (572 total packages: 158 prod, 373 dev, 83 optional, 4 peer).
- `npm audit --json` executed locally against `package-lock.json`.
- `.gitignore` and Git commit history (`59` commits) checked for committed databases, `.env` files, and secret patterns.
- No `.github/workflows`, Dockerfile, Kubernetes manifests, or SBOM files exist in the repository.

---

## 2. `npm audit --json` Vulnerability Report (`MV-SEC-031`)

```json
{
  "vulnerabilities": {
    "info": 0,
    "low": 2,
    "moderate": 0,
    "high": 4,
    "critical": 0,
    "total": 6
  }
}
```

| Package | Direct / Transitive | Severity | Advisories & CWE | Affected Range | Runtime Exposure in MODELVAULT | Fix Available |
|---|---|---|---|---|---|---|
| `dompurify` | Transitive (via `monaco-editor`) | **Low** | `GHSA-p98j-92pf-mc4p`, `GHSA-6688-9rhm-gjv2`, `GHSA-c6gr-qvv4-5v3f`, `GHSA-cg2g-xh64-v4q7`, `GHSA-mrv2-3pqr-j5jr` (`CWE-79` DOM XSS / sanitizer bypasses) | `<= 3.4.16` | **Client runtime (`/studio`, `/agents`):** Monaco Editor renders untrusted repository files and diffs; markdown/hover tooltips use Monaco's bundled DOMPurify. | Yes (`npm audit fix` / override `dompurify >= 3.4.17`) |
| `monaco-editor` | Transitive (via `@monaco-editor/react`) | **Low** | Via `dompurify` (`CWE-79`) | `0.56.0-dev - 0.57.0` | **Client runtime (`/studio`, `/agents`)** | Yes |
| `deepmerge-ts` | Transitive (via `@prisma/config` -> `prisma`) | **High** | `GHSA-ggr8-5vv4-36mx` — Stack exhaustion when merging recursive object graphs (`CWE-674`) | `< 8.0.0` | **Build / CLI tooling (`prisma`):** Used by Prisma CLI config loader, not exposed directly to runtime HTTP requests. | `prisma@7.10.1` (SemVer major) |
| `effect` | Transitive (via `@prisma/config` -> `prisma`) | **High** | `GHSA-7589-6fvf-x4pw` — ReDoS in `Schema.TemplateLiteral` compiled regex (`CWE-1333`) | `<= 3.22.0` | **Build / CLI tooling (`prisma`)** | `prisma@7.10.1` (SemVer major) |
| `@prisma/config` | Transitive (via `prisma`) | **High** | Via `deepmerge-ts` and `effect` | `>= 6.13.0-dev.1` | **Build / CLI tooling (`prisma`)** | `prisma@7.10.1` (SemVer major) |
| `prisma` | Direct (`^6.19.3`) | **High** | Via `@prisma/config` | `6.13.0-dev.1 - 7.10.0` | **Build / CLI tooling** | `prisma@7.10.1` (SemVer major) |

---

## 3. Direct Runtime Dependencies Inventory (`package.json`)

| Package | Version Spec | Security Assessment |
|---|---:|---|
| `next` | `16.4.6` | Pinned exact version; keep aligned with Next.js security advisories. |
| `react` / `react-dom` | `19.3.0` | Pinned exact version. |
| `@prisma/client` / `prisma` | `^6.19.3` | Parameterized queries protect against SQLi; `prisma` CLI carries transitive `deepmerge-ts` / `effect` advisories above. |
| `bcryptjs` | `^3.0.3` | Pure JS bcrypt implementation (cost factor 10 used in `register` and `seed.js`). |
| `jsonwebtoken` | `^9.0.3` | **Unused dependency:** `src/lib/auth.ts` uses Node's built-in `node:crypto` HMAC-SHA256 instead. Remove to reduce attack surface. |
| `jszip` | `^3.10.2` | Used in `POST /api/projects/upload`. Does not enforce archive bomb, entry count, or uncompressed size limits automatically (`MV-SEC-010`). |
| `@monaco-editor/react` | `^4.7.0` | Loads `monaco-editor` (which pulls `dompurify <=3.4.16` flagged above). |
| `@xyflow/react` | `^13.0.2` | Workflow DAG canvas UI. |
| `framer-motion` & `motion` | `^14.14.0` | Duplicate animation libraries installed simultaneously; consolidate to reduce bundle/supply-chain footprint. |
| `zod` | `^4.6.7` | Used in `src/lib/validation.ts`, though 15+ route handlers bypass Zod validation (`MV-SEC-017`). |

---

## 4. Install Scripts & Git History Supply-Chain Observations

1. **`postinstall` script (`package.json`):** Runs `prisma generate`. In Vercel builds, `@prisma/client`, `@prisma/engines`, `prisma`, and `better-sqlite3` declare install scripts.
2. **Git history database leakage (`MV-SEC-019`):** Although `prisma/dev.db` is currently listed in `.gitignore`, `git log --all --full-history -- "**/dev.db"` confirmed that `prisma/dev.db` was committed in 8 commits (including `HEAD` commit `bd09daf`). Any seeded or local test records present when those commits were created remain in Git history.
3. **No `.env` committed:** `git log --all --full-history -- "**/.env*"` returned zero commits (`.env*` is ignored by `.gitignore`). However, `.env` defines `NEXTAUTH_SECRET` while `src/lib/auth.ts` reads `AUTH_SECRET` (`MV-SEC-031`).
4. **Missing CI/CD security pipeline (`MV-SEC-018`, `MV-SEC-022`):** No `.github/workflows` directory exists; there is no automated SCA, SAST, secret scan, license check, or CycloneDX SBOM generation on pull requests.

---

## 5. Recommendations

1. **Immediate dependency remediation:** Add an `overrides` entry in `package.json` for `"dompurify": "^3.4.17"` (or run `npm audit fix`) to close the 5 `dompurify` DOM XSS advisories inside `monaco-editor`, and remove unused `jsonwebtoken`.
2. **Prisma upgrade evaluation:** Test upgrading `prisma` and `@prisma/client` to `7.10.1+` in a dedicated branch to resolve `GHSA-ggr8-5vv4-36mx` (`deepmerge-ts`) and `GHSA-7589-6fvf-x4pw` (`effect`).
3. **Purge `prisma/dev.db` from Git tracking & history:** Ensure `git rm --cached prisma/dev.db` is applied when cleaning the repository and rewrite history (`git filter-repo`) before making the repository public if any sensitive data was ever stored in `dev.db`.
4. **CI supply-chain gates:** Add GitHub Actions workflows running `npm audit --audit-level=high`, OSV-Scanner, Semgrep, Gitleaks, and CycloneDX SBOM generation on every PR.
