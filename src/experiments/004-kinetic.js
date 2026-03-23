import { splitChars } from '../utils/text.js'
import { createMouse } from '../utils/mouse.js'
import { lerp } from '../utils/physics.js'

export const meta = {
  id: '004-kinetic',
  title: 'Kinetic',
  description: '"324.ing" 키네틱 타이포 + 마우스 반발 스프링',
  date: '2026-03-23',
}

const BASE_SIZE  = 96
const MAX_SIZE   = BASE_SIZE * 1.2
const PHASE_GAP  = 0.55
const MOUSE_R    = 320
const SPRING_K   = 0.08
const FRICTION   = 0.85
const BASE_AMP   = 0.18
const MAX_AMP    = 2.0
const COLOR_A    = { r: 200, g: 164, b:  92 }
const COLOR_B    = { r: 232, g: 213, b: 163 }

function makeFont(size) {
  return `900 ${size}px 'Noto Sans KR', sans-serif`
}

function lerpColor(a, b, t) {
  return `rgb(${Math.round(lerp(a.r, b.r, t))},${Math.round(lerp(a.g, b.g, t))},${Math.round(lerp(a.b, b.b, t))})`
}

// ── Control panel DOM ─────────────────────────────────────
function createPanel(state, onTextChange) {
  const panel = document.createElement('div')
  panel.style.cssText = `
    position: fixed;
    bottom: 28px;
    right: 28px;
    z-index: 200;
    background: rgba(10,10,12,0.88);
    border: 1px solid #1e1c18;
    border-radius: 6px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 240px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #5a5850;
    backdrop-filter: blur(8px);
  `

  function row(label, el) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;align-items:center;gap:10px;'
    const lbl = document.createElement('span')
    lbl.textContent = label
    lbl.style.cssText = 'width:52px;letter-spacing:0.1em;flex-shrink:0;'
    wrap.append(lbl, el)
    return wrap
  }

  // Text input
  const textInput = document.createElement('input')
  textInput.type = 'text'
  textInput.value = state.text
  textInput.style.cssText = `
    flex: 1;
    background: #141412;
    border: 1px solid #2a2820;
    border-radius: 3px;
    color: #c8a45c;
    font-family: inherit;
    font-size: 11px;
    padding: 5px 8px;
    outline: none;
    letter-spacing: 0.06em;
  `
  textInput.addEventListener('input', () => {
    state.text = textInput.value || ' '
    onTextChange()
  })

  // Slider factory
  function slider(key, min, max, step = 1) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;align-items:center;gap:8px;flex:1;'

    const input = document.createElement('input')
    input.type = 'range'
    input.min = min
    input.max = max
    input.step = step
    input.value = state[key]
    input.style.cssText = `
      flex: 1;
      height: 2px;
      accent-color: #c8a45c;
      cursor: pointer;
    `

    const val = document.createElement('span')
    val.textContent = state[key]
    val.style.cssText = 'width:28px;text-align:right;color:#c8a45c;'

    input.addEventListener('input', () => {
      state[key] = Number(input.value)
      val.textContent = input.value
    })

    wrap.append(input, val)
    return wrap
  }

  panel.append(
    row('text',   textInput),
    row('speed',  slider('speed',  1, 8)),
    row('amp',    slider('amp',    5, 80)),
    row('radius', slider('radius', 40, 250)),
  )

  document.body.appendChild(panel)
  return panel
}

// ── Init ──────────────────────────────────────────────────
export function init(canvas, ctx) {
  const mouse = createMouse(canvas)
  let raf
  let t = 0

  // Live state (control panel writes here)
  const state = {
    text:   '324.ing',
    speed:  3,
    amp:    30,
    radius: 120,
  }

  // Per-character physics (rebuilt when text changes)
  let chars      = []
  let smoothAmp  = new Float32Array(0)
  let smoothSize = new Float32Array(0)
  let ox = new Float32Array(0)
  let oy = new Float32Array(0)
  let vx = new Float32Array(0)
  let vy = new Float32Array(0)

  function initChars() {
    chars      = splitChars(state.text)
    const n    = chars.length
    smoothAmp  = new Float32Array(n).fill(BASE_AMP)
    smoothSize = new Float32Array(n).fill(BASE_SIZE)
    ox = new Float32Array(n)
    oy = new Float32Array(n)
    vx = new Float32Array(n)
    vy = new Float32Array(n)
  }
  initChars()

  const panel = createPanel(state, initChars)

  function draw() {
    const W  = canvas.width
    const H  = canvas.height
    const cy = H / 2
    const n  = chars.length
    if (n === 0) { raf = requestAnimationFrame(draw); return }

    // Derive live params from state
    const repelR    = state.radius
    const ampFactor = state.amp / 30    // 1.0 at default (30)
    const speed     = state.speed * 0.012

    // ── Measure widths ────────────────────────────────────
    const widths = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      ctx.font = makeFont(smoothSize[i])
      ctx.textBaseline = 'middle'
      widths[i] = ctx.measureText(chars[i].char).width
    }

    // ── Base layout ───────────────────────────────────────
    const totalW = widths.reduce((s, w) => s + w, 0)
    const baseCX = new Float32Array(n)
    let bx = (W - totalW) / 2
    for (let i = 0; i < n; i++) {
      baseCX[i] = bx + widths[i] / 2
      bx += widths[i]
    }

    // ── Physics + proximity ───────────────────────────────
    for (let i = 0; i < n; i++) {
      const ax = baseCX[i] + ox[i]
      const ay = cy + oy[i]
      const dx = ax - mouse.x
      const dy = ay - mouse.y
      const d  = Math.hypot(dx, dy)

      if (d < repelR && d > 0) {
        const factor = (1 - d / repelR) * 10
        vx[i] += (dx / d) * factor
        vy[i] += (dy / d) * factor
      }

      vx[i] += -ox[i] * SPRING_K
      vy[i] += -oy[i] * SPRING_K
      vx[i] *= FRICTION
      vy[i] *= FRICTION
      ox[i] += vx[i]
      oy[i] += vy[i]

      const prox = d < MOUSE_R ? 1 - d / MOUSE_R : 0
      smoothAmp[i]  += (lerp(BASE_AMP, MAX_AMP, prox * prox)  - smoothAmp[i])  * 0.10
      smoothSize[i] += (lerp(BASE_SIZE, MAX_SIZE, prox * prox) - smoothSize[i]) * 0.12
    }

    // Re-measure with updated sizes
    for (let i = 0; i < n; i++) {
      ctx.font = makeFont(smoothSize[i])
      widths[i] = ctx.measureText(chars[i].char).width
    }
    const totalW2 = widths.reduce((s, w) => s + w, 0)
    let x = (W - totalW2) / 2

    // ── Trail ─────────────────────────────────────────────
    ctx.fillStyle = 'rgba(10,10,12,0.15)'
    ctx.fillRect(0, 0, W, H)

    // ── Draw ──────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const phase = i * PHASE_GAP
      const w     = widths[i]
      const amp   = smoothAmp[i] * ampFactor

      const rawScaleX = Math.sin(t        + phase)
      const rawScaleY = Math.cos(t * 1.15 + phase)
      const rawSkewX  = Math.sin(t * 0.85 + phase + 1.2)
      const rawSkewY  = Math.cos(t * 1.3  + phase + 0.8)

      const scaleX = 1 + rawScaleX * amp * 0.4
      const scaleY = 1 + rawScaleY * amp * 0.35
      const skewX  =     rawSkewX  * amp * 0.28
      const skewY  =     rawSkewY  * amp * 0.10

      const drawCX = x + w / 2 + ox[i]
      const drawCY = cy + oy[i]

      const prox   = Math.max(0, 1 - Math.hypot(drawCX - mouse.x, drawCY - mouse.y) / MOUSE_R)
      const deform = (Math.abs(rawScaleX * amp) + Math.abs(rawScaleY * amp) + Math.abs(rawSkewX * amp) * 2) / 1.5
      ctx.fillStyle = lerpColor(COLOR_A, COLOR_B, Math.min(deform + prox * 0.4, 1))

      // Y position → alpha
      const yFactor   = Math.max(0, Math.min(oy[i] / 60, 1))
      ctx.globalAlpha = lerp(1.0, 0.7, yFactor)

      ctx.font = makeFont(smoothSize[i])
      ctx.textBaseline = 'middle'
      ctx.save()
      ctx.translate(drawCX, drawCY)
      ctx.transform(scaleX, skewY, skewX, scaleY, 0, 0)
      ctx.fillText(chars[i].char, -w / 2, 0)
      ctx.restore()
      ctx.globalAlpha = 1

      x += w
    }

    t += speed
    raf = requestAnimationFrame(draw)
  }

  document.fonts.load(makeFont(MAX_SIZE), '324.ing').then(() => draw())

  return function destroy() {
    cancelAnimationFrame(raf)
    mouse.destroy()
    panel.remove()
  }
}
