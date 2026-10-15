// Compares a built page with the Content-Security-Policy that serves it. A mistake here breaks the
// site rather than weakening it, since the browser refuses what the policy does not list, so this
// catches an inline script, a style element, or a new origin before a deploy does.

const dataScriptTypes = /^(?:application\/(?:ld\+)?json|importmap|speculationrules)$/i

/** The sources a fetch directive allows, falling back to `default-src` as the browser does. */
function sourcesFor(directives, name) {
  return directives.get(name) ?? directives.get('default-src') ?? []
}

function attribute(tag, name) {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag)
  return match ? (match[1] ?? match[2] ?? match[3]) : undefined
}

/** Whether `sources` lets a page load `url`. A relative address is the site's own, `'self'`. */
function allows(sources, url) {
  if (/^data:/i.test(url)) return sources.includes('data:')
  if (!/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(url)) return sources.includes("'self'")
  const origin = new URL(url, 'https://page.invalid').origin
  return sources.includes(origin)
}

/**
 * Lists what in a page's HTML its policy would block. `directives` maps each directive to its
 * sources, as `check-security-headers.mjs` parses them from `public/_headers`.
 */
export function findHtmlPolicyViolations(html, directives) {
  const violations = []
  const markup = html.replace(/<!--[\s\S]*?-->/g, '')

  const checkOrigin = (tag, url, directive) => {
    if (url && !allows(sourcesFor(directives, directive), url)) {
      violations.push(`${tag} loads ${url}, which ${directive} does not allow.`)
    }
  }

  for (const [, attributes, body] of markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const source = attribute(attributes, 'src')
    if (source === undefined) {
      const type = attribute(attributes, 'type')
      if (body.trim() && !(type && dataScriptTypes.test(type))) {
        violations.push('An inline <script> runs code that script-src does not allow.')
      }
    } else checkOrigin('<script>', source, 'script-src')
  }

  if (/<style\b/i.test(markup)) {
    violations.push('A <style> element holds styles that style-src does not allow.')
  }

  for (const [tag] of markup.matchAll(/<link\b[^>]*>/gi)) {
    const rel = (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/)
    const href = attribute(tag, 'href')
    if (rel.includes('stylesheet')) checkOrigin('<link>', href, 'style-src')
    else if (rel.includes('modulepreload')) checkOrigin('<link>', href, 'script-src')
    else if (rel.includes('icon')) checkOrigin('<link>', href, 'img-src')
    else if (rel.includes('preload')) {
      const as = attribute(tag, 'as')
      const directive = {
        font: 'font-src',
        image: 'img-src',
        script: 'script-src',
        style: 'style-src',
      }[as]
      if (directive) checkOrigin('<link>', href, directive)
    }
  }

  for (const [tag] of markup.matchAll(/<img\b[^>]*>/gi)) {
    checkOrigin('<img>', attribute(tag, 'src'), 'img-src')
  }

  for (const [, handler] of markup.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)) {
    violations.push(`An inline ${handler} handler runs code that script-src-attr does not allow.`)
  }

  return violations
}
