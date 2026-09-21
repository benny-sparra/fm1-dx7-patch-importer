import type { Fm1Colorway } from './fm1-colorway'

/*
 * The static favicon is a white tile carrying a black waveform trace. Once
 * the app has booted, swap in the selected finish's icon: each
 * public/favicon-<colourway>.svg floods the tile with that finish's bright
 * phosphor accent and draws the trace in the CRT's darkest surface, so the
 * colour reads at tab size rather than hiding in a few lit strokes. They are
 * files rather than a generated data: URL because the production CSP only
 * admits images from 'self'; fm1-favicon.test.ts keeps their colours in step
 * with the tokens in index.css.
 */
export function applyFm1Favicon(colorway: Fm1Colorway) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    return
  }

  link.type = 'image/svg+xml'
  link.setAttribute('href', `/favicon-${colorway}.svg`)
}
