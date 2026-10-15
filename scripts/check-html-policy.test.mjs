import { describe, expect, it } from 'vitest'

import { findHtmlPolicyViolations } from './check-html-policy.mjs'

// The directives the pages are held to, as public/_headers sets them.
const directives = new Map([
  ['default-src', ["'self'"]],
  ['script-src', ["'self'", 'https://cloud.umami.is']],
  ['script-src-attr', ["'none'"]],
  ['style-src', ["'self'"]],
  ['img-src', ["'self'"]],
  ['font-src', ["'self'"]],
])

const violations = (html) => findHtmlPolicyViolations(html, directives)

describe('findHtmlPolicyViolations', () => {
  it('passes a page whose scripts and styles are its own files or listed origins', () => {
    expect(
      violations(`
        <script async src="https://cloud.umami.is/script.js" data-website-id="x"></script>
        <script type="module" crossorigin src="/assets/index-abc.js"></script>
        <link rel="modulepreload" href="/assets/chunk.js">
        <link rel="stylesheet" href="/assets/index.css">
        <link rel="icon" href="/favicon.svg">
        <img src="/photo.webp" alt="">
        <div style="color: red"></div>
        <a href="https://example.com/">A link</a>
      `),
    ).toEqual([])
  })

  it('fails an inline script, which script-src would block', () => {
    expect(violations('<script>window.start()</script>')).toEqual([
      expect.stringContaining('inline <script>'),
    ])
  })

  it('allows a script block that only holds data', () => {
    expect(violations('<script type="application/ld+json">{"@type":"WebSite"}</script>')).toEqual(
      [],
    )
  })

  it('fails a script from an origin the policy does not list', () => {
    expect(violations('<script src="https://cdn.example.com/lib.js"></script>')).toEqual([
      expect.stringContaining('https://cdn.example.com'),
    ])
  })

  it('fails a protocol-relative script from an unlisted origin', () => {
    expect(violations('<script src="//cdn.example.com/lib.js"></script>')).toHaveLength(1)
  })

  it('fails a style element, which style-src would block', () => {
    expect(violations('<style>body { margin: 0 }</style>')).toEqual([
      expect.stringContaining('<style>'),
    ])
  })

  it('fails a stylesheet, an image, and a font from unlisted origins', () => {
    expect(
      violations(`
        <link rel="stylesheet" href="https://fonts.example.com/a.css">
        <img src="https://img.example.com/a.png" alt="">
        <link rel="preload" as="font" href="https://fonts.example.com/a.woff2">
      `),
    ).toHaveLength(3)
  })

  it('fails an image carried in the page itself', () => {
    expect(violations('<img src="data:image/png;base64,AAAA" alt="">')).toHaveLength(1)
  })

  it('fails an inline event handler, which script-src-attr blocks', () => {
    expect(violations('<button onclick="start()">Go</button>')).toEqual([
      expect.stringContaining('onclick'),
    ])
  })

  it('ignores markup inside a comment', () => {
    expect(violations('<!-- <script>old()</script> <style>a{}</style> -->')).toEqual([])
  })

  it('falls back to default-src for a directive the policy leaves out', () => {
    const onlyDefault = new Map([['default-src', ["'self'"]]])

    expect(
      findHtmlPolicyViolations(
        '<script src="https://cloud.umami.is/script.js"></script>',
        onlyDefault,
      ),
    ).toHaveLength(1)
  })
})
