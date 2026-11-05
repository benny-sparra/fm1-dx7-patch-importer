// Fades the FM1 beside the Latest strip through its finishes, one every few seconds, starting on
// the finish chosen in the editor (the page's data-fm1-colorway, which firmware-colourway.js sets).
// Each photo is only decoration, hidden from assistive technology. Only the photo shown and the next
// load, so the page opens with one. With reduced motion, or when the photo is not shown (below
// 64rem), it stays on the first and loads no other. A plain script served as it is, for the
// reason firmware-colourway.js gives; its names stay inside a function, since the page's plain
// scripts share one global scope.
;(() => {
  const holdMs = 4000
  const showcase = document.querySelector('.firmware-showcase')
  const photos = [...document.querySelectorAll('.firmware-showcase-photo')]
  if (!showcase || photos.length === 0) return

  const chosen = document.documentElement.dataset.fm1Colorway
  let shown = Math.max(
    0,
    photos.findIndex((photo) => photo.dataset.colorway === chosen),
  )

  // Shows a photo, and readies the next, so it loads during this one's turn rather than all six
  // loading as the page opens.
  function show(index) {
    photos.forEach((photo, at) => photo.classList.toggle('is-shown', at === index))
    ready(photos[index])
    shown = index
  }

  // A photo displayed after the page has loaded is not always picked up by the browser's lazy
  // loading, so a photo readied loads at once.
  function ready(photo) {
    photo.classList.add('is-ready')
    photo.loading = 'eager'
  }

  function readyNext() {
    ready(photos[(shown + 1) % photos.length])
  }

  // The next photo waits until it has loaded, so a fade never shows a blank frame. It waits on the
  // load event rather than decode(), which some browsers never settle for an image drawn at no
  // opacity.
  function loaded(photo) {
    return new Promise((resolve) => {
      if (photo.complete) resolve()
      else {
        photo.addEventListener('load', resolve, { once: true })
        photo.addEventListener('error', resolve, { once: true })
      }
    })
  }

  async function advance() {
    const next = (shown + 1) % photos.length
    ready(photos[next])
    await loaded(photos[next])
    show(next)
    readyNext()
  }

  show(shown)

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  let timer = 0

  function run() {
    window.clearInterval(timer)
    timer = 0
    if (reducedMotion?.matches || getComputedStyle(showcase).display === 'none') return
    void loaded(photos[shown]).then(readyNext)
    timer = window.setInterval(() => void advance(), holdMs)
  }

  run()
  reducedMotion?.addEventListener?.('change', run)
  window.addEventListener('resize', () => {
    if (!timer) run()
  })
  // A hidden tab holds its timers back, so it picks up where it left off rather than catching up.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearInterval(timer)
      timer = 0
    } else run()
  })
})()
