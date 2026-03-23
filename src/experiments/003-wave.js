import { splitChars } from '../utils/text.js'

export const meta = {
  id: '003-wave',
  title: 'Wave',
  description: '"324.ing" 텍스트 파동',
  date: '2026-03-23',
}

const TEXT       = '324.ing'
const FONT_SIZE  = 120
const FONT       = `900 ${FONT_SIZE}px 'Noto Sans KR', sans-serif`
const COLOR_LOW  = { r: 200, g: 164, b:  92 }  // #c8a45c
const COLOR_HIGH = { r: 232, g: 213, b: 163 }  // #e8d5a3

function lerpColor(a, b, t) {
  const r  = Math.round(a.r + (b.r - a.r) * t)
  const g  = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `rgb(${r},${g},${bl})`
}

export function init(canvas, ctx) {
  let raf
  let t = 0
  let charWidths = []

  function measure() {
    ctx.font = FONT
    charWidths = splitChars(TEXT).map(({ char }) => ctx.measureText(char).width)
  }

  function draw() {
    const W = canvas.width
    const H = canvas.height

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0a0a0c'
    ctx.fillRect(0, 0, W, H)

    ctx.font = FONT
    ctx.textBaseline = 'middle'

    const chars  = splitChars(TEXT)
    const totalW = charWidths.reduce((s, w) => s + w, 0)
    let x = (W - totalW) / 2

    for (let i = 0; i < chars.length; i++) {
      const wave = Math.sin(t + i * 0.15) * 30
      const y    = H / 2 + wave
      const norm = (wave + 30) / 60

      ctx.fillStyle = lerpColor(COLOR_LOW, COLOR_HIGH, norm)
      ctx.fillText(chars[i].char, x, y)
      x += charWidths[i]
    }

    t += 0.04
    raf = requestAnimationFrame(draw)
  }

  document.fonts.load(FONT, TEXT).then(() => {
    measure()
    draw()
  })

  window.addEventListener('resize', measure)

  return function destroy() {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', measure)
  }
}
