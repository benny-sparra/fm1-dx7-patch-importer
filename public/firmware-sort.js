// Orders the firmware page's entries alphabetically, as the page is written, or by the GitHub
// star counts in their `data-stars`, most first. Entries marked `data-pinned` stay first in either
// order, and entries without a count, such as a paid firmware with no repository, follow the
// counted ones. A plain script served as it is, for the reason firmware-colourway.js gives.
const options = [...document.querySelectorAll('.firmware-sort-option')]
const entries = [...document.querySelectorAll('.firmware-entry:not([data-pinned])')]
const anchor = entries.at(-1)?.nextElementSibling ?? null
const parent = entries[0]?.parentElement

function starsOf(entry) {
  const stars = Number.parseInt(entry.dataset.stars ?? '', 10)
  return Number.isNaN(stars) ? -1 : stars
}

function showOrder(order) {
  const ordered = order === 'stars' ? [...entries].sort((a, b) => starsOf(b) - starsOf(a)) : entries
  for (const entry of ordered) parent?.insertBefore(entry, anchor)
  for (const option of options) {
    option.setAttribute('aria-pressed', String(option.dataset.order === order))
  }
}

for (const option of options) {
  option.addEventListener('click', () => showOrder(option.dataset.order))
}
