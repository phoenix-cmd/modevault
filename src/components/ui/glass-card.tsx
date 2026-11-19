import React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle"
  glow?: "none" | "violet" | "blue" | "cyan"
  children: React.ReactNode
}

/**
 * Flat surface primitive kept under its historical name for call-site
 * compatibility. Editorial layout uses hairline borders, not glass.
 */
export function GlassCard({
  variant = "default",
  glow = "none",
  className,
  children,
  ...props
}: GlassCardProps) {
  const variants = {
    default: "border-line bg-surface",
    elevated: "border-line bg-surface",
    subtle: "border-line bg-surface-2/40",
  }

  return (
    <div
      className={cn(
        "rounded-lg border text-ink transition-colors duration-150",
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
