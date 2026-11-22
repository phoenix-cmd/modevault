"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { animateHeroSequence } from "@/lib/animations/hero"
import { Navbar } from "./Navbar"
import { HeroProductDemo } from "./HeroProductDemo"
import { TickerStrip } from "./TickerStrip"

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return animateHeroSequence({
      title: titleRef.current,
      subtitle: subtitleRef.current,
      actions: actionsRef.current,
      diagram: diagramRef.current,
    })
  }, [])

  return (
    <section
      className="relative flex min-h-[78vh] flex-col justify-between overflow-hidden"
      style={{ backgroundColor: "var(--rig-blue)" }}
    >
      {/* Faded architectural geometric emblem watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 180 180"
        fill="none"
        className="pointer-events-none absolute -right-12 top-1/2 w-[58%] max-w-[640px] -translate-y-1/2 text-[#0b1010] opacity-[0.09]"
      >
        <path
          d="M18 18h88v28H46v116H18V18Zm44 52h100v28H90v64H62V70Zm48 52h52v40h-52v-40Z"
          fill="currentColor"
        />
        <rect x="122" y="18" width="40" height="36" fill="currentColor" />
      </svg>

      <Navbar />

      <div className="rig-container relative z-10 flex-1 py-14 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>
            <h1
              ref={titleRef}
              className="rig-display text-[clamp(3rem,6.8vw,5.75rem)] font-bold leading-[0.89] text-[var(--rig-paper)]"
            >
              Software
              <br />
              development.
              <br />
              Orchestrated.
            </h1>

            <p
              ref={subtitleRef}
              className="mt-7 max-w-[540px] text-[1.125rem] font-semibold leading-[1.55] text-[#0c1212] sm:text-[1.25rem]"
            >
              One environment to coordinate coding agents, automate engineering
              workflows and verify the software they produce.
            </p>

            <div
              ref={actionsRef}
              className="mt-9 flex flex-wrap items-center gap-3.5"
            >
              <Link href="/register" className="rig-btn-chamfer rig-btn-dark">
                Get started
              </Link>
              <Link href="#introducing" className="rig-btn-hero-outline">
                Explore MODELVAULT
              </Link>
            </div>
          </div>

          <div ref={diagramRef}>
            <HeroProductDemo />
          </div>
        </div>
      </div>

      <TickerStrip />
    </section>
  )
}
