import React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle"
  glow?: "none" | "violet" | "blue" | "cyan"
  children: React.ReactNode
}

/**
 * The original card primitive, now a solid surface. The `glow` prop is kept
 * for call-site compatibility but renders as a restrained hover border.
 */
export function GlassCard({
  variant = "default",
  glow = "none",
  className,
  children,
  ...props
}: GlassCardProps) {
  const variants = {
    default: "border-line bg-surface shadow-card",
    elevated: "border-line bg-surface shadow-panel",
    subtle: "border-line bg-surface-2/60",
  }

  return (
    <div
      className={cn(
        "rounded-xl border text-ink transition-colors duration-150",
        variants[variant],
        glow !== "none" && "hover:border-line-strong",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
