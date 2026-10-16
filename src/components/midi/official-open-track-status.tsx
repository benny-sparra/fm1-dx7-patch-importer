import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/official-open'
import { InfoNotice } from '@/components/ui/info-notice'
import { useToast } from '@/components/ui/toast'
import type { MidiController } from '@/hooks/use-midi'
import { cn } from '@/lib/utils'
import type { OfficialOpenEngine } from '@/lib/official-open-transfer'

/** Engine names as the FM1 prints them, which stay in English like its panel's. */
const engineNames: Record<OfficialOpenEngine, string> = {
  '303': '303',
  '808': '808',
  dx7: 'DX7',
  pluck: 'PLUCK',
  psg: 'PSG',
  sampler: 'SAMPLER',
}

type OfficialOpenTrackStatusProps = {
  midi: Pick<MidiController, 'channel' | 'trackDelivery'>
}

/**
 * What became of the last patch sent to a track of M-VAVE's Official Open: a notification naming
 * the track it reached, or, while the note channel stays the one it was sent on, a notice saying
 * why it was not sent and how to fix it. The live region stays mounted so the notice is announced.
 */
export function OfficialOpenTrackStatus({ midi }: OfficialOpenTrackStatusProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { channel, trackDelivery } = midi

  useEffect(() => {
    if (trackDelivery?.announce && trackDelivery.delivery.type === 'sent') {
      const { name, track } = trackDelivery.delivery
      toast.success(t('officialOpenTracks.sent', { name, track }))
    }
  }, [t, toast, trackDelivery])

  const delivery = trackDelivery?.delivery
  const notice =
    delivery && 'channel' in delivery && delivery.channel === channel
      ? delivery.type === 'no-track'
        ? t('officialOpenTracks.noTrack', { channel })
        : delivery.type === 'not-dx7'
          ? t('officialOpenTracks.notDx7', {
              engine: engineNames[delivery.engine],
              track: delivery.track,
            })
          : delivery.type === 'unread'
            ? t('officialOpenTracks.unread', { track: delivery.track })
            : null
      : null

  // The region holds no room in the header while it is empty. It takes the class through `cn`, as
  // every other lazy chunk using the JSX runtime does: one that did not made Rolldown split `cn`
  // out of the chunk the entry shares with them, costing 140 B.
  return (
    <div className={cn('empty:hidden')} role="status">
      {notice ? (
        <InfoNotice>
          <p>{notice}</p>
        </InfoNotice>
      ) : null}
    </div>
  )
}
