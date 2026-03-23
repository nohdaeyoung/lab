/**
 * Mouse / pointer tracker
 * Usage:
 *   const mouse = createMouse(canvas)
 *   // access mouse.x, mouse.y, mouse.vx, mouse.vy, mouse.down
 *   // call mouse.destroy() on cleanup
 */
export function createMouse(target = window) {
  const state = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    px: 0, py: 0,
    down: false,
  }

  let rect = target instanceof HTMLElement ? target.getBoundingClientRect() : null

  function getPos(e) {
    const src = e.touches?.[0] ?? e
    const ox = rect ? rect.left : 0
    const oy = rect ? rect.top  : 0
    return { x: src.clientX - ox, y: src.clientY - oy }
  }

  function onMove(e) {
    const { x, y } = getPos(e)
    state.vx = x - state.x
    state.vy = y - state.y
    state.px = state.x
    state.py = state.y
    state.x  = x
    state.y  = y
  }

  function onDown(e) { state.down = true; onMove(e) }
  function onUp()    { state.down = false }

  const el = target instanceof HTMLElement ? target : window
  el.addEventListener('mousemove',  onMove,  { passive: true })
  el.addEventListener('touchmove',  onMove,  { passive: true })
  el.addEventListener('mousedown',  onDown,  { passive: true })
  el.addEventListener('touchstart', onDown,  { passive: true })
  el.addEventListener('mouseup',    onUp,    { passive: true })
  el.addEventListener('touchend',   onUp,    { passive: true })

  return {
    get x()    { return state.x },
    get y()    { return state.y },
    get vx()   { return state.vx },
    get vy()   { return state.vy },
    get down() { return state.down },
    updateRect() {
      if (target instanceof HTMLElement) rect = target.getBoundingClientRect()
    },
    destroy() {
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('mousedown',  onDown)
      el.removeEventListener('touchstart', onDown)
      el.removeEventListener('mouseup',    onUp)
      el.removeEventListener('touchend',   onUp)
    },
  }
}
