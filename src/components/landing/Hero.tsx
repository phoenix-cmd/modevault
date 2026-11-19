"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight } from "lucide-react"
import { animateHeroSequence } from "@/lib/animations/hero"

function OrchestrationGraphic() {
  return (
    <figure className="relative w-full overflow-hidden border border-[var(--mkt-line)] bg-[var(--mkt-paper)]">
      <div className="flex items-center justify-between border-b border-[var(--mkt-line)] px-4 py-2.5">
        <span className="mkt-eyebrow">Task graph · example</span>
        <span className="mkt-note text-[var(--mkt-accent)]">Demonstration composition</span>
      </div>
      <svg
        viewBox="0 0 760 420"
        className="block h-auto w-full"
        role="img"
        aria-label="A development request branching into architecture, frontend, backend, testing and verification, then converging into a reviewed software change."
      >
        <defs>
          <pattern id="mkt-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="var(--mkt-line)" strokeWidth="0.75" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="760" height="420" fill="url(#mkt-grid)" />

        {/* connectors */}
        <g stroke="var(--mkt-line-strong)" strokeWidth="1.25" fill="none" strokeLinecap="round">
          <path d="M380 70 V108" />
          <path d="M380 148 V176" />
          <path d="M380 176 C380 196 250 196 250 224" />
          <path d="M380 176 C380 196 510 196 510 224" />
          <path d="M250 264 V292" />
          <path d="M510 264 V292" />
          <path d="M250 292 C250 312 380 312 380 332" />
          <path d="M510 292 C510 312 380 312 380 332" />
          <path d="M380 372 V392" />
        </g>

        {/* request */}
        <g transform="translate(260 28)">
          <rect width="240" height="42" rx="2" fill="var(--mkt-ink)" />
          <text x="120" y="18" textAnchor="middle" fontSize="10" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.12em" fill="#f7f3ec">DEVELOPMENT REQUEST</text>
          <text x="120" y="33" textAnchor="middle" fontSize="11.5" fontFamily="var(--font-inter), sans-serif" fill="#fffdf8">Add OAuth PKCE verification</text>
        </g>

        {/* architecture */}
        <g transform="translate(285 108)">
          <rect width="190" height="40" rx="2" fill="var(--mkt-paper)" stroke="var(--mkt-accent)" strokeWidth="1.25" />
          <text x="95" y="17" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-accent)">PLANNING</text>
          <text x="95" y="31" textAnchor="middle" fontSize="12" fontFamily="var(--font-inter), sans-serif" fill="var(--mkt-ink)">Architecture</text>
        </g>

        {/* frontend/backend */}
        <g transform="translate(140 224)">
          <rect width="220" height="40" rx="2" fill="var(--mkt-paper)" stroke="var(--mkt-line-strong)" strokeWidth="1.1" />
          <text x="110" y="17" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-ink-3)">PARALLEL EXECUTION</text>
          <text x="110" y="31" textAnchor="middle" fontSize="12" fontFamily="var(--font-inter), sans-serif" fill="var(--mkt-ink)">Frontend</text>
        </g>
        <g transform="translate(400 224)">
          <rect width="220" height="40" rx="2" fill="var(--mkt-paper)" stroke="var(--mkt-line-strong)" strokeWidth="1.1" />
          <text x="110" y="17" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-ink-3)">PARALLEL EXECUTION</text>
          <text x="110" y="31" textAnchor="middle" fontSize="12" fontFamily="var(--font-inter), sans-serif" fill="var(--mkt-ink)">Backend</text>
        </g>

        {/* integration/testing */}
        <g transform="translate(285 332)">
          <rect width="190" height="40" rx="2" fill="var(--mkt-paper)" stroke="var(--mkt-line-strong)" strokeWidth="1.1" />
          <text x="95" y="17" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-ink-3)">INTEGRATION</text>
          <text x="95" y="31" textAnchor="middle" fontSize="12" fontFamily="var(--font-inter), sans-serif" fill="var(--mkt-ink)">Testing · Verification</text>
        </g>

        {/* output */}
        <g transform="translate(250 392)">
          <rect width="260" height="18" rx="2" fill="var(--mkt-accent-soft)" stroke="var(--mkt-accent-border)" strokeWidth="1" />
          <text x="130" y="12.5" textAnchor="middle" fontSize="9.5" fontFamily="var(--font-jetbrains), monospace" letterSpacing="0.1em" fill="var(--mkt-accent-strong)">REVIEWED SOFTWARE CHANGE</text>
        </g>

        {/* annotations */}
        <g fontSize="10" fontFamily="var(--font-jetbrains), monospace" fill="var(--mkt-ink-3)">
          <text x="28" y="132">spec → tasks</text>
          <text x="28" y="248">shared context</text>
          <text x="28" y="356">checks before merge</text>
          <line x1="108" y1="128" x2="282" y2="128" stroke="var(--mkt-line)" strokeWidth="0.75" />
          <line x1="116" y1="244" x2="138" y2="244" stroke="var(--mkt-line)" strokeWidth="0.75" />
          <line x1="138" y1="352" x2="282" y2="352" stroke="var(--mkt-line)" strokeWidth="0.75" />
        </g>
      </svg>
    </figure>
  )
}

export function Hero() {
  const badgeRef = useRef<HTMLParagraphElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLDivElement>(null)
  const demoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cleanup = animateHeroSequence({
      badge: badgeRef.current,
      title: titleRef.current,
      subtitle: subtitleRef.current,
      actions: actionsRef.current,
      stats: noteRef.current,
      demo: demoRef.current,
    })
    return cleanup
  }, [])

  return (
    <section className="border-b border-[var(--mkt-line)] pt-14 pb-16 sm:pt-20 sm:pb-20">
      <div className="mkt-container">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] lg:gap-14">
          <div className="max-w-xl">
            <p ref={badgeRef} className="mkt-eyebrow flex items-center gap-3 text-[var(--mkt-accent)]">
              <span className="h-px w-8 bg-[var(--mkt-accent-border)]" aria-hidden="true" />
              MODELVAULT · Engineering workspace
            </p>

            <h1
              ref={titleRef}
              className="mkt-display mt-6 text-[2.75rem] sm:text-[4rem] lg:text-[4.6rem]"
            >
              Software development,
              <br />
              orchestrated.
            </h1>

            <p ref={subtitleRef} className="mkt-lead mt-6 max-w-lg text-[1.05rem]">
              One workspace for intelligent coding agents, collaborative workflows
              and verifiable software delivery.
            </p>

            <div ref={actionsRef} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/overview" className="mkt-btn-primary h-11 px-5">
                Open the workspace
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </Link>
              <a href="#orchestration" className="mkt-btn-secondary h-11 px-5">
                See how it is composed
              </a>
            </div>

            <div
              ref={noteRef}
              className="mt-10 grid gap-x-8 gap-y-4 border-t border-[var(--mkt-line)] pt-6 sm:grid-cols-3"
            >
              <div>
                <p className="mkt-eyebrow">Agents</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                  Specialized roles with shared task context.
                </p>
              </div>
              <div>
                <p className="mkt-eyebrow">Workflows</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                  Defined stages from plan to delivery.
                </p>
              </div>
              <div>
                <p className="mkt-eyebrow">Verification</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--mkt-ink-2)]">
                  Checks and review before changes land.
                </p>
              </div>
            </div>
          </div>

          <div ref={demoRef} className="lg:pt-2">
            <OrchestrationGraphic />
          </div>
        </div>
      </div>
    </section>
  )
}
