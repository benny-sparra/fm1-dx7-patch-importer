import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(__dirname, '..')
const text = readFileSync(path.join(root, 'public/llms.txt'), 'utf8')
const links = [...text.matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1])
const repositoryFilePrefix = 'https://github.com/benny-sparra/fm1-dx7-patch-importer/blob/main/'

describe('llms.txt', () => {
  it('opens with the title and a one-paragraph summary', () => {
    expect(text).toMatch(/^# .+\n\n> .+\n/)
  })

  it.each([
    'https://fm1-editor.com/',
    'https://fm1-editor.com/firmware/',
    `${repositoryFilePrefix}docs/fm1-research.md`,
    `${repositoryFilePrefix}docs/switching-firmware.md`,
    `${repositoryFilePrefix}docs/user-guide.md`,
  ])('links to %s', (url) => {
    expect(links).toContain(url)
  })

  it.each(
    links
      .filter((url) => url.startsWith(repositoryFilePrefix))
      .map((url) => url.slice(repositoryFilePrefix.length)),
  )('links to %s, which exists in the repository', (file) => {
    expect(existsSync(path.join(root, file))).toBe(true)
  })
})
