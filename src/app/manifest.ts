import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MODELVAULT — Software Development, Orchestrated",
    short_name: "MODELVAULT",
    description:
      "Coordinate coding agents, automate engineering workflows, verify generated diffs, and govern AI spend in one control plane.",
    start_url: "/",
    display: "standalone",
    background_color: "#151b1a",
    theme_color: "#151b1a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
