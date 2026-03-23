/**
 * Text utilities for motion experiments
 */

/**
 * Split a string into individual characters (grapheme-aware)
 * Returns array of { char, index }
 */
export function splitChars(str) {
  const seg = typeof Intl?.Segmenter !== 'undefined'
    ? new Intl.Segmenter().segment(str)
    : null

  if (seg) {
    return [...seg].map((s, i) => ({ char: s.segment, index: i }))
  }
  // Fallback: spread (handles basic emoji/surrogate pairs)
  return [...str].map((char, index) => ({ char, index }))
}

/**
 * Measure each character's bounding box on a canvas context.
 * Returns array of { char, x, y, width, height, index }
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x  - start x
 * @param {number} y  - baseline y
 */
export function measureChars(ctx, text, x = 0, y = 0) {
  const chars = splitChars(text)
  let cursor = x
  return chars.map(({ char, index }) => {
    const m = ctx.measureText(char)
    const w = m.width
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
    const entry = { char, index, x: cursor, y, width: w, height: h }
    cursor += w
    return entry
  })
}

/**
 * Word-wrap text into lines that fit within maxWidth.
 */
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}
