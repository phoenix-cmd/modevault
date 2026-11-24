import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to your MODELVAULT command center to manage coding agents, workflows, code verification, and AI spend.",
  alternates: {
    canonical: "/login",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
