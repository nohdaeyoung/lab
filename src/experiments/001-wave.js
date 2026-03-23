import { createMouse } from '../utils/mouse.js'

export const meta = {
  id: '001-wave',
  title: 'Dot Wave',
  description: '마우스 반응 웨이브 도트 그리드',
  date: '2026-03-23',
}

export function init(canvas, ctx) {
  const mouse = createMouse(canvas)
  let raf

  const COLS = 60
  const ROWS = 35
  let t = 0

  function draw() {
    const W = canvas.width
    const H = canvas.height
    const cellW = W / COLS
    const cellH = H / ROWS

    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, W, H)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = (col + 0.5) * cellW
        const y = (row + 0.5) * cellH

        const dx = x - mouse.x
        const dy = y - mouse.y
        const d  = Math.hypot(dx, dy)
        const influence = Math.max(0, 1 - d / 220)

        const wave   = Math.sin(col * 0.35 + row * 0.2 + t) * (1 + influence * 3)
        const r      = Math.max(1, (cellW * 0.18) + wave * 2.5)
        const bright = 0.18 + 0.55 * ((wave + 1) / 2) + influence * 0.4

        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,164,92,${bright.toFixed(2)})`
        ctx.fill()
      }
    }

    t += 0.04
    raf = requestAnimationFrame(draw)
  }

  draw()

  return function destroy() {
    cancelAnimationFrame(raf)
    mouse.destroy()
  }
}
