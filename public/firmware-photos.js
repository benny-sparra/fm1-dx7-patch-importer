// Turns each firmware card's thumbnail into a button that opens the full photo in a modal dialog
// drawn like the editor's (`Dialog` in src/components/ui/dialog.tsx): the title bar with its
// hairlines and bracketed close, a recessed well, and the classic Mac zoom rectangles growing out
// of the thumbnail as it opens and back into it as it closes (src/lib/zoom-rects.ts). The page
// shares no JavaScript with the editor, so the zoom is repeated here; the look comes from the
// classes in index.css. Escape, the close button, or a click outside the photo closes it, and
// focus returns to the thumbnail. Without this script the thumbnails stay plain pictures. A plain
// script served as it is, for the reason firmware-colourway.js gives.
// Its names stay inside a function, since the page's plain scripts share one global scope: two
// scripts each declaring close() once made Escape close the photo rather than the menu.
;(() => {
  const zoomRectCount = 12
  const zoomRectStepMs = 16
  const zoomRectTrail = 3
  const zoomRectsArriveMs = (zoomRectCount - 1) * zoomRectStepMs

  function visibleBox(element) {
    if (!element) return undefined
    const rect = element.getBoundingClientRect()
    const left = Math.max(rect.left, 0)
    const top = Math.max(rect.top, 0)
    const right = Math.min(rect.right, window.innerWidth)
    const bottom = Math.min(rect.bottom, window.innerHeight)
    if (right <= left || bottom <= top) return undefined
    return { height: bottom - top, left, top, width: right - left }
  }

  function zoomRects(from, to) {
    if (!from || !to) return
    const layer = document.createElement('div')
    layer.className = 'zoom-rects'
    layer.setAttribute('aria-hidden', 'true')
    for (let index = 0; index < zoomRectCount; index++) {
      const progress = index / (zoomRectCount - 1)
      const between = (start, end) => `${start + (end - start) * progress}px`
      const outline = document.createElement('div')
      outline.className = 'zoom-rect'
      Object.assign(outline.style, {
        animationDelay: `${index * zoomRectStepMs}ms`,
        animationDuration: `${zoomRectTrail * zoomRectStepMs}ms`,
        height: between(from.height, to.height),
        left: between(from.left, to.left),
        top: between(from.top, to.top),
        width: between(from.width, to.width),
      })
      layer.append(outline)
    }
    document.body.append(layer)
    window.setTimeout(() => layer.remove(), (zoomRectCount - 1 + zoomRectTrail) * zoomRectStepMs)
  }

  const dialog = document.createElement('dialog')
  dialog.className = 'modal-surface firmware-lightbox'
  dialog.setAttribute('aria-labelledby', 'firmware-lightbox-title')
  dialog.innerHTML = `
  <div class="crt-titlebar firmware-lightbox-bar">
    <h2 class="font-dot-matrix firmware-lightbox-title" id="firmware-lightbox-title"></h2>
    <button class="firmware-lightbox-close" type="button" aria-label="Close">
      <span aria-hidden="true">[╳]</span>
    </button>
  </div>
  <div class="firmware-lightbox-well">
    <img class="firmware-lightbox-image" alt="" decoding="async" />
  </div>
`
  document.body.append(dialog)

  const title = dialog.querySelector('.firmware-lightbox-title')
  const image = dialog.querySelector('.firmware-lightbox-image')
  let opener = null
  let closingFrom

  function nameOf(element) {
    const name = element.closest('.firmware-entry')?.querySelector('.firmware-title')?.textContent
    return (name ?? '').replace(/\s+/g, ' ').trim()
  }

  function open(thumbnail, button) {
    if (dialog.open || typeof dialog.showModal !== 'function') return
    title.textContent = nameOf(thumbnail)
    image.src = thumbnail.getAttribute('src') ?? ''
    image.alt = thumbnail.alt
    image.width = thumbnail.width
    image.height = thumbnail.height
    opener = button
    // Hidden until the outlines have grown out of the thumbnail, as a Finder window appeared.
    const from = visibleBox(button)
    if (from) dialog.dataset.zooming = ''
    dialog.showModal()
    const to = visibleBox(dialog)
    if (!from || !to) {
      delete dialog.dataset.zooming
      return
    }
    zoomRects(from, to)
    window.setTimeout(() => delete dialog.dataset.zooming, zoomRectsArriveMs)
  }

  function close() {
    closingFrom = visibleBox(dialog)
    dialog.close()
  }

  dialog.querySelector('.firmware-lightbox-close')?.addEventListener('click', close)
  // A click on the backdrop lands on the dialog itself, outside its contents.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close()
  })
  // Escape closes the dialog without the close function, so its box is taken as it starts to.
  dialog.addEventListener('cancel', () => {
    closingFrom = visibleBox(dialog)
  })
  dialog.addEventListener('close', () => {
    delete dialog.dataset.zooming
    image.removeAttribute('src')
    opener?.focus()
    const from = closingFrom
    closingFrom = undefined
    const to = visibleBox(opener)
    requestAnimationFrame(() => zoomRects(from, to))
  })

  for (const thumbnail of document.querySelectorAll('.firmware-head .firmware-photo img')) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'firmware-photo-button'
    const label = `Enlarge the photo of ${nameOf(thumbnail)}`
    button.setAttribute('aria-label', label)
    button.title = label
    thumbnail.replaceWith(button)
    button.append(thumbnail)
    button.addEventListener('click', () => open(thumbnail, button))
  }
})()
