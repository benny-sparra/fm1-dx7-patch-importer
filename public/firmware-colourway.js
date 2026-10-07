// The firmware page takes the finish chosen in the editor, so the two pages look alike. It is a
// plain script served as it is rather than a module Vite builds: any module the firmware page
// shares with the app, Vite's module preload polyfill included, becomes a chunk of its own that
// the app's entry loads too, which cost the initial bundle up to 237 B. A value that names no
// finish matches no `data-fm1-colorway` block in index.css, so the default finish shows.
try {
  const colorway = localStorage.getItem('fm1-colourway')
  if (colorway && /^[a-z-]+$/.test(colorway)) {
    document.documentElement.dataset.fm1Colorway = colorway
  }
} catch {
  // Blocked storage leaves the default finish.
}
