// Refreshes the GitHub star counts on the firmware page (firmware/index.html) and the date they
// were read. Each entry with a GitHub repository link and no `data-pinned` gets `data-stars` and a
// visible count beside a filled star in its status line; an entry without a repository, such as
// Groove OS, says it is not on GitHub beside an outline star instead, and has no `data-stars`.
// It reads the public GitHub API, which allows 60 requests an hour without a token; set
// GITHUB_TOKEN to raise that.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { format, resolveConfig } from 'prettier'

const pagePath = path.resolve('firmware/index.html')
const articlePattern = /<article\b[^>]*\bclass="firmware-entry\b[^>]*>[\s\S]*?<\/article>/g
const repositoryPattern = /href="https:\/\/github\.com\/([\w.-]+\/[\w.-]+)"/g
const statusPattern = /(<p class="firmware-status">[\s\S]*?)(<\/p>)/
// The count is the status line's last item, so everything from it to the paragraph's end goes.
const starsSpanPattern = /\s*<span class="firmware-stars"[\s\S]*$/

function entryRepository(article) {
  const repositories = new Set([...article.matchAll(repositoryPattern)].map((match) => match[1]))
  if (repositories.size > 1) {
    throw new Error(`An entry links to more than one repository: ${[...repositories].join(', ')}`)
  }
  return [...repositories][0]
}

async function starCount(repository) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const response = await fetch(`https://api.github.com/repos/${repository}`, { headers })
  if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${repository}.`)
  const { stargazers_count: stars } = await response.json()
  if (!Number.isInteger(stars)) throw new Error(`GitHub gave no star count for ${repository}.`)
  return stars
}

function starsLabel(stars) {
  return `${stars} ${stars === 1 ? 'star' : 'stars'} on GitHub`
}

// A star and the bare number; assistive technology and the tooltip read the whole label.
function starsSpan(stars) {
  const star =
    '<svg aria-hidden="true" class="firmware-star" height="12" width="12"><use href="#firmware-star" /></svg>'
  if (stars === undefined) {
    return `<span class="firmware-stars" data-counted="false">${star}Not on GitHub</span>`
  }
  const label = starsLabel(stars)
  return `<span class="firmware-stars" data-counted="true" title="${label}">${star}<span aria-hidden="true">${stars}</span><span class="sr-only">${label}</span></span>`
}

function withStars(article, stars) {
  const openingTag = article.slice(0, article.indexOf('>') + 1)
  const withoutCount = openingTag.replace(/\s*\bdata-stars="\d*"/, '')
  const taggedOpening =
    stars === undefined ? withoutCount : withoutCount.replace(/\s*>$/, ` data-stars="${stars}">`)
  const body = article
    .slice(openingTag.length)
    .replace(
      statusPattern,
      (_match, status, end) =>
        `${status.replace(starsSpanPattern, '').trimEnd()}\n${starsSpan(stars)}${end}`,
    )
  return taggedOpening + body
}

const page = await readFile(pagePath, 'utf8')
const counted = []
let updated = page
for (const [article] of page.matchAll(articlePattern)) {
  const pinned = /\bdata-pinned\b/.test(article.slice(0, article.indexOf('>')))
  const repository = entryRepository(article)
  if (pinned && repository) continue
  const stars = repository ? await starCount(repository) : undefined
  if (repository) counted.push(`${repository}: ${stars}`)
  updated = updated.replace(article, withStars(article, stars))
}

const today = new Date()
const isoDate = today.toISOString().slice(0, 10)
const longDate = today.toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})
updated = updated.replace(
  /(<p class="firmware-sort-note">[\s\S]*?)<time datetime="[\d-]+">[^<]*<\/time>/,
  (_match, note) => `${note}<time datetime="${isoDate}">${longDate}</time>`,
)

const formatted = await format(updated, {
  ...(await resolveConfig(pagePath)),
  filepath: pagePath,
})
await writeFile(pagePath, formatted)
console.log(counted.join('\n'))
