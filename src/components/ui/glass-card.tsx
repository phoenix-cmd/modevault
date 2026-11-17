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
  const variantClass = {
    default: "glass-card",
    elevated: "glass-elevated",
    subtle: "glass-subtle",
  }[variant]

  const glowClass = {
    none: "",
    violet: "hover:glow-violet",
    blue: "hover:glow-blue",
    cyan: "hover:glow-cyan",
  }[glow]

  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] p-6 text-zinc-100 transition-all duration-200",
        variantClass,
        glowClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
