import { waapi } from 'animejs/waapi'

export function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function createScrollObserver(
  element: HTMLElement | null,
  onVisible: () => void,
  options?: IntersectionObserverInit
): () => void {
  if (typeof window === 'undefined' || !element) {
    return () => {}
  }

  if (isReducedMotion()) {
    onVisible()
    return () => {}
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        onVisible()
        observer.unobserve(entry.target)
        observer.disconnect()
        break
      }
    }
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
    ...options,
  })

  observer.observe(element)

  return () => {
    observer.disconnect()
  }
}

export function animateFadeUp(
  target: HTMLElement | HTMLElement[],
  delay: number = 0,
  duration: number = 650
) {
  if (typeof window === 'undefined' || !target || isReducedMotion()) return null

  try {
    return waapi.animate(target, {
      opacity: [0, 1],
      transform: ['translateY(20px)', 'translateY(0px)'],
      duration,
      delay,
      ease: 'outQuart',
    })
  } catch {
    return null
  }
}

export function animateStagger(
  targets: HTMLElement[],
  staggerMs: number = 80,
  duration: number = 600
) {
  if (typeof window === 'undefined' || !targets.length || isReducedMotion()) return []

  const animations: any[] = []
  targets.forEach((target, index) => {
    try {
      const anim = waapi.animate(target, {
        opacity: [0, 1],
        transform: ['translateY(16px)', 'translateY(0px)'],
        duration,
        delay: index * staggerMs,
        ease: 'outQuart',
      })
      if (anim) animations.push(anim)
    } catch {
      // Graceful fallback
    }
  })
  return animations
}
