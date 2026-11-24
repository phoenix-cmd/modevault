import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create account",
  description:
    "Create a MODELVAULT workspace to orchestrate AI coding agents, verify diffs before merge, and monitor provider spend.",
  alternates: {
    canonical: "/register",
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
