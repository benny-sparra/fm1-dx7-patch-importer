// Refreshes the GitHub star counts on the firmware page (firmware/index.html) and the date they
// were read. Each entry with a GitHub repository link and no `data-pinned` gets `data-stars` and a
// visible count in its status line; entries without a repository, such as Groove OS, get neither.
// It reads the public GitHub API, which allows 60 requests an hour without a token; set
// GITHUB_TOKEN to raise that.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { format, resolveConfig } from 'prettier'

const pagePath = path.resolve('firmware/index.html')
const articlePattern = /<article\b[^>]*\bclass="firmware-entry\b[^>]*>[\s\S]*?<\/article>/g
const repositoryPattern = /href="https:\/\/github\.com\/([\w.-]+\/[\w.-]+)"/g
const statusPattern = /(<p class="firmware-status">[\s\S]*?)(<\/p>)/
const starsSpanPattern = /\s*<span class="firmware-stars">[^<]*<\/span\s*>/

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

function withStars(article, stars) {
  const openingTag = article.slice(0, article.indexOf('>') + 1)
  const taggedOpening = /\bdata-stars="\d*"/.test(openingTag)
    ? openingTag.replace(/\bdata-stars="\d*"/, `data-stars="${stars}"`)
    : openingTag.replace(/\s*>$/, ` data-stars="${stars}">`)
  const body = article
    .slice(openingTag.length)
    .replace(starsSpanPattern, '')
    .replace(
      statusPattern,
      (_match, status, end) =>
        `${status.trimEnd()}\n<span class="firmware-stars">${starsLabel(stars)}</span>${end}`,
    )
  return taggedOpening + body
}

const page = await readFile(pagePath, 'utf8')
const counted = []
let updated = page
for (const [article] of page.matchAll(articlePattern)) {
  if (/\bdata-pinned\b/.test(article.slice(0, article.indexOf('>')))) continue
  const repository = entryRepository(article)
  if (!repository) continue
  const stars = await starCount(repository)
  counted.push(`${repository}: ${stars}`)
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
  /<time datetime="[\d-]+">[^<]*<\/time>/,
  `<time datetime="${isoDate}">${longDate}</time>`,
)

const formatted = await format(updated, {
  ...(await resolveConfig(pagePath)),
  filepath: pagePath,
})
await writeFile(pagePath, formatted)
console.log(counted.join('\n'))
