// Each firmware card's split button keeps its other links in a <details> menu, as the Show
// control keeps its kinds, and each opens and closes without this script. This makes it behave
// like a menu: opening one closes the others, and a click outside it, Escape, or Tab moving focus
// out of it closes it, Escape returning focus to its toggle. A plain script served as it is, for the reason firmware-colourway.js gives.
// Its names stay inside a function, since the page's plain scripts share one global scope: two
// scripts each declaring close() once made Escape close the photo rather than the menu.
;(() => {
  const menus = [...document.querySelectorAll('.firmware-link-menu, .firmware-kind-menu')]

  function close(menu, refocus = false) {
    if (!menu.open) return
    menu.open = false
    if (refocus) menu.querySelector('summary')?.focus()
  }

  for (const menu of menus) {
    menu.addEventListener('toggle', () => {
      if (!menu.open) return
      for (const other of menus) if (other !== menu) close(other)
    })
    menu.addEventListener('focusout', (event) => {
      if (!(event.relatedTarget instanceof Node) || !menu.contains(event.relatedTarget)) {
        close(menu)
      }
    })
    menu.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !menu.open) return
      event.preventDefault()
      close(menu, true)
    })
  }

  document.addEventListener('click', (event) => {
    for (const menu of menus) {
      if (menu.open && !(event.target instanceof Node && menu.contains(event.target))) close(menu)
    }
  })
})()
