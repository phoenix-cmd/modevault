import React from "react"
import { cn } from "@/lib/utils"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle"
  glow?: "none" | "violet" | "blue" | "cyan"
  children: React.ReactNode
}

export function GlassCard({
  variant = "default",
  glow = "none",
  className,
  children,
  ...props
}: GlassCardProps) {
  const variants = {
    default: "border-line bg-surface",
    elevated: "border-line-strong bg-surface",
    subtle: "border-line bg-surface-2/40",
  }

  return (
    <div
      className={cn(
        "rounded-[2px] border text-ink transition-colors duration-150",
        variants[variant],
        glow !== "none" && "hover:border-accent-line",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
