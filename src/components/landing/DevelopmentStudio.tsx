"use client"

import { useEffect, useRef, useState } from "react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

const FILES = [
  { name: "src/app/auth/callback/page.tsx", active: true },
  { name: "src/app/api/auth/oauth/route.ts", active: false },
  { name: "src/lib/auth/pkce.ts", active: false },
  { name: "tests/pkce.test.ts", active: false },
]

const CODE = `import { verifyCodeChallenge } from "@/lib/auth/pkce"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const verifier = await readVerifierCookie()

  if (!code || !verifier) {
    return redirect("/login?error=missing_code")
  }

  const challenge = await readStoredChallenge()
  const valid = await verifyCodeChallenge(verifier, challenge)

  if (!valid) {
    return redirect("/login?error=invalid_verifier")
  }

  return completeSession(code)
}`

const DIFF = `@@ src/lib/auth/pkce.ts
- const computed = base64url(hash)
- return computed === challenge
+ const computed = base64url(hash)
+ return timingSafeEqual(computed, challenge)

@@ tests/pkce.test.ts
+ it("rejects a mismatched verifier", async () => {
+   await expect(verifyCodeChallenge("bad", challenge))
+     .resolves.toBe(false)
+ })`

export function DevelopmentStudio() {
  const [tab, setTab] = useState<"editor" | "diff" | "preview">("editor")
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section id="studio" ref={ref} className="border-b border-[var(--mkt-line)] bg-[var(--mkt-bg)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-8 border-b border-[var(--mkt-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] lg:items-end">
          <div className="max-w-2xl">
            <p className="mkt-eyebrow flex items-center gap-3">
              <span className="text-[var(--mkt-accent)]">04</span>
              <span className="h-px w-6 bg-[var(--mkt-line-strong)]" aria-hidden />
              Development studio
            </p>
            <h2 className="mkt-h2 mt-5 text-[2rem] sm:text-[2.6rem]">
              Code, changes, and preview
              <br />
              <span className="text-[var(--mkt-ink-2)]">in one working frame.</span>
            </h2>
          </div>
          <p className="mkt-lead max-w-md text-[15px]">
            Inspect files, review diffs, and examine a running view alongside agent
            activity and command output. Shown here as an interface demonstration.
          </p>
        </div>

        <div className="mt-10 border border-[var(--mkt-line)] bg-[var(--mkt-paper)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mkt-line)] px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-4">
              <span className="mkt-mono text-[11px] uppercase tracking-[0.1em] text-[var(--mkt-ink-3)]">
                Workspace
              </span>
              <span className="mkt-mono text-[11px] text-[var(--mkt-ink-2)]">
                modelvault / feat/oauth-pkce
              </span>
            </div>
            <div className="flex items-center gap-1 border border-[var(--mkt-line)] bg-[var(--mkt-bg)] p-0.5">
              {(["editor", "diff", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors ${
                    tab === t
                      ? "bg-[var(--mkt-paper)] text-[var(--mkt-ink)]"
                      : "text-[var(--mkt-ink-3)] hover:text-[var(--mkt-ink-2)]"
                  }`}
                  aria-pressed={tab === t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-[420px] lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="border-b border-[var(--mkt-line)] p-4 lg:border-b-0 lg:border-r">
              <p className="mkt-eyebrow">Files</p>
              <ul className="mt-3 space-y-1.5">
                {FILES.map((f) => (
                  <li
                    key={f.name}
                    className={`truncate border-l px-2 py-1.5 font-mono text-[11px] ${
                      f.active
                        ? "border-[var(--mkt-accent)] bg-[var(--mkt-accent-soft)] text-[var(--mkt-ink)]"
                        : "border-transparent text-[var(--mkt-ink-2)]"
                    }`}
                    title={f.name}
                  >
                    {f.name.split("/").slice(-2).join("/")}
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-[var(--mkt-line)] pt-4">
                <p className="mkt-eyebrow">Activity</p>
                <ul className="mt-3 space-y-2 text-[12px] text-[var(--mkt-ink-2)]">
                  <li>Plan: tasks outlined</li>
                  <li>Backend: route updated</li>
                  <li>Tests: checks prepared</li>
                </ul>
                <p className="mkt-note mt-4">Example state</p>
              </div>
            </aside>

            <div className="flex flex-col">
              <div className="flex-1 overflow-auto bg-[var(--mkt-bg)] p-4 sm:p-5">
                {tab === "editor" && (
                  <pre className="mkt-mono whitespace-pre text-[12px] leading-relaxed text-[var(--mkt-ink)]">
                    <code>{CODE}</code>
                  </pre>
                )}
                {tab === "diff" && (
                  <pre className="mkt-mono whitespace-pre text-[12px] leading-relaxed text-[var(--mkt-ink)]">
                    <code>{DIFF}</code>
                  </pre>
                )}
                {tab === "preview" && (
                  <div className="mx-auto max-w-md border border-[var(--mkt-line)] bg-[var(--mkt-paper)] p-5">
                    <p className="mkt-eyebrow">Preview · example</p>
                    <h3 className="mt-3 font-display text-[22px] font-medium tracking-[-0.02em] text-[var(--mkt-ink)]">
                      Sign-in callback
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                      Verifying the authorization response and completing the session.
                    </p>
                    <div className="mt-5 space-y-2 border-t border-[var(--mkt-line)] pt-4 text-[12px] text-[var(--mkt-ink-2)]">
                      <div className="flex justify-between"><span>Code parameter</span><span className="mkt-mono text-[var(--mkt-success)]">present</span></div>
                      <div className="flex justify-between"><span>Verifier check</span><span className="mkt-mono text-[var(--mkt-success)]">valid</span></div>
                      <div className="flex justify-between"><span>Session</span><span className="mkt-mono">ready</span></div>
                    </div>
                    <button type="button" className="mkt-btn-primary mt-5 h-9 w-full" disabled>
                      Continue to workspace
                    </button>
                    <p className="mkt-note mt-3 text-center">Static demonstration view</p>
                  </div>
                )}
              </div>

              <div className="grid border-t border-[var(--mkt-line)] sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="border-b border-[var(--mkt-line)] px-4 py-3 sm:border-b-0 sm:border-r">
                  <p className="mkt-eyebrow">Terminal · example output</p>
                  <p className="mkt-mono mt-2 text-[11px] leading-relaxed text-[var(--mkt-ink-2)]">
                    $ pnpm test pkce
                    <br />
                    <span className="text-[var(--mkt-success)]">✓</span> verifier validation checks
                    <br />
                    <span className="text-[var(--mkt-success)]">✓</span> callback error states
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="mkt-eyebrow">Git</p>
                  <p className="mt-2 text-[12px] text-[var(--mkt-ink-2)]">2 files changed · review pending</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
