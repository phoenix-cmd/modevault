import { waapi } from "animejs/waapi"
import { cancelAnimations, isReducedMotion } from "./reveals"

export function animateWorkflowConnector(
  svgPath: SVGPathElement | null,
  duration = 700,
  delay = 0
) {
  if (typeof window === "undefined" || !svgPath || isReducedMotion()) return null

  try {
    const length = svgPath.getTotalLength ? svgPath.getTotalLength() : 280
    svgPath.style.strokeDasharray = `${length}`
    svgPath.style.strokeDashoffset = `${length}`

    return waapi.animate(svgPath, {
      strokeDashoffset: [length, 0],
      duration,
      delay,
      ease: "inOutSine",
    })
  } catch {
    return null
  }
}

export function animateConnectorGroup(
  paths: Array<SVGPathElement | null>,
  staggerMs = 110
): () => void {
  if (typeof window === "undefined" || isReducedMotion()) {
    return () => {}
  }

  const anims: Array<{ cancel?: () => void } | null> = []
  paths.forEach((p, idx) => {
    if (!p) return
    anims.push(animateWorkflowConnector(p, 650, idx * staggerMs))
  })

  return () => {
    cancelAnimations(anims)
  }
}

export function animateNodeActivation(
  nodeElement: HTMLElement | null,
  delay = 0
) {
  if (typeof window === "undefined" || !nodeElement || isReducedMotion()) return null

  try {
    return waapi.animate(nodeElement, {
      opacity: [0.6, 1],
      transform: ["translateY(4px)", "translateY(0px)"],
      duration: 380,
      delay,
      ease: "outCubic",
    })
  } catch {
    return null
  }
}
