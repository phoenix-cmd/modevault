"use client"

import { useEffect, useRef } from "react"

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

/**
 * Shared modal accessibility: Escape to close, focus the first control on initial open,
 * trap Tab/Shift+Tab inside the dialog, and restore focus when it closes.
 *
 * Uses a ref for onClose so inline `() => setOpen(false)` callbacks never re-trigger
 * the focus-initialization effect on parent state re-renders (which would steal focus
 * from text inputs while typing).
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusFirst = () => {
      const dialog = containerRef.current
      if (!dialog) return
      // Never steal focus if an element inside the dialog is already focused
      if (document.activeElement && dialog.contains(document.activeElement)) {
        return
      }
      // Prefer focusing the first text input/textarea/select if present, otherwise first focusable control
      const firstInput = dialog.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      )
      const target = firstInput || dialog.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      target?.focus()
    }

    const frame = window.requestAnimationFrame(focusFirst)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return
      const dialog = containerRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !dialog.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", handleKeyDown, true)
      document.body.style.overflow = prevOverflow
      previouslyFocused.current?.focus?.()
    }
  }, [isOpen])

  return containerRef
}
