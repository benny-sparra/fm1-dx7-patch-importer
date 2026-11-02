import { useEffect, useRef, useState } from 'react'

import type { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { fm1VaRecordEngine } from '@/lib/fm1-va-engine'

type LiveStatus = 'checking' | 'live' | 'noFirmware' | 'noProgram' | 'otherEngine' | 'readFailed'

type Options = {
  canCheck: boolean
  editor: { checking: () => void; goLive: () => void; goLocal: () => void }
  engine: 'virtual-analog' | 'eight-bit'
  program: number | undefined
  programRoute: string
  reader: ReturnType<typeof useFm1VaPresetReader>
  sendProgramChange: (program: number) => boolean
}

/** Checks the stored engine before enabling live controls, and follows the selected MIDI route. */
export function useFm1VaLiveStatus({
  canCheck,
  editor,
  engine,
  program,
  programRoute,
  reader,
  sendProgramChange,
}: Options): LiveStatus {
  const programSelectedOn = useRef(programRoute)
  const [checked, setChecked] = useState<{
    readPreset: typeof reader.readPreset
    result: LiveStatus
  } | null>(null)
  const { readPreset } = reader
  useEffect(() => {
    if (programSelectedOn.current !== programRoute) programSelectedOn.current = ''
  }, [programRoute])
  useEffect(() => {
    if (program === undefined || !canCheck) {
      editor.goLocal()
      return
    }
    const read = new AbortController()
    editor.checking()
    const check = async () => {
      let result: LiveStatus
      try {
        const preset = await readPreset(program, read.signal)
        result = fm1VaRecordEngine(preset.record) === engine ? 'live' : 'otherEngine'
      } catch {
        result = 'readFailed'
      }
      if (read.signal.aborted) return
      if (result === 'live' && programSelectedOn.current !== programRoute) {
        if (sendProgramChange(program)) programSelectedOn.current = programRoute
        else result = 'readFailed'
      }
      setChecked({ readPreset, result })
      if (result === 'live') editor.goLive()
      else editor.goLocal()
    }
    void check()
    return () => read.abort()
  }, [canCheck, editor, engine, program, programRoute, readPreset, sendProgramChange])

  const liveStatus: LiveStatus =
    program === undefined
      ? 'noProgram'
      : !canCheck
        ? 'noFirmware'
        : checked?.readPreset === readPreset
          ? checked.result
          : 'checking'

  return liveStatus
}
