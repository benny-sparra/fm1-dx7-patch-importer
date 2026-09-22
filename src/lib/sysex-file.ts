import { downloadFile } from '@/lib/download-file'

/** What a file chooser offers when it asks for a DX7 SysEx file. */
export const sysexFileAccept = '.syx,application/octet-stream'

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

/** Offers SysEx bytes to the user as a .syx download. */
export function downloadSysexFile(bytes: Uint8Array<ArrayBuffer>, filename: string) {
  downloadFile(new Blob([bytes], { type: 'application/octet-stream' }), filename)
}
