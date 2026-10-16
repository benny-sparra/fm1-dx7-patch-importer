// Folds each firmware entry's blurb to its first few lines, with a More button that shows the
// rest. It runs in the head, before the page paints, and marks the page so the stylesheet folds
// the blurbs from the first frame: folding them once the cards had painted would move every card
// below. Without this script the blurbs show in full. A blurb that fits in its folded lines, and
// has no paragraph after it, gets no button. A card the address links to opens unfolded. A plain
// script served as it is, for the reason firmware-colourway.js gives.
document.documentElement.dataset.firmwareFolds = ''

const toggles = new Map()

function blurbsOf(entry) {
  return [...entry.querySelectorAll('.firmware-blurb')]
}

function overflows(entry) {
  const [first, ...rest] = blurbsOf(entry)
  return rest.length > 0 || first.scrollHeight > first.clientHeight + 1
}

function setOpen(entry, open) {
  const button = toggles.get(entry)
  entry.toggleAttribute('data-open', open)
  button.setAttribute('aria-expanded', String(open))
  // The label names the firmware, since every card has a button that reads the same.
  const label = open ? 'Less' : 'More'
  button.textContent = label
  button.setAttribute('aria-label', `${label} about ${button.dataset.name}`)
}

// Whether a folded blurb overflows depends on the card's width, which the window and the web
// fonts change, so an entry still folded checks again whenever either does.
function showToggles() {
  for (const [entry, button] of toggles) {
    if (!entry.hasAttribute('data-open')) button.hidden = !overflows(entry)
  }
}

function addToggles() {
  for (const entry of document.querySelectorAll('.firmware-entry')) {
    const blurbs = blurbsOf(entry)
    if (blurbs.length === 0) continue
    const name =
      entry.querySelector('.firmware-title')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'firmware-more'
    button.dataset.name = name
    blurbs.at(-1).after(button)
    toggles.set(entry, button)
    setOpen(entry, false)
    button.addEventListener('click', () => {
      const open = !entry.hasAttribute('data-open')
      setOpen(entry, open)
      // Folding a long blurb can leave the top of its card above the window.
      if (!open && entry.getBoundingClientRect().top < 0) {
        entry.scrollIntoView()
      }
    })
  }
  openTarget()
  showToggles()
  let frame = 0
  window.addEventListener('resize', () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(showToggles)
  })
  void document.fonts?.ready.then(showToggles)
}

function openTarget() {
  const target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null
  if (target && toggles.has(target)) setOpen(target, true)
}

window.addEventListener('hashchange', openTarget)

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addToggles)
} else {
  addToggles()
}
