import { waapi } from 'animejs/waapi'
import { isReducedMotion } from './reveals'

export function animateWorkflowConnector(
  svgPath: SVGPathElement | null,
  duration: number = 800,
  delay: number = 0
) {
  if (typeof window === 'undefined' || !svgPath || isReducedMotion()) return null

  try {
    const length = svgPath.getTotalLength ? svgPath.getTotalLength() : 300
    svgPath.style.strokeDasharray = `${length}`
    svgPath.style.strokeDashoffset = `${length}`

    return waapi.animate(svgPath, {
      strokeDashoffset: [length, 0],
      duration,
      delay,
      ease: 'inOutSine',
    })
  } catch {
    return null
  }
}

export function animateNodeActivation(
  nodeElement: HTMLElement | null,
  delay: number = 0
) {
  if (typeof window === 'undefined' || !nodeElement || isReducedMotion()) return null

  try {
    return waapi.animate(nodeElement, {
      transform: ['scale(0.97)', 'scale(1.02)', 'scale(1)'],
      duration: 500,
      delay,
      ease: 'outBack',
    })
  } catch {
    return null
  }
}
