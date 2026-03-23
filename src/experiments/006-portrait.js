import { createMouse } from '../utils/mouse.js'
import { lerp } from '../utils/physics.js'

export const meta = {
  id: '006-portrait',
  title: 'Portrait',
  description: '코드로 그린 자화상',
  date: '2026-03-23',
}

// ── Traits — the person behind the code ───────────────────
//   [text, weight, hue-shift]  hue: 0=warm-gold / 1=cool-teal
const TRAITS = [
  // Identity core
  ['감(感)',       2.2,  0.0],
  ['오늘감',       1.6,  0.1],
  ['새벽',         1.5,  0.0],
  ['손끝의 온기',   1.3,  0.0],
  ['독립',         1.2,  0.0],

  // Design sensibility
  ['따뜻함',       1.8,  0.0],
  ['미니멀',       1.5,  0.2],
  ['에디토리얼',   1.3,  0.2],
  ['정밀',         1.6,  0.3],
  ['타이포그래피', 1.2,  0.1],

  // Code personality
  ['spring',      1.4,  0.6],
  ['kinetic',     1.2,  0.6],
  ['physics',     1.3,  0.7],
  ['trail',       1.1,  0.6],
  ['vanilla',     1.1,  0.7],
  ['motion',      1.2,  0.5],
  ['실험',         1.3,  0.4],
  ['Float32',     1.0,  0.8],
  ['어둠 속',      1.4,  0.1],
  ['0.08',        0.9,  0.7],

  // ── 감성 확장 ────────────────────────────────────────────

  // 잔영 / 기억
  ['잔상',         1.5,  0.1],   // afterimage — what trail leaves
  ['여운',         1.4,  0.0],   // resonance / the feeling that lingers
  ['흔적',         1.3,  0.1],   // trace, the mark left behind
  ['번짐',         1.2,  0.0],   // blur/bleed — soft edges

  // 고요와 숨
  ['숨',           1.6,  0.0],   // breath — animations that breathe
  ['고요함',       1.5,  0.0],   // stillness sought amid motion
  ['여백',         1.4,  0.0],   // negative space — core design value
  ['결',           1.3,  0.0],   // grain, texture, paper feeling

  // 인간적
  ['머뭇거림',     1.2,  0.0],   // hesitation — authentic, human
  ['낮은 목소리',  1.1,  0.0],   // quiet voice — their work never shouts
  ['고집',         1.3,  0.1],   // conviction / stubbornness (opinionated)
  ['깊이',         1.4,  0.2],   // depth, layers beneath the surface

  // 기술 시어
  ['lerp',        1.2,  0.7],   // their most-used function — almost poetic
  ['easing',      1.3,  0.6],   // the art of getting from A to B gracefully
  ['bezier',      1.1,  0.7],   // the curve of intention
  ['0.45s',       0.9,  0.6],   // their signature transition duration
  ['ghosting',    1.1,  0.5],   // what trail effect does

  // 감각
  ['밀도',         1.1,  0.2],   // density / weight
  ['선명함',       1.2,  0.3],   // clarity — what they strive for
  ['delta',       1.0,  0.8],   // small change, big meaning
]

const BG          = '#0a0a0c'
const BG_RGBA     = 'rgba(10,10,12,0.14)'
const GOLD_WARM   = [200, 164,  92]   // #c8a45c
const GOLD_BRIGHT = [232, 213, 163]   // #e8d5a3
const COOL_TEAL   = [ 78, 160, 140]   // muted teal for technical words
const INACTIVE    = [ 38,  38,  40]

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))  // ≈ 137.5°

function lerpRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function rgbStr([r, g, b]) { return `rgb(${r},${g},${b})` }

function makeFont(size, weight = 400) {
  return `${weight} ${size}px 'Noto Sans KR', sans-serif`
}

// ── Trait particle ────────────────────────────────────────
class Trait {
  constructor(text, weight, hue, homeX, homeY, phaseX, phaseY) {
    this.text   = text
    this.weight = weight
    this.hue    = hue          // 0=warm-gold, 1=cool
    this.hx     = homeX        // home position
    this.hy     = homeY
    this.px     = phaseX       // drift phase
    this.py     = phaseY
    this.ox     = 0            // spring offset
    this.oy     = 0
    this.vx     = 0
    this.vy     = 0
    this.speed  = 0
  }

  update(t, mouse, repelR = 120) {
    // Slow organic drift around home
    const drift  = 18
    const tx     = this.hx + Math.sin(t * 0.4 + this.px) * drift
    const ty     = this.hy + Math.cos(t * 0.35 + this.py) * drift

    // Actual position including spring offset
    const ax = tx + this.ox
    const ay = ty + this.oy

    const dx = ax - mouse.x
    const dy = ay - mouse.y
    const d  = Math.hypot(dx, dy)

    // Mouse repel
    if (d < repelR && d > 0) {
      const f = (1 - d / repelR) * 7
      this.vx += (dx / d) * f
      this.vy += (dy / d) * f
    }

    // Spring back to drift target
    this.vx += (tx - ax) * 0.04
    this.vy += (ty - ay) * 0.04
    this.vx *= 0.88
    this.vy *= 0.88
    this.ox += this.vx
    this.oy += this.vy
    this.speed = Math.hypot(this.vx, this.vy)
  }

  draw(ctx, t, vmin) {
    const x = this.hx + Math.sin(t * 0.4 + this.px) * 18 + this.ox
    const y = this.hy + Math.cos(t * 0.35 + this.py) * 18 + this.oy

    const fontSize = vmin * 1.5 * this.weight
    ctx.font = makeFont(fontSize, this.weight >= 1.4 ? 700 : this.weight >= 1.1 ? 500 : 300)
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    // Color: blend warm-gold ↔ cool-teal based on hue, then intensity by speed
    const baseColor = lerpRgb(GOLD_WARM, COOL_TEAL, this.hue)
    const energy    = Math.min(this.speed * 0.5 + 0.15, 1)
    const color     = lerpRgb(lerpRgb(INACTIVE, baseColor, 0.55), GOLD_BRIGHT, energy)

    // Glow on energy
    if (energy > 0.3) {
      const [r, g, b] = baseColor
      ctx.shadowColor = `rgba(${r},${g},${b},${(energy * 0.6).toFixed(2)})`
      ctx.shadowBlur  = energy * 16
    } else {
      ctx.shadowBlur = 0
    }

    ctx.fillStyle = rgbStr(color)
    ctx.fillText(this.text, x, y)
    ctx.shadowBlur = 0
  }
}

// ── Init ──────────────────────────────────────────────────
export function init(canvas, ctx) {
  const mouse = createMouse(canvas)
  let raf, t = 0

  const W = () => canvas.width
  const H = () => canvas.height

  let traits = []

  function build() {
    const cx   = W() / 2
    const cy   = H() / 2
    const vmin = Math.min(W(), H()) / 100

    traits = TRAITS.map(([text, weight, hue], i) => {
      // Golden angle spiral — natural, non-overlapping distribution
      const angle  = i * GOLDEN_ANGLE
      const radius = vmin * (10 + i * 2.8)
      const hx     = cx + Math.cos(angle) * radius
      const hy     = cy + Math.sin(angle) * radius
      return new Trait(text, weight, hue, hx, hy, angle, angle * 1.3)
    })
  }

  function drawCenter(vmin) {
    const cx = W() / 2
    const cy = H() / 2

    // Gentle breathing
    const breathe  = 1 + Math.sin(t * 0.7) * 0.015
    const fontSize = vmin * 9 * breathe

    ctx.save()
    ctx.font         = makeFont(fontSize, 900)
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'

    // Glow layers
    ctx.shadowColor = `rgba(200,164,92,0.35)`
    ctx.shadowBlur  = 40
    ctx.fillStyle   = rgbStr(GOLD_BRIGHT)
    ctx.fillText('324.ing', cx, cy)

    ctx.shadowBlur  = 15
    ctx.shadowColor = `rgba(232,213,163,0.5)`
    ctx.fillStyle   = `rgba(232,213,163,0.9)`
    ctx.fillText('324.ing', cx, cy)

    ctx.restore()
  }

  function drawSubtitle(vmin) {
    const cx = W() / 2
    const cy = H() / 2

    ctx.font         = `300 ${vmin * 1.1}px 'JetBrains Mono', monospace`
    ctx.textAlign    = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle    = 'rgba(90,85,75,0.6)'
    ctx.shadowBlur   = 0
    ctx.fillText('코드로 그린 자화상', cx, cy + vmin * 6.8)
  }

  function draw() {
    const vmin = Math.min(W(), H()) / 100

    // Trail
    ctx.fillStyle = BG_RGBA
    ctx.fillRect(0, 0, W(), H())

    // Traits
    for (const tr of traits) {
      tr.update(t, mouse)
      tr.draw(ctx, t, vmin)
    }

    // Center anchor
    drawCenter(vmin)
    drawSubtitle(vmin)

    t += 0.016
    raf = requestAnimationFrame(draw)
  }

  // Init background
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, W(), H())

  build()
  window.addEventListener('resize', build)

  document.fonts.load(makeFont(48, 900), '324.ing').then(() => {
    raf = requestAnimationFrame(draw)
  })

  return function destroy() {
    cancelAnimationFrame(raf)
    mouse.destroy()
    window.removeEventListener('resize', build)
  }
}
