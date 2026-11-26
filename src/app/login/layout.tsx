import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to MODELVAULT to coordinate coding agents, workflows, and AI spend.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    url: "/login",
    title: "Sign In | MODELVAULT",
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
