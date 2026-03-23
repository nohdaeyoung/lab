import { createMouse } from '../utils/mouse.js'
import { createParticle, tickParticle, repel, spring } from '../utils/physics.js'

export const meta = {
  id: '002-scatter',
  title: 'Scatter',
  description: 'Particles scattered by mouse, spring back to origin',
  date: '2026-03-23',
}

const COUNT = 800

export function init(canvas, ctx) {
  const mouse = createMouse(canvas)
  let raf

  // Build particles at random positions
  const W = () => canvas.width
  const H = () => canvas.height

  let particles = []

  function reset() {
    particles = Array.from({ length: COUNT }, () => {
      const ox = Math.random() * W()
      const oy = Math.random() * H()
      const p  = createParticle({ x: ox, y: oy, friction: 0.88 })
      p.ox = ox
      p.oy = oy
      return p
    })
  }

  reset()

  function draw() {
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, W(), H())

    for (const p of particles) {
      // Repel from mouse
      const r = repel(p.x, p.y, mouse.x, mouse.y, 100, 6)
      // Spring back to origin
      const s = spring(p.x, p.y, p.ox, p.oy, 0.06)

      p.vx += r.fx + s.fx
      p.vy += r.fy + s.fy
      tickParticle(p)
      p.alive = true // immortal

      // Color: shift hue based on velocity
      const speed = Math.hypot(p.vx, p.vy)
      const hue = (200 + speed * 12) % 360
      const alpha = 0.5 + Math.min(speed * 0.15, 0.5)

      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${hue},80%,70%,${alpha.toFixed(2)})`
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()

  const onResize = () => reset()
  window.addEventListener('resize', onResize)

  return function destroy() {
    cancelAnimationFrame(raf)
    mouse.destroy()
    window.removeEventListener('resize', onResize)
  }
}
