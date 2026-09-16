/**
 * Does to `root` what Google Translate does to a page: every text node is replaced by a `<font>`
 * element holding the translated text. React still holds the original text nodes, so removing one,
 * or inserting another node before one, throws `NotFoundError` in the browser.
 */
export function translatePageText(root: Element) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const text of textNodes) {
    const font = document.createElement('font')
    font.textContent = text.data
    text.replaceWith(font)
  }
}
