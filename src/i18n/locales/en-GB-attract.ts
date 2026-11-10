/**
 * British English for attract mode, the screen saver that drifts the FM1 over the page once it has
 * sat idle. Only that chunk shows it, so it loads with it: `@/i18n/attract` adds it to `en-GB`.
 * Every other locale keeps these strings in its own file.
 */
export default {
  attract: {
    pressAnyKey: 'PRESS ANY KEY',
    switchOff: 'Switch the screen saver off in Settings ⋮',
  },
} as const
