/**
 * Copies text that is still being made, such as a share link whose code loads on demand. Safari
 * lets a page write the clipboard only during the click that asked for it, so where the browser
 * takes a `ClipboardItem`, the text goes in as a promise at once; elsewhere it is written once
 * ready. Rejects when the text cannot be made or the browser refuses the clipboard.
 */
export async function copyTextToClipboard(text: Promise<string>) {
  const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard
  if (!clipboard) throw new Error('The clipboard is unavailable.')
  if (typeof ClipboardItem === 'function' && typeof clipboard.write === 'function') {
    try {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }))
      await clipboard.write([new ClipboardItem({ 'text/plain': blob })])
      return
    } catch {
      // A browser that takes no promise in a ClipboardItem gets the text once it is ready.
    }
  }
  await clipboard.writeText(await text)
}
