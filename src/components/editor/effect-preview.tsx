import { cn } from '@/lib/utils'

export type EffectPreviewName = 'Filter' | 'Reverb' | 'Delay' | 'Distortion' | 'Chorus' | 'Phaser'

type EffectPreviewProps = {
  enabled: boolean
  effect: EffectPreviewName
}

function FilterPreview() {
  return (
    <>
      <path className="effect-preview__guide" d="M8 14h72" />
      <path className="effect-preview__signal" d="M8 14c4-9 8 9 12 0s8-9 12 0 8 9 12 0" />
      <path className="effect-preview__filter-muted" d="M44 14c4-3 8 3 12 0s8-3 12 0 8 3 12 0" />
      <g className="effect-preview__motion effect-preview__filter-gate">
        <path d="M47 6v16" />
        <circle cx="47" cy="6" r="2" />
      </g>
    </>
  )
}

function ReverbPreview() {
  return (
    <>
      <circle className="effect-preview__signal" cx="18" cy="14" r="3" />
      <path className="effect-preview__guide" d="M25 14h54" />
      <circle
        className="effect-preview__motion effect-preview__reverb-ring"
        cx="43"
        cy="14"
        r="3"
      />
      <circle
        className="effect-preview__motion effect-preview__reverb-ring effect-preview__reverb-ring--late"
        cx="43"
        cy="14"
        r="3"
      />
      <path className="effect-preview__reflection" d="M68 7v14M76 7v14" />
    </>
  )
}

function DelayPreview() {
  return (
    <>
      <path className="effect-preview__guide" d="M9 14h70" />
      <circle className="effect-preview__signal" cx="14" cy="14" r="3" />
      <circle
        className="effect-preview__motion effect-preview__delay-repeat"
        cx="38"
        cy="14"
        r="3"
      />
      <circle
        className="effect-preview__motion effect-preview__delay-repeat effect-preview__delay-repeat--middle"
        cx="56"
        cy="14"
        r="3"
      />
      <circle
        className="effect-preview__motion effect-preview__delay-repeat effect-preview__delay-repeat--late"
        cx="74"
        cy="14"
        r="3"
      />
    </>
  )
}

function DistortionPreview() {
  return (
    <>
      <path className="effect-preview__guide" d="M8 14h72" />
      <path className="effect-preview__signal" d="M8 14c4-9 8 9 12 0s8-9 12 0" />
      <path
        className="effect-preview__motion effect-preview__distortion-wave"
        d="M42 20V8l6 12 6-12 6 12 6-12 6 12 6-12 6 12"
      />
    </>
  )
}

function ChorusPreview() {
  const wave = 'M8 14c4-7 8 7 12 0s8-7 12 0 8 7 12 0 8-7 12 0 8 7 12 0 8-7 12 0'

  return (
    <>
      <path className="effect-preview__guide" d="M8 14h72" />
      <path className="effect-preview__signal" d={wave} />
      <path className="effect-preview__motion effect-preview__chorus-wave" d={wave} />
      <path
        className="effect-preview__motion effect-preview__chorus-wave effect-preview__chorus-wave--late"
        d={wave}
      />
    </>
  )
}

function PhaserPreview() {
  return (
    <>
      <path className="effect-preview__guide" d="M8 14h72" />
      <path
        className="effect-preview__signal"
        d="M8 14c4-7 8 7 12 0s8-7 12 0 8 7 12 0 8-7 12 0 8 7 12 0 8-7 12 0"
      />
      <g className="effect-preview__motion effect-preview__phaser-notches">
        <path d="M28 7v14M36 7v14M44 7v14" />
      </g>
    </>
  )
}

function PreviewArtwork({ effect }: Pick<EffectPreviewProps, 'effect'>) {
  switch (effect) {
    case 'Filter':
      return <FilterPreview />
    case 'Reverb':
      return <ReverbPreview />
    case 'Delay':
      return <DelayPreview />
    case 'Distortion':
      return <DistortionPreview />
    case 'Chorus':
      return <ChorusPreview />
    case 'Phaser':
      return <PhaserPreview />
  }
}

export function EffectPreview({ effect, enabled }: EffectPreviewProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('effect-preview ml-auto shrink-0', enabled && 'effect-preview--active')}
      fill="none"
      focusable="false"
      role="presentation"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 88 28"
    >
      <rect className="effect-preview__frame" height="26" rx="5" width="86" x="1" y="1" />
      <PreviewArtwork effect={effect} />
    </svg>
  )
}
