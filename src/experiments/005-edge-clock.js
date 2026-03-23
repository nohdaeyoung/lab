export const meta = {
  id: '005-edge-clock',
  title: 'Edge Clock',
  description: '뷰포트 가장자리 2-링 시계 — trail 효과',
  date: '2026-03-23',
}

const C_BG       = '#0a0a0c'

// RGB tuples for interpolation
const INACTIVE_RGB = [37,  37,  40 ]  // #252528
const HOUR_RGB     = [200, 88,  88 ]  // #c85858
const MIN_RGB      = [78,  126, 200]  // #4e7ec8
const SEC_RGB      = [78,  170, 120]  // #4eaa78

// Trail lengths (including current position)
const SEC_TRAIL = 5   // current + 4 tail
const MIN_TRAIL = 3   // current + 2 tail

// Intensity levels: index 0 = current, higher = older
const SEC_ALPHA = [1.00, 0.50, 0.28, 0.14, 0.07]
const MIN_ALPHA = [1.00, 0.45, 0.20]

const GLOW_HOUR = '0 0 14px rgba(200,88,88,0.55), 0 0 30px rgba(200,88,88,0.22)'
const GLOW_MIN  = '0 0 14px rgba(78,126,200,0.55), 0 0 30px rgba(78,126,200,0.22)'
const GLOW_SEC  = '0 0 14px rgba(78,170,120,0.55), 0 0 30px rgba(78,170,120,0.22)'

const CSS = `
  @keyframes ec-bounce-in {
    0%   { transform: scale(0.82); }
    55%  { transform: scale(1.07); }
    78%  { transform: scale(0.96); }
    100% { transform: scale(1);    }
  }
  @keyframes ec-squash {
    0%   { transform: scale(1); }
    35%  { transform: scaleX(1.05) scaleY(0.87); }
    65%  { transform: scaleX(0.97) scaleY(1.04); }
    100% { transform: scale(1); }
  }
  @keyframes ec-pulse {
    0%   { transform: translate(-50%,-50%) scale(1); }
    35%  { transform: translate(-50%,-50%) scale(1.28); }
    100% { transform: translate(-50%,-50%) scale(1); }
  }
  .ec-wrap {
    position: fixed; inset: 0;
    pointer-events: none;
    transform-origin: center center;
  }
  .ec-digit {
    position: absolute;
    transform: translate(-50%, -50%);
    font-family: 'Noto Sans KR', sans-serif;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
    color: rgb(${INACTIVE_RGB.join(',')});
    text-shadow: none;
    transition: color 0.45s ease, text-shadow 0.5s ease;
  }
`

// ── Color helpers ─────────────────────────────────────────
function lerpRgb(from, to, t) {
  return `rgb(${Math.round(from[0]+(to[0]-from[0])*t)},${Math.round(from[1]+(to[1]-from[1])*t)},${Math.round(from[2]+(to[2]-from[2])*t)})`
}

function trailGlow(rgb, intensity) {
  const a = (intensity * 0.45).toFixed(2)
  return `0 0 10px rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`
}

function pulse(el) {
  el.style.animation = 'none'
  void el.offsetWidth
  el.style.animation = 'ec-pulse 0.4s cubic-bezier(0.22,0.61,0.36,1) forwards'
}

const pad = n => String(n).padStart(2, '0')

// ── Init ──────────────────────────────────────────────────
export function init(canvas, ctx) {
  const fillBg = () => {
    ctx.fillStyle = C_BG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  fillBg()

  const styleTag = document.createElement('style')
  styleTag.textContent = CSS
  document.head.appendChild(styleTag)

  const wrap = document.createElement('div')
  wrap.className = 'ec-wrap'
  document.body.appendChild(wrap)

  const timeEl = document.createElement('div')
  Object.assign(timeEl.style, {
    position: 'fixed', top: '50%', left: '50%',
    transform: 'translate(-50%,-50%)',
    fontFamily: "'JetBrains Mono','Fira Code',monospace",
    fontWeight: '300', fontSize: '12px',
    letterSpacing: '0.18em', color: '#383835',
    pointerEvents: 'none', userSelect: 'none', zIndex: '10',
  })
  document.body.appendChild(timeEl)

  // ── Digits ────────────────────────────────────────────
  function makeDigits(count, weight) {
    const els = []
    for (let n = 1; n <= count; n++) {
      const el = document.createElement('span')
      el.className = 'ec-digit'
      el.style.fontWeight = String(weight)
      el.textContent = String(n)
      wrap.appendChild(el)
      els.push(el)
    }
    return els
  }

  const hourEls = makeDigits(12, 900)
  const ringEls = makeDigits(60, 700)  // shared min + sec ring

  // ── Trail state ───────────────────────────────────────
  let secTrail = []  // [current, -1s, -2s, ...] length ≤ SEC_TRAIL
  let minTrail = []  // [current, -1m, -2m, ...] length ≤ MIN_TRAIL

  // Render a single ring digit based on its trail priority
  function renderRing(pos) {
    const el = ringEls[pos - 1]
    const si = secTrail.indexOf(pos)
    const mi = minTrail.indexOf(pos)

    if (si >= 0) {
      // Sec trail takes priority
      const a = SEC_ALPHA[si]
      el.style.color      = lerpRgb(INACTIVE_RGB, SEC_RGB, a)
      el.style.textShadow = si === 0 ? GLOW_SEC : trailGlow(SEC_RGB, a)
    } else if (mi >= 0) {
      const a = MIN_ALPHA[mi]
      el.style.color      = lerpRgb(INACTIVE_RGB, MIN_RGB, a)
      el.style.textShadow = mi === 0 ? GLOW_MIN : trailGlow(MIN_RGB, a)
    } else {
      el.style.color      = `rgb(${INACTIVE_RGB.join(',')})`
      el.style.textShadow = 'none'
    }
  }

  // Map angle → point on rectangle boundary, inset by `pad`
  function clipToRect(cx, cy, W, H, angle, pad) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const hw = W / 2 - pad
    const hh = H / 2 - pad
    // Minimum t to reach any wall
    const tx = Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity
    const ty = Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity
    const t  = Math.min(tx, ty)
    return { x: cx + dx * t, y: cy + dy * t }
  }

  // ── Layout ────────────────────────────────────────────
  function layout() {
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const vmin = Math.min(W, H) / 100

    const hourSize = vmin * 8.5
    const ringSize = vmin * 3.2

    hourEls.forEach(el => { el.style.fontSize = hourSize + 'px' })
    ringEls.forEach(el => { el.style.fontSize = ringSize + 'px' })

    // Hour ring: snap to viewport rectangle boundary
    const hourPad = hourSize * 0.62
    for (let i = 0; i < 12; i++) {
      const angle = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
      const { x, y } = clipToRect(cx, cy, W, H, angle, hourPad)
      hourEls[i].style.left = x + 'px'
      hourEls[i].style.top  = y + 'px'
    }

    // Inner ring (min + sec): circle, well inside the hour labels
    const minDistToCenter = Math.min(
      ...Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) / 12) * Math.PI * 2 - Math.PI / 2
        const { x, y } = clipToRect(cx, cy, W, H, a, hourPad)
        return Math.hypot(x - cx, y - cy)
      })
    )
    const ringR = Math.max(minDistToCenter - hourSize * 0.55 - ringSize * 1.8, vmin * 10)

    for (let i = 0; i < 60; i++) {
      const a = ((i + 1) / 60) * Math.PI * 2 - Math.PI / 2
      ringEls[i].style.left = (cx + ringR * Math.cos(a)) + 'px'
      ringEls[i].style.top  = (cy + ringR * Math.sin(a)) + 'px'
    }
  }

  // ── Tick ──────────────────────────────────────────────
  let lastH = -1, lastM = -1, lastS = -1

  function tick() {
    const now = new Date()
    const h = now.getHours() % 12 || 12
    const m = now.getMinutes() || 60
    const s = now.getSeconds() || 60

    timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

    // Hour (no trail)
    if (h !== lastH) {
      if (lastH > 0) {
        hourEls[lastH - 1].style.color      = `rgb(${INACTIVE_RGB.join(',')})`
        hourEls[lastH - 1].style.textShadow = 'none'
      }
      hourEls[h - 1].style.color      = `rgb(${HOUR_RGB.join(',')})`
      hourEls[h - 1].style.textShadow = GLOW_HOUR
      pulse(hourEls[h - 1])
      lastH = h
    }

    // Minute trail
    if (m !== lastM) {
      const oldTrail = [...minTrail]
      minTrail.unshift(m)
      if (minTrail.length > MIN_TRAIL) minTrail.pop()

      const affected = new Set([...oldTrail, ...minTrail])
      affected.forEach(renderRing)
      if (m !== lastS) pulse(ringEls[m - 1])  // pulse only if not also sec
      lastM = m
    }

    // Second trail
    if (s !== lastS) {
      const oldTrail = [...secTrail]
      secTrail.unshift(s)
      if (secTrail.length > SEC_TRAIL) secTrail.pop()

      const affected = new Set([...oldTrail, ...secTrail])
      affected.forEach(renderRing)
      pulse(ringEls[s - 1])
      lastS = s
    }
  }

  // ── Resize ────────────────────────────────────────────
  let resizeTimer = null
  let prevVmin = Math.min(canvas.width, canvas.height)

  function triggerAnim(grow) {
    const name   = grow ? 'ec-bounce-in' : 'ec-squash'
    const easing = grow
      ? 'cubic-bezier(0.34,1.56,0.64,1)'
      : 'cubic-bezier(0.25,0.46,0.45,0.94)'
    wrap.style.animation = 'none'
    void wrap.offsetWidth
    wrap.style.animation = `${name} 0.55s ${easing} forwards`
  }

  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      const newVmin = Math.min(canvas.width, canvas.height)
      const grow    = newVmin >= prevVmin
      prevVmin      = newVmin
      fillBg(); layout(); triggerAnim(grow)
    }, 150)
  }

  // ── RAF loop ──────────────────────────────────────────
  let raf
  let lastW = canvas.width, lastH2 = canvas.height

  function loop() {
    if (canvas.width !== lastW || canvas.height !== lastH2) {
      fillBg(); lastW = canvas.width; lastH2 = canvas.height
    }
    tick()
    raf = requestAnimationFrame(loop)
  }

  layout(); tick()
  window.addEventListener('resize', onResize)
  raf = requestAnimationFrame(loop)

  return function destroy() {
    cancelAnimationFrame(raf)
    clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
    wrap.remove(); timeEl.remove(); styleTag.remove()
  }
}
