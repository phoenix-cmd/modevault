import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create a MODELVAULT workspace for coordinated AI software engineering and spend governance.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    url: "/register",
    title: "Create Account | MODELVAULT",
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
