/**
 * Minimal 2D physics utilities
 */

/** Lerp between a and b */
export const lerp = (a, b, t) => a + (b - a) * t

/** Clamp */
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

/** Distance between two points */
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay)

/** Normalize a vector; returns {x, y} */
export function normalize(x, y) {
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

/**
 * Create a simple particle
 * @param {object} opts
 */
export function createParticle({
  x = 0, y = 0,
  vx = 0, vy = 0,
  ax = 0, ay = 0,
  friction = 0.98,
  radius = 4,
  mass = 1,
  life = 1,      // 0–1, decrements by decay each tick
  decay = 0,
} = {}) {
  return { x, y, vx, vy, ax, ay, friction, radius, mass, life, decay, alive: true }
}

/**
 * Tick a particle forward one step
 */
export function tickParticle(p) {
  p.vx = (p.vx + p.ax) * p.friction
  p.vy = (p.vy + p.ay) * p.friction
  p.x += p.vx
  p.y += p.vy
  p.life -= p.decay
  if (p.life <= 0) p.alive = false
}

/**
 * Spring force: pull point (x,y) toward (tx,ty)
 * Returns { fx, fy }
 */
export function spring(x, y, tx, ty, stiffness = 0.1) {
  return { fx: (tx - x) * stiffness, fy: (ty - y) * stiffness }
}

/**
 * Repel point (x,y) away from (ox,oy) within radius.
 * Returns { fx, fy }
 */
export function repel(x, y, ox, oy, radius = 80, strength = 5) {
  const d = dist(x, y, ox, oy)
  if (d === 0 || d > radius) return { fx: 0, fy: 0 }
  const factor = (1 - d / radius) * strength
  const n = normalize(x - ox, y - oy)
  return { fx: n.x * factor, fy: n.y * factor }
}
