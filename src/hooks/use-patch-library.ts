import { useCallback, useState } from 'react'
import { patches as placeholders, type Patch } from '@/data/patches'
import { parseDx7Bank, updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'

export function usePatchLibrary() {
  const [patches, setPatches] = useState<Patch[]>(() =>
    placeholders.map((patch) => ({ ...patch, name: 'Empty', family: '' })),
  )
  const [voices, setVoices] = useState<Record<string, Dx7Voice>>({})
  const [loadedBanks, setLoadedBanks] = useState<string[]>([])

  const importBank = useCallback(async (bank: string, file: File) => {
    const imported = parseDx7Bank(await file.arrayBuffer())
    setPatches((current) => current.map((patch) => patch.bank !== bank ? patch : {
      ...patch, id: `bank-${bank}-${patch.number}`, name: imported[patch.number - 1].name, family: 'DX7',
    }))
    setVoices((current) => {
      const next = { ...current }
      imported.forEach((voice, index) => { next[`bank-${bank}-${index + 1}`] = voice })
      return next
    })
    setLoadedBanks((current) => current.includes(bank) ? current : [...current, bank].sort())
  }, [])

  const updateVoice = useCallback((id: string, update: (voice: Dx7Voice) => Dx7Voice) => {
    setVoices((current) => current[id] ? { ...current, [id]: update(current[id]) } : current)
  }, [])

  const renameVoice = useCallback((id: string, name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const displayName = trimmedName.slice(0, 10).replace(/[^\x20-\x7e]/g, ' ').trim() || 'UNTITLED'
    setVoices((current) => current[id]
      ? { ...current, [id]: updateDx7VoiceName(current[id], trimmedName) }
      : current)
    setPatches((current) => current.map((patch) => patch.id === id ? { ...patch, name: displayName } : patch))
  }, [])

  const moveVoice = useCallback((bank: string, from: number, to: number) => {
    if (to < 1 || to > 32 || from === to) return
    const fromId = `bank-${bank}-${from}`
    setVoices((current) => {
      if (!current[fromId]) return current
      const next = { ...current }
      const moved = current[fromId]
      const direction = from < to ? 1 : -1
      for (let slot = from; slot !== to; slot += direction) {
        next[`bank-${bank}-${slot}`] = current[`bank-${bank}-${slot + direction}`]
      }
      next[`bank-${bank}-${to}`] = moved
      return next
    })
    setPatches((current) => {
      const bankPatches = current.filter((patch) => patch.bank === bank).sort((a, b) => a.number - b.number)
      const reordered = [...bankPatches]
      const [moved] = reordered.splice(from - 1, 1)
      reordered.splice(to - 1, 0, moved)
      return current.map((patch) => patch.bank !== bank ? patch : {
        ...patch,
        name: reordered[patch.number - 1].name,
        family: reordered[patch.number - 1].family,
      })
    })
  }, [])

  const getBankVoices = useCallback((bank: string) => {
    return Array.from({ length: 32 }, (_, index) => voices[`bank-${bank}-${index + 1}`])
      .filter((voice): voice is Dx7Voice => Boolean(voice))
  }, [voices])

  return { getBankVoices, importBank, loadedBanks, moveVoice, patches, renameVoice, updateVoice, voices }
}
export type PatchLibrary = ReturnType<typeof usePatchLibrary>
