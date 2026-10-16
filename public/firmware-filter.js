// Shows only the firmware page's entries whose `data-categories` name the chosen kind, or every
// entry for All, and says how many show in a status for assistive technology. A link to an entry
// the filter hides, such as one in the Latest strip, shows every entry again first, so the link
// still lands on its card. A plain script served as it is, for the reason firmware-colourway.js
// gives.
const filters = [...document.querySelectorAll('.firmware-filter-option')]
const filtered = [...document.querySelectorAll('.firmware-entry')]
const filterStatus = document.getElementById('firmware-filter-status')

function categoriesOf(entry) {
  return (entry.dataset.categories ?? '').split(/\s+/)
}

function showCategory(category) {
  let shown = 0
  for (const entry of filtered) {
    const matches = category === 'all' || categoriesOf(entry).includes(category)
    entry.hidden = !matches
    if (matches) shown += 1
  }
  for (const filter of filters) {
    filter.setAttribute('aria-pressed', String(filter.dataset.category === category))
  }
  if (filterStatus) {
    filterStatus.textContent =
      category === 'all'
        ? `Showing all ${shown} firmwares`
        : `Showing ${shown} of ${filtered.length} firmwares`
  }
}

for (const filter of filters) {
  filter.addEventListener('click', () => showCategory(filter.dataset.category))
}

function revealTarget(hash) {
  const target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
  if (!target?.matches('.firmware-entry[hidden]')) return undefined
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
