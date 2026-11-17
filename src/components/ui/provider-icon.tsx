import {
  Bot,
  MessageSquare,
  Sparkles,
  GitBranch,
  MousePointer,
  Search,
  Route,
  Wind,
  Smile,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProviderIconProps {
  slug: string
  name?: string
  brandColor?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProviderIcon({
  slug,
  brandColor,
  size = "md",
  className,
}: ProviderIconProps) {
  const sizeMap = {
    sm: "h-7 w-7 rounded-[6px]",
    md: "h-8 w-8 rounded-[7px]",
    lg: "h-10 w-10 rounded-lg",
  }

  const iconSizeMap = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const colors: Record<string, string> = {
    openai: "#0f8a6d",
    anthropic: "#a27446",
    google: "#3568c9",
    "github-copilot": "#6552a8",
    cursor: "#0d8f7a",
    perplexity: "#1f8f88",
    openrouter: "#4d55b8",
    windsurf: "#177a5b",
    huggingface: "#b47412",
  }

  const color = brandColor || colors[slug] || "#4a4fbf"

  const icon = (() => {
    switch (slug) {
      case "openai":
        return <Bot className={iconSizeMap[size]} />
      case "anthropic":
        return <MessageSquare className={iconSizeMap[size]} />
      case "google":
        return <Sparkles className={iconSizeMap[size]} />
      case "github-copilot":
        return <GitBranch className={iconSizeMap[size]} />
      case "cursor":
        return <MousePointer className={iconSizeMap[size]} />
      case "perplexity":
        return <Search className={iconSizeMap[size]} />
      case "openrouter":
        return <Route className={iconSizeMap[size]} />
      case "windsurf":
        return <Wind className={iconSizeMap[size]} />
      case "huggingface":
        return <Smile className={iconSizeMap[size]} />
      default:
        return <Zap className={iconSizeMap[size]} />
    }
  })()

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center border",
        sizeMap[size],
        className
      )}
      style={{
        backgroundColor: `${color}0f`,
        borderColor: `${color}24`,
        color,
      }}
      aria-hidden="true"
    >
      {icon}
    </div>
  )
}
