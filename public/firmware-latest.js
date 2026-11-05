// Hides and shows the Latest strip's list with the eye button beside its heading, and remembers a
// strip hidden until its date changes, so the next day's news shows again. It runs in the head and
// marks the page before it paints, so a strip hidden earlier never shows and then folds. Storage
// that is blocked or throws leaves the strip showing. Without the script the button stays hidden.
// A plain script served as it is, for the reason firmware-colourway.js gives.
const latestKey = 'fm1-firmware-latest-hidden'

function hiddenDate() {
  try {
    return localStorage.getItem(latestKey)
  } catch {
    return null
  }
}

function rememberHidden(date) {
  try {
    if (date) localStorage.setItem(latestKey, date)
    else localStorage.removeItem(latestKey)
  } catch {
    // The choice lasts until the page closes.
  }
}

if (hiddenDate()) document.documentElement.dataset.firmwareLatestHidden = ''

function showLatest(toggle, shown) {
  document.documentElement.toggleAttribute('data-firmware-latest-hidden', !shown)
  const label = shown ? 'Hide the latest changes' : 'Show the latest changes'
  toggle.setAttribute('aria-expanded', String(shown))
  toggle.setAttribute('aria-label', label)
  toggle.title = label
}

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.firmware-latest-toggle')
  const date = document.querySelector('.firmware-latest-title time')?.getAttribute('datetime')
  if (!toggle || !date) return
  const hidden = hiddenDate() === date
  if (!hidden) rememberHidden(null)
  showLatest(toggle, !hidden)
  toggle.hidden = false
  toggle.addEventListener('click', () => {
    const shown = toggle.getAttribute('aria-expanded') !== 'true'
    showLatest(toggle, shown)
    rememberHidden(shown ? null : date)
  })
})
