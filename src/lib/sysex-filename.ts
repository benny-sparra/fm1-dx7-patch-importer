/**
 * Turns a user-authored name into part of a filename every desktop system accepts: characters that
 * are reserved or invisible become dashes, and dashes or dots at either end are dropped.
 */
export function sysexFilenameStem(name: string) {
  return name
    .normalize('NFKC')
    .replace(/[\p{Cc}<>:"/\\|?*]+/gu, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
}
