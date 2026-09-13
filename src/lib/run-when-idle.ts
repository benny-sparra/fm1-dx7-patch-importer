type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
}

/**
 * Runs `task` once the page has finished loading and the main thread is idle, so optional work
 * (such as downloading the monitoring SDK) stays off the critical rendering path. Browsers without
 * `requestIdleCallback` fall back to a short timeout after the load event.
 */
export function runWhenIdle(task: () => void, { timeout = 5000 }: { timeout?: number } = {}) {
  const win = window as IdleWindow

  const schedule = () => {
    if (win.requestIdleCallback) win.requestIdleCallback(task, { timeout })
    else window.setTimeout(task, 1)
  }

  if (document.readyState === 'complete') schedule()
  else window.addEventListener('load', schedule, { once: true })
}
