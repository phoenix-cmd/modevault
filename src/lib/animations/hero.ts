import { waapi } from "animejs/waapi"
import { cancelAnimations, isReducedMotion } from "./reveals"

export interface HeroElements {
  title?: HTMLElement | null
  subtitle?: HTMLElement | null
  actions?: HTMLElement | null
  diagram?: HTMLElement | null
}

export function animateHeroSequence(elements: HeroElements): () => void {
  if (typeof window === "undefined" || isReducedMotion()) {
    return () => {}
  }

  const activeAnimations: Array<{ cancel?: () => void } | null> = []

  const targets = [
    { el: elements.title, delay: 40, y: 18 },
    { el: elements.subtitle, delay: 160, y: 14 },
    { el: elements.actions, delay: 260, y: 12 },
    { el: elements.diagram, delay: 340, y: 16 },
  ]

  targets.forEach(({ el, delay, y }) => {
    if (!el) return
    try {
      const anim = waapi.animate(el, {
        opacity: [0, 1],
        transform: [`translateY(${y}px)`, "translateY(0px)"],
        duration: 620,
        delay,
        ease: "outQuart",
      })
      activeAnimations.push(anim)
    } catch {
      /* graceful fallback */
    }
  })

  return () => {
    cancelAnimations(activeAnimations)
  }
}
