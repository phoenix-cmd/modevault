import Link from "next/link"

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-b border-[var(--rig-paper-18)] py-28 text-center sm:py-40">
      <div className="rig-perspective-grid" aria-hidden="true" />

      {/* Oversized architectural watermark */}
      <svg
        aria-hidden="true"
        viewBox="0 0 180 180"
        fill="none"
        className="pointer-events-none absolute -bottom-24 -right-24 h-[520px] w-[520px] text-[var(--rig-paper)] opacity-[0.035] hidden md:block"
      >
        <path
          d="M18 18h88v28H46v116H18V18Zm44 52h100v28H90v64H62V70Zm48 52h52v40h-52v-40Z"
          fill="currentColor"
        />
      </svg>

      <div className="rig-container relative z-10 flex flex-col items-center">
        {/* Centered MODELVAULT geometric emblem */}
        <div className="mb-10 flex h-14 w-14 items-center justify-center border border-[var(--rig-paper-20)] bg-[#101514]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 4h11v4H7v12H3V4Zm7 7h11v9h-4v-5h-7v-4Z"
              fill="#ebe7de"
            />
            <rect x="17" y="4" width="4" height="4" fill="var(--rig-blue)" />
          </svg>
        </div>

        <h2 className="rig-display max-w-[640px] text-[clamp(3rem,7vw,5.75rem)] font-bold leading-[0.9] text-[var(--rig-paper)]">
          Build with agents.
          <br />
          Stay in control.
        </h2>

        <p className="mt-7 max-w-[460px] rig-mono text-[13px] leading-relaxed text-[var(--rig-paper-50)]">
          One workspace for multi-agent execution, verification, Git control, and AI spend.
        </p>

        <div className="mt-10 flex w-full max-w-[500px] flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="rig-btn-chamfer rig-btn-blue flex-1 !py-4 !text-[13px]"
          >
            Get started
          </Link>
          <Link
            href="#faq"
            className="rig-btn-outline flex-1 !py-4 !text-[13px]"
          >
            Explore documentation
          </Link>
        </div>
      </div>
    </section>
  )
}
