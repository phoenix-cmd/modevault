import { waapi } from "animejs/waapi"

export function isReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function createScrollObserver(
  element: HTMLElement | null,
  onVisible: () => void,
  options?: IntersectionObserverInit
): () => void {
  if (typeof window === "undefined" || !element) {
    return () => {}
  }

  if (isReducedMotion()) {
    onVisible()
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onVisible()
          observer.unobserve(entry.target)
          observer.disconnect()
          break
        }
      }
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -40px 0px",
      ...options,
    }
  )

  observer.observe(element)

  return () => {
    observer.disconnect()
  }
}

export function animateFadeUp(
  target: HTMLElement | HTMLElement[] | null,
  delay = 0,
  duration = 560
) {
  if (typeof window === "undefined" || !target || isReducedMotion()) return null

  try {
    return waapi.animate(target, {
      opacity: [0, 1],
      transform: ["translateY(14px)", "translateY(0px)"],
      duration,
      delay,
      ease: "outQuart",
    })
  } catch {
    return null
  }
}

export function animateStagger(
  targets: HTMLElement[],
  staggerMs = 70,
  duration = 500
) {
  if (typeof window === "undefined" || !targets.length || isReducedMotion()) {
    return []
  }

  const animations: Array<{ cancel?: () => void }> = []
  targets.forEach((target, index) => {
    try {
      const anim = waapi.animate(target, {
        opacity: [0, 1],
        transform: ["translateY(12px)", "translateY(0px)"],
        duration,
        delay: index * staggerMs,
        ease: "outQuart",
      })
      if (anim) animations.push(anim)
    } catch {
      /* ignore animation failures */
    }
  })
  return animations
}

export function cancelAnimations(animations: Array<{ cancel?: () => void } | null>) {
  for (const anim of animations) {
    try {
      anim?.cancel?.()
    } catch {
      /* ignore */
    }
  }
}
