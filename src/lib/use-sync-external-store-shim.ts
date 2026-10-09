// react-i18next imports `use-sync-external-store/shim` for Reacts older than 18. React 19 has the
// hook, so Vite resolves the shim here and the entry leaves out its fallback (283 B gzip).
/** @public Read through the alias in `vite.config.ts`, which Knip does not follow. */
export { useSyncExternalStore } from 'react'
