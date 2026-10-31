import { useState } from 'react'

/** What the librarian shows: the chosen workspace bank and the search across every bank. */
export type LibrarianView = {
  bank: string
  section: 'effects' | 'sounds'
  search: string
  setBank: (bank: string) => void
  setSection: (section: 'effects' | 'sounds') => void
  setSearch: (search: string) => void
}

/**
 * Held above the librarian page, which the editor replaces while it is open, so returning from the
 * editor shows the same bank or search results.
 */
export function useLibrarianView(): LibrarianView {
  const [bank, setBank] = useState('A')
  const [section, setSection] = useState<'effects' | 'sounds'>('sounds')
  const [search, setSearch] = useState('')
  return { bank, section, search, setBank, setSection, setSearch }
}
