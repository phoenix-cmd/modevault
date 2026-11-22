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
    sm: "h-7 w-7 rounded-[2px]",
    md: "h-8 w-8 rounded-[2px]",
    lg: "h-10 w-10 rounded-[2px]",
  }

  const iconSizeMap = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  const colors: Record<string, string> = {
    openai: "#56d887",
    anthropic: "#d89b34",
    google: "#317ef5",
    "github-copilot": "#8ba8cb",
    github: "#8ba8cb",
    cursor: "#56d887",
    perplexity: "#6ec7c0",
    openrouter: "#729bff",
    windsurf: "#56d887",
    huggingface: "#d89b34",
  }

  const color = brandColor || colors[slug] || "#317ef5"

  const icon = (() => {
    switch (slug) {
      case "openai":
        return <Bot className={iconSizeMap[size]} />
      case "anthropic":
        return <MessageSquare className={iconSizeMap[size]} />
      case "google":
        return <Sparkles className={iconSizeMap[size]} />
      case "github-copilot":
      case "github":
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
        backgroundColor: `${color}18`,
        borderColor: `${color}45`,
        color,
      }}
      aria-hidden="true"
    >
      {icon}
    </div>
  )
}
