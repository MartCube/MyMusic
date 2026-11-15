import { ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

/**
 * Drag a panel down with a finger to close it, like putting a sheet away.
 * The panel follows the finger once the drag starts at the top of its scroll area;
 * letting go far or fast enough closes it, otherwise it springs back.
 * Touch only: on a desktop the panel closes with Esc or a click outside.
 */
export function useSwipeDown(panel: Ref<HTMLElement | undefined>, onClose: () => void, scroller?: Ref<HTMLElement | undefined>) {
  const offset = ref(0)
  const dragging = ref(false)
  let y0 = 0
  let t0 = 0
  let armed = false

  const scrollTop = () => (scroller?.value ?? panel.value)?.scrollTop ?? 0

  useEventListener(panel, 'touchstart', (e: TouchEvent) => {
    const target = e.target as HTMLElement
    // Sliders and anything marked no-swipe keep their own drag.
    armed = e.touches.length === 1 && !target.closest('input[type=range], .no-swipe')
    y0 = e.touches[0].clientY
    t0 = performance.now()
    dragging.value = false
  }, { passive: true })

  useEventListener(panel, 'touchmove', (e: TouchEvent) => {
    if (!armed) return
    const dy = e.touches[0].clientY - y0
    if (!dragging.value) {
      if (dy < -4 || scrollTop() > 0) {
        armed = false // scrolling the content instead
        return
      }
      if (dy < 8) return
      dragging.value = true
      y0 += 8
    }
    e.preventDefault()
    offset.value = Math.max(0, e.touches[0].clientY - y0)
  }, { passive: false })

  const finish = () => {
    if (!dragging.value) return
    const dy = offset.value
    const speed = dy / Math.max(performance.now() - t0, 1)
    dragging.value = false
    armed = false
    if (dy > 110 || (dy > 40 && speed > 0.5)) {
      offset.value = window.innerHeight
      setTimeout(() => {
        onClose()
        offset.value = 0
      }, 180)
    } else {
      offset.value = 0
    }
  }
  useEventListener(panel, 'touchend', finish, { passive: true })
  useEventListener(panel, 'touchcancel', finish, { passive: true })

  /** Bind with :style on the panel. */
  const style = () =>
    offset.value
      ? { transform: `translateY(${offset.value}px)`, transition: dragging.value ? 'none' : 'transform 0.18s ease-out' }
      : dragging.value
        ? {}
        : { transition: 'transform 0.18s ease-out' }
  return { offset, dragging, style }
}
