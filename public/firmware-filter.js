// Shows only the firmware page's entries whose `data-categories` name the chosen kind, or every
// entry for All, and whose text holds every word typed in the search box, and says how many show
// in a status for assistive technology. The search narrows the watch list too, which has no kinds,
// so it shows only for All. A link to an entry the filter or the search hides, such as one in the
// Latest strip, shows every entry again first, so the link still lands on its card. A plain script served as it is, for the reason firmware-colourway.js
// gives.
const filters = [...document.querySelectorAll('.firmware-filter-option')]
const filtered = [...document.querySelectorAll('.firmware-entry')]
const filterStatus = document.getElementById('firmware-filter-status')
const search = document.getElementById('firmware-search')
const empty = document.getElementById('firmware-empty')
const kindMenu = document.querySelector('.firmware-kind-menu')
const kindCurrent = document.getElementById('firmware-kind-current')
const grid = document.querySelector('.firmware-grid')
const watch = document.querySelector('.firmware-watch')
const watched = [...document.querySelectorAll('.firmware-watch-item')]
const count = document.getElementById('firmware-count')
const watchCount = document.getElementById('firmware-watch-count')
let category = 'all'
const texts = new Map()

function categoriesOf(entry) {
  return (entry.dataset.categories ?? '').split(/\s+/)
}

// What a search reads: the maker, name, and blurb or note, lower case, taken once and kept.
function textOf(entry) {
  if (!texts.has(entry)) {
    const parts = entry.querySelectorAll(
      '.synthwave-kicker, .firmware-title, .firmware-blurb, .firmware-watch-name, .firmware-watch-maker',
    )
    const text = [...parts].map((part) => part.textContent).join(' ')
    texts.set(entry, text.replace(/\s+/g, ' ').toLowerCase())
  }
  return texts.get(entry)
}

// Each card shows its kinds at the end of its maker line, as the Show menu's icons, named for
// assistive technology and in a tooltip. They come from data-categories, so a new entry needs no
// markup of its own for them.
const kindNames = new Map(
  filters.map((filter) => [
    filter.dataset.category,
    filter.textContent.replace(/\d+/g, '').replace(/\s+/g, ' ').trim(),
  ]),
)

function showKinds(entry) {
  const maker = entry.querySelector('.synthwave-kicker')
  if (!maker) return
  const kinds = document.createElement('span')
  kinds.className = 'firmware-kinds'
  for (const kind of categoriesOf(entry)) {
    const name = kindNames.get(kind)
    if (!name) continue
    const icon = document.createElement('span')
    icon.className = 'firmware-kind'
    icon.title = name
    icon.innerHTML = `<svg aria-hidden="true" class="firmware-icon" height="12" width="12"><use href="#icon-${kind}" /></svg><span class="sr-only">${name}</span>`
    kinds.append(icon)
  }
  if (kinds.childElementCount > 0) maker.append(kinds)
}

for (const entry of filtered) showKinds(entry)

// Every typed word must appear somewhere on the card.
function words() {
  return (search?.value ?? '').toLowerCase().split(/\s+/).filter(Boolean)
}

function update(announce = true) {
  const typed = words()
  let shown = 0
  for (const entry of filtered) {
    const matches =
      (category === 'all' || categoriesOf(entry).includes(category)) &&
      typed.every((word) => textOf(entry).includes(word))
    entry.hidden = !matches
    if (matches) shown += 1
  }
  for (const filter of filters) {
    const chosen = filter.dataset.category === category
    filter.setAttribute('aria-pressed', String(chosen))
    // The Show menu's button shows the kind chosen, with its icon and count.
    if (chosen && kindCurrent) kindCurrent.innerHTML = filter.innerHTML
  }
  let watchShown = 0
  for (const item of watched) {
    const matches = category === 'all' && typed.every((word) => textOf(item).includes(word))
    item.hidden = !matches
    if (matches) watchShown += 1
  }
  if (watch) watch.hidden = watchShown === 0
  if (empty) empty.hidden = shown + watchShown > 0
  if (grid) grid.hidden = !filtered.some((entry) => grid.contains(entry) && !entry.hidden)
  // The counts in sight: all of them, or how many of all show.
  const ofAll = (part, all) => (part === all ? String(all) : `${part} of ${all}`)
  if (count) count.textContent = `${ofAll(shown, filtered.length)} firmwares`
  if (watchCount) watchCount.textContent = ofAll(watchShown, watched.length)
  if (filterStatus && announce) {
    const counted =
      shown === filtered.length
        ? `Showing all ${shown} firmwares`
        : `Showing ${shown} of ${filtered.length} firmwares`
    // While searching, it also says how much of the watch list matches.
    filterStatus.textContent =
      typed.length > 0 ? `${counted}, and ${watchShown} on the watch list` : counted
  }
}

function showCategory(next) {
  category = next
  update()
}

for (const filter of filters) {
  filter.addEventListener('click', () => {
    showCategory(filter.dataset.category)
    if (kindMenu?.open) {
      kindMenu.open = false
      kindMenu.querySelector('summary')?.focus()
    }
  })
}

search?.addEventListener('input', () => update())

// Fill the counts in as the page loads, without announcing them.
update(false)

document.getElementById('firmware-reset')?.addEventListener('click', () => {
  if (search) search.value = ''
  showCategory('all')
  search?.focus()
})

function revealTarget(hash) {
  const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
  const hidden =
    target?.matches('.firmware-entry[hidden], .firmware-watch[hidden]') ||
    target?.closest('.firmware-watch')?.hidden
  if (!target || !hidden) return undefined
  if (search) search.value = ''
  showCategory('all')
  return target
}

// A click runs before the browser follows the link, so the card shows in time to be scrolled to.
// An address typed or pasted changes the hash with nothing to click, and the browser has already
// failed to scroll to the hidden card, so the card is scrolled to once it shows.
document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null
  if (link) revealTarget(link.getAttribute('href') ?? '')
})

window.addEventListener('hashchange', () => revealTarget(location.hash)?.scrollIntoView())
