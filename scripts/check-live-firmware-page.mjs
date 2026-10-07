import { pathToFileURL } from 'node:url'

/**
 * The firmware list on the live site. On 2026-10-07 a deployed branch that predated the page
 * replaced the site, and the host answered /firmware/ with the app. The scheduled Live site
 * workflow fetches it every hour, so a disappearance fails a run rather than waiting to be noticed.
 */
const liveFirmwarePageUrl = 'https://fm1-editor.com/firmware/'

const firmwarePageTitle = 'M-VAVE FM1 firmware'

/** Why the response is not the firmware list, or undefined when it is. */
export function liveFirmwarePageFailure(status, html) {
  if (status !== 200) return `${liveFirmwarePageUrl} answered with HTTP ${status}.`
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim()
  if (title !== firmwarePageTitle) {
    return `${liveFirmwarePageUrl} is titled "${title ?? ''}" rather than "${firmwarePageTitle}".`
  }
  if (!html.includes('class="firmware-entry')) {
    return `${liveFirmwarePageUrl} lists no firmware.`
  }
  return undefined
}

async function fetchFailure() {
  try {
    const response = await fetch(liveFirmwarePageUrl, { redirect: 'follow' })
    return liveFirmwarePageFailure(response.status, await response.text())
  } catch (error) {
    return `${liveFirmwarePageUrl} could not be fetched: ${error instanceof Error ? error.message : String(error)}`
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  // A network blip is not a missing page, so only three failures in a row fail the run.
  let failure
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    failure = await fetchFailure()
    if (!failure) break
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 10_000))
  }
  if (failure) {
    console.error(failure)
    process.exit(1)
  }
  console.log(`${liveFirmwarePageUrl} serves the firmware list.`)
}
