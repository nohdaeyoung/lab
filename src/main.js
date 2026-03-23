import './style.css'

const app = document.getElementById('app')
const canvas = document.getElementById('canvas')

// Vite glob — lazily load each experiment
const modules = import.meta.glob('./experiments/*.js')

let currentDestroy = null

// ── Router ────────────────────────────────────────────────
async function route() {
  const hash = location.hash.slice(1)
  if (hash) {
    await openExperiment(hash)
  } else {
    await showList()
  }
}

// ── List view ─────────────────────────────────────────────
async function showList() {
  if (currentDestroy) {
    currentDestroy()
    currentDestroy = null
  }
  document.querySelector('.back-btn')?.remove()
  document.querySelector('.exp-title')?.remove()
  canvas.classList.remove('visible')
  app.classList.add('visible')

  // Load all experiment meta
  const entries = []
  for (const [path, loader] of Object.entries(modules)) {
    const mod = await loader()
    if (mod.meta) entries.push(mod.meta)
  }
  entries.sort((a, b) => a.id.localeCompare(b.id))

  // Build DOM safely
  app.replaceChildren()

  // Header
  const header = document.createElement('div')
  header.className = 'header'

  const wordmark = document.createElement('span')
  wordmark.className = 'wordmark'
  wordmark.textContent = 'Lab'

  const subtitle = document.createElement('span')
  subtitle.className = 'subtitle'
  subtitle.textContent = `${entries.length} experiments`

  header.append(wordmark, subtitle)

  // Column labels
  const listHeader = document.createElement('div')
  listHeader.className = 'list-header'
  for (const label of ['No.', 'Title', 'Date']) {
    const s = document.createElement('span')
    s.textContent = label
    listHeader.appendChild(s)
  }

  const list = document.createElement('ul')
  list.className = 'experiment-list'

  for (const e of entries) {
    const li = document.createElement('li')
    li.className = 'experiment-item'
    li.dataset.id = e.id

    const num = document.createElement('span')
    num.className = 'num'
    num.textContent = e.id.split('-')[0]

    const title = document.createElement('span')
    title.className = 'title'
    title.textContent = e.title

    const date = document.createElement('span')
    date.className = 'date'
    date.textContent = e.date ?? ''

    li.append(num, title, date)
    li.addEventListener('click', () => { location.hash = e.id })
    list.appendChild(li)
  }

  // Writing map — standalone entry
  const mapItem = document.createElement('li')
  mapItem.className = 'experiment-item experiment-item--special'

  const mapNum = document.createElement('span')
  mapNum.className = 'num'
  mapNum.textContent = '★'

  const mapTitle = document.createElement('span')
  mapTitle.className = 'title'
  mapTitle.textContent = 'Writing Map'

  const mapDate = document.createElement('span')
  mapDate.className = 'date'
  mapDate.textContent = '2026-03-23'

  mapItem.append(mapNum, mapTitle, mapDate)
  mapItem.addEventListener('click', () => { window.open('writing-map.html', '_blank') })
  list.appendChild(mapItem)

  app.append(header, listHeader, list)
}

// ── Experiment view ───────────────────────────────────────
async function openExperiment(id) {
  const key = Object.keys(modules).find(p => p.includes(`/${id}.`))
  if (!key) { location.hash = ''; return }

  app.classList.remove('visible')
  canvas.classList.add('visible')

  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  window.addEventListener('resize', resize)

  const mod = await modules[key]()

  const backBtn = document.createElement('button')
  backBtn.className = 'back-btn'
  backBtn.textContent = '← back'
  backBtn.onclick = () => { location.hash = '' }
  document.body.appendChild(backBtn)

  const titleEl = document.createElement('div')
  titleEl.className = 'exp-title'
  if (mod.meta) {
    const numSpan = document.createElement('span')
    numSpan.className = 'exp-num'
    numSpan.textContent = mod.meta.id.split('-')[0]
    titleEl.append(numSpan, mod.meta.title)
  } else {
    titleEl.textContent = id
  }
  document.body.appendChild(titleEl)

  if (mod.init) {
    const ctx = canvas.getContext('2d')
    const result = mod.init(canvas, ctx)
    currentDestroy = (result instanceof Function) ? result : null
  }

  const cleanup = () => {
    window.removeEventListener('resize', resize)
    backBtn.remove()
    titleEl.remove()
    if (currentDestroy) { currentDestroy(); currentDestroy = null }
  }
  window.addEventListener('hashchange', cleanup, { once: true })
}

// ── Boot ──────────────────────────────────────────────────
window.addEventListener('hashchange', route)
route()
