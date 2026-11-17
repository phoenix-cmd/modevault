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
  brandColor = "#8b5cf6",
  size = "md",
  className,
}: ProviderIconProps) {
  const sizeMap = {
    sm: "h-7 w-7 text-xs",
    md: "h-9 w-9 text-sm",
    lg: "h-12 w-12 text-base",
  }

  const iconSizeMap = {
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
    lg: "h-6 w-6",
  }

  const getIcon = () => {
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
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg ring-1 transition-transform group-hover:scale-105",
        sizeMap[size],
        className
      )}
      style={{
        backgroundColor: `${brandColor}18`,
        color: brandColor,
        borderColor: `${brandColor}33`,
      }}
    >
      {getIcon()}
    </div>
  )
}
