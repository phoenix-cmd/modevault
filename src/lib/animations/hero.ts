import { waapi } from 'animejs/waapi'
import { isReducedMotion } from './reveals'

export interface HeroElements {
  badge?: HTMLElement | null
  title?: HTMLElement | null
  subtitle?: HTMLElement | null
  actions?: HTMLElement | null
  stats?: HTMLElement | null
  demo?: HTMLElement | null
}

export function animateHeroSequence(elements: HeroElements): () => void {
  if (typeof window === 'undefined' || isReducedMotion()) {
    return () => {}
  }

  const activeAnimations: any[] = []

  const targets = [
    { el: elements.badge, delay: 50, y: 12 },
    { el: elements.title, delay: 180, y: 24 },
    { el: elements.subtitle, delay: 320, y: 18 },
    { el: elements.actions, delay: 440, y: 14 },
    { el: elements.stats, delay: 540, y: 12 },
    { el: elements.demo, delay: 650, y: 30 },
  ]

  targets.forEach(({ el, delay, y }) => {
    if (!el) return
    try {
      const anim = waapi.animate(el, {
        opacity: [0, 1],
        transform: [`translateY(${y}px)`, 'translateY(0px)'],
        duration: 750,
        delay,
        ease: 'outQuart',
      })
      if (anim) activeAnimations.push(anim)
    } catch {
      // Graceful fallback
    }
  })

  return () => {
    activeAnimations.forEach((anim) => {
      try {
        if (anim && typeof anim.cancel === 'function') {
          anim.cancel()
        }
      } catch {
        // Ignore unmount cancel errors
      }
    })
  }
}
