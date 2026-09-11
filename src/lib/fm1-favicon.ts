import { type Fm1Colorway } from './fm1-colorway'

/*
 * The static favicon is black with white lettering. Once the app has booted,
 * swap in the selected finish's icon: each public/favicon-<colourway>.svg
 * paints the tile in the CRT's darkest surface and the lettering in its bright
 * phosphor accent. They are files rather than a generated data: URL because
 * the production CSP only admits images from 'self'; fm1-favicon.test.ts keeps
 * their colours in step with the tokens in index.css.
 */
export function applyFm1Favicon(colorway: Fm1Colorway) {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!link) {
    return
  }

  link.type = 'image/svg+xml'
  link.setAttribute('href', `/favicon-${colorway}.svg`)
}
