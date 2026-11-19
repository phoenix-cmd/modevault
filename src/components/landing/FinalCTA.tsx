"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight } from "lucide-react"
import { createScrollObserver, animateFadeUp } from "@/lib/animations/reveals"

export function FinalCTA() {
  const ref = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return createScrollObserver(ref.current, () => {
      if (contentRef.current) animateFadeUp(contentRef.current, 0, 650)
    })
  }, [])

  return (
    <section ref={ref} className="bg-[var(--mkt-bg)] py-20 sm:py-24">
      <div ref={contentRef} className="mkt-container">
        <div className="grid gap-10 border-t border-[var(--mkt-line-strong)] pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="mkt-eyebrow text-[var(--mkt-accent)]">Modelvault</p>
            <h2 className="mkt-display mt-5 text-[2.4rem] sm:text-[3.5rem] lg:text-[4rem]">
              Bring agents, workflows,
              <br />
              and review into one place.
            </h2>
            <p className="mkt-lead mt-5 max-w-xl text-[15px]">
              Open the workspace to explore projects, runs, usage, and delivery in a
              single environment.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
            <Link href="/overview" className="mkt-btn-primary h-11 px-6">
              Open workspace
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link href="/register" className="mkt-btn-secondary h-11 px-6">
              Create an account
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-[var(--mkt-line)] pt-6">
          <p className="mkt-note">Clear task ownership</p>
          <p className="mkt-note">Traceable checks and review</p>
          <p className="mkt-note">Usage and cost context</p>
        </div>
      </div>
    </section>
  )
}
