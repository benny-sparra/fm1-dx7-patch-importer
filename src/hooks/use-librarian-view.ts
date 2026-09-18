import { useState } from 'react'

/** What the librarian shows: the chosen workspace bank and the search across every bank. */
export type LibrarianView = {
  bank: string
  search: string
  setBank: (bank: string) => void
  setSearch: (search: string) => void
}

/**
 * Held above the librarian page, which the editor replaces while it is open, so returning from the
 * editor shows the same bank or search results.
 */
export function useLibrarianView(): LibrarianView {
  const [bank, setBank] = useState('A')
  const [search, setSearch] = useState('')
  return { bank, search, setBank, setSearch }
}
