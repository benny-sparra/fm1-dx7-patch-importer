import { ChevronDown, ChevronUp, type LucideIcon, RadioTower, Route } from 'lucide-react'
import { type ReactNode, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpPopover } from '@/components/ui/help-popover'
import { dx7Algorithms, getDx7OperatorRole, type Dx7AlgorithmOperator } from '@/lib/dx7-algorithms'
import {
  envelopePath,
  formatOperatorFixedFrequency,
  formatOperatorRatio,
  operatorColors,
} from '@/lib/editor-visuals'
import { getOperatorAuditionStatus } from '@/lib/operator-audition'
import {
  FM1_OPERATOR_COUNT,
  getOperatorParameterDefinition,
  resolveOperatorParameterIndex,
  storedToDisplayValue,
} from '@/lib/fm1-parameters'
import { type PatchSyncState } from '@/lib/patch-sync-coordinator'
import { rangeStyle } from '@/lib/range-style'
import { cn } from '@/lib/utils'

const nodeX = (operator: Dx7AlgorithmOperator) => operator.x * 18 + 9
const nodeY = (operator: Dx7AlgorithmOperator) => operator.y * 15 + 8

const linkPath = (operator: Dx7AlgorithmOperator) => {
  const x = nodeX(operator)
  const y = nodeY(operator) + 5

  switch (operator.link) {
    case 0:
      return `M ${x} ${y} V ${y + 10}`
    case 1:
      return `M ${x} ${y} V ${y + 7} H ${x + 18}`
    case 2:
      return `M ${x} ${y} V ${y + 8}`
    case 3:
      return `M ${x} ${y} V ${y + 10} M ${x} ${y + 7} H ${x + 18} V ${y + 10}`
    case 4:
      return `M ${x} ${y} V ${y + 10} M ${x - 18} ${y + 7} V ${y + 10} H ${x + 18} V ${y + 10}`
    case 6:
      return `M ${x} ${y} V ${y + 7} H ${x + 36}`
    case 7:
      return `M ${x} ${y} V ${y + 7} H ${x - 18}`
  }
}

const feedbackPath = (operator: Dx7AlgorithmOperator) => {
  if (operator.feedback === 0) return undefined
  const x = nodeX(operator)
  const y = nodeY(operator)
  if (operator.feedback === 2) return `M ${x} ${y - 5} V ${y - 9} H ${x + 10} V ${y + 38} H ${x}`
  if (operator.feedback === 3) return `M ${x} ${y - 5} V ${y - 9} H ${x + 10} V ${y + 23} H ${x}`
  const direction = operator.feedback === 4 ? -1 : 1
  return `M ${x} ${y - 5} V ${y - 9} H ${x + 10 * direction} V ${y + 7} H ${x}`
}

type Bounds = { maxX: number; maxY: number; minX: number; minY: number }

// The extent of everything a diagram draws: operator boxes plus the absolute
// M/V/H polylines of its links and feedback loops.
const algorithmBounds = (operators: readonly Dx7AlgorithmOperator[]): Bounds => {
  const bounds = { maxX: -Infinity, maxY: -Infinity, minX: Infinity, minY: Infinity }
  const include = (x: number, y: number) => {
    bounds.minX = Math.min(bounds.minX, x)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxY = Math.max(bounds.maxY, y)
  }

  for (const operator of operators) {
    include(nodeX(operator) - 6.5, nodeY(operator) - 5.5)
    include(nodeX(operator) + 6.5, nodeY(operator) + 5.5)

    for (const path of [linkPath(operator), feedbackPath(operator)]) {
      if (!path) continue
      const tokens = path.split(' ')
      let x = 0
      let y = 0
      for (let index = 0; index < tokens.length;) {
        const command = tokens[index++]
        if (command === 'M') {
          x = Number(tokens[index++])
          y = Number(tokens[index++])
        } else if (command === 'H') x = Number(tokens[index++])
        else if (command === 'V') y = Number(tokens[index++])
        include(x, y)
      }
    }
  }

  return bounds
}

/*
  The featured diagram keeps one frame size for every algorithm, so operator
  boxes never change scale, and centres each algorithm's own drawing inside it.
  Algorithms with fewer modulator rows would otherwise sit low in the well.
*/
const FEATURED_PADDING = 1.5
const featuredFrame = dx7Algorithms.map(algorithmBounds).reduce(
  (frame, bounds) => ({
    height: Math.max(frame.height, bounds.maxY - bounds.minY + FEATURED_PADDING * 2),
    width: Math.max(frame.width, bounds.maxX - bounds.minX + FEATURED_PADDING * 2),
  }),
  { height: 0, width: 0 },
)

const featuredViewBox = (operators: readonly Dx7AlgorithmOperator[]) => {
  const bounds = algorithmBounds(operators)
  const x = (bounds.minX + bounds.maxX - featuredFrame.width) / 2
  const y = (bounds.minY + bounds.maxY - featuredFrame.height) / 2
  return `${x} ${y} ${featuredFrame.width} ${featuredFrame.height}`
}

function AlgorithmDiagram({
  className,
  featured = false,
  operators,
}: {
  className?: string
  featured?: boolean
  operators: readonly Dx7AlgorithmOperator[]
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn('h-16 w-full overflow-visible', className)}
      viewBox={featured ? featuredViewBox(operators) : '0 -3 110 68'}
    >
      <g
        fill="none"
        stroke={featured ? 'var(--crt-acc-mid)' : 'currentColor'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={featured ? 1.4 : 1.8}
      >
        {operators.map((operator) => (
          <path d={linkPath(operator)} key={`link-${operator.id}`} />
        ))}
        {operators.map((operator) => {
          const path = feedbackPath(operator)
          return path ? (
            <path className="opacity-65" d={path} key={`feedback-${operator.id}`} />
          ) : null
        })}
      </g>
      {operators.map((operator) => {
        /*
          Carriers read in the LED amber and modulators in the phosphor
          accent, as on the rack's own role badges. The picker thumbnails
          stay monochrome so the selected one can take the LED colour.
        */
        const isCarrier = getDx7OperatorRole(operator) === 'carrier'
        const tone = featured ? (isCarrier ? 'var(--crt-led)' : 'var(--crt-acc)') : 'currentColor'
        return (
          <g key={operator.id}>
            <rect
              fill="var(--crt-bg-2)"
              height="11"
              stroke={tone}
              strokeWidth={isCarrier ? 1.8 : 1.2}
              width="13"
              x={nodeX(operator) - 6.5}
              y={nodeY(operator) - 5.5}
            />
            {/*
              VT323's ascent and descent are uneven, so a central baseline
              drops the digits low in the box. Its digits are 0.77em tall on
              the alphabetic baseline with no descent, so sitting that
              baseline 0.385em below the box centre centres the ink.
            */}
            <text
              className="font-vt323 text-[9px]"
              fill={tone}
              textAnchor="middle"
              x={nodeX(operator)}
              y={nodeY(operator) + 3.5}
            >
              {operator.id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/**
 * The title strip every rack panel wears: a hatched bar carrying the panel's
 * name in the dot-matrix face, with room on the right for a panel action.
 */
export function RackPanelTitle({
  action,
  help,
  icon: Icon,
  id,
  title,
}: {
  action?: ReactNode
  help?: { label: string; text: string }
  icon?: LucideIcon
  id?: string
  title: string
}) {
  return (
    <div className="crt-hatch relative flex min-h-8 items-center justify-between gap-3 border-b border-[var(--crt-shadow)] px-[9px] py-1.5">
      <h2
        className="font-dot-matrix flex min-w-0 items-center gap-2 text-[13px] font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase"
        id={id}
      >
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
        <span className="truncate">{title}</span>
        {help ? (
          <HelpPopover
            className="relative z-10 text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
            label={help.label}
            text={help.text}
          />
        ) : null}
      </h2>
      {action}
    </div>
  )
}

/**
 * The minimise control a rack panel wears at the right of its title strip.
 * Its hit area stretches over the whole strip, so clicking anywhere on the
 * title folds the panel; the help button sits above that overlay.
 * Collapsing keeps the title visible so the rack still reads as a stack.
 */
export function RackPanelCollapseToggle({
  collapsed,
  controls,
  onToggle,
  panel,
}: {
  collapsed: boolean
  controls: string
  onToggle: () => void
  panel: string
}) {
  const { t } = useTranslation()
  const label = collapsed
    ? t('editor.expandPanel', { panel })
    : t('editor.minimisePanel', { panel })
  const Icon = collapsed ? ChevronDown : ChevronUp

  return (
    <button
      aria-controls={controls}
      aria-expanded={!collapsed}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--crt-ink-3)] transition-colors outline-none after:absolute after:inset-0 after:content-[''] hover:text-[var(--crt-acc-lt)] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--crt-acc-lt)]"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <span className="sr-only">{label}</span>
      <Icon aria-hidden="true" className="size-4" />
    </button>
  )
}

/**
 * A rack panel's body, folded away by its title strip's minimise control.
 * Visibility is set inline so the collapsed controls leave the accessibility
 * tree; the stylesheet delays that flip until the fold animation has run.
 */
export function RackPanelCollapsibleBody({
  children,
  collapsed,
  id,
}: {
  children: ReactNode
  collapsed: boolean
  id: string
}) {
  return (
    <div className="rack-collapsible" data-collapsed={collapsed} id={id}>
      <div style={{ visibility: collapsed ? 'hidden' : undefined }}>{children}</div>
    </div>
  )
}

type AlgorithmPanelProps = {
  algorithm: number
  feedback: number
  onAlgorithmChange: (algorithm: number) => void
  onFeedbackChange: (feedback: number) => void
  onFeedbackGestureEnd: () => void
  onFeedbackGestureStart: () => void
}

export function AlgorithmPanel({
  algorithm,
  feedback,
  onAlgorithmChange,
  onFeedbackChange,
  onFeedbackGestureEnd,
  onFeedbackGestureStart,
}: AlgorithmPanelProps) {
  const { t } = useTranslation()
  const dropdownRef = useRef<HTMLDetailsElement>(null)

  const selectAlgorithm = (index: number) => {
    onAlgorithmChange(index)
    dropdownRef.current?.removeAttribute('open')
  }

  return (
    <section
      aria-labelledby="algorithm-heading"
      className="synthwave-panel relative z-10 flex min-w-0 flex-col text-[var(--crt-ink)]"
    >
      <RackPanelTitle
        help={{ label: t('editor.algorithm'), text: t('controlHelp.algorithm') }}
        icon={Route}
        id="algorithm-heading"
        title={t('editor.algorithm')}
      />

      <div className="flex min-w-0 flex-1 items-stretch gap-2.5 p-[9px]">
        {/* The number is the picker's trigger, as on the artboard. */}
        <details className="group relative self-start" ref={dropdownRef}>
          <summary
            aria-label={t('ui.chooseAlgorithm', { number: algorithm + 1 })}
            className="crt-inset flex cursor-pointer list-none items-center gap-2 bg-[var(--crt-bg-1)] py-0.5 pr-2 pl-3 transition-colors hover:bg-[var(--crt-bg-head)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] [&::-webkit-details-marker]:hidden"
          >
            <span className="font-vt323 text-[30px] leading-none text-[var(--crt-led)] [text-shadow:0_0_10px_var(--crt-led-glow)]">
              {String(algorithm + 1).padStart(2, '0')}
            </span>
            <ChevronDown className="size-4 shrink-0 text-[var(--crt-acc-lt)] transition-transform group-open:rotate-180" />
          </summary>

          <div
            aria-label={t('ui.dx7Algorithm')}
            className="editor-overlay-surface absolute top-[calc(100%+0.3rem)] left-0 z-30 grid max-h-[min(34rem,70vh)] w-[min(42rem,calc(100vw-1.5rem))] grid-cols-2 gap-1.5 overflow-y-auto border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-2 shadow-[0_12px_26px_rgb(0_0_0/55%)] sm:grid-cols-4"
            role="radiogroup"
          >
            {dx7Algorithms.map((operators, index) => (
              <button
                aria-checked={algorithm === index}
                aria-label={t('ui.algorithmNumber', { number: index + 1 })}
                className={cn(
                  'font-vt323 relative min-w-0 cursor-pointer border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-2 pt-2 pb-1 transition-colors hover:bg-[var(--crt-bg-head)] hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                  algorithm === index
                    ? 'border-t-[var(--crt-acc)] border-l-[var(--crt-acc)] bg-[var(--crt-sel-bg)] text-[var(--crt-led)]'
                    : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-1)] text-[var(--crt-acc-mid)]',
                )}
                key={index}
                onClick={() => selectAlgorithm(index)}
                role="radio"
                type="button"
              >
                <span className="absolute top-1.5 left-2 text-[11px] text-[var(--crt-ink-4)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <AlgorithmDiagram operators={operators} />
              </button>
            ))}
          </div>
        </details>

        {/* The diagram fills whatever height the rack row gives the well. */}
        <div className="crt-well relative min-h-36 min-w-0 flex-1">
          <AlgorithmDiagram
            className="absolute top-1.5 left-1.5 h-[calc(100%-0.75rem)] w-[calc(100%-0.75rem)]"
            featured
            operators={dx7Algorithms[algorithm]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-[9px] pb-[9px] text-[11px] tracking-[0.12em] uppercase">
        <span className="flex items-center gap-1.5 text-[var(--crt-led)]">
          <span
            aria-hidden="true"
            className="h-2 w-3 bg-[var(--crt-led)] shadow-[0_0_7px_var(--crt-led-glow)]"
          />
          {t('editor.carrier')}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--crt-acc-lt)]">
          <span aria-hidden="true" className="h-2 w-3 bg-[var(--crt-acc)]" />
          {t('editor.modulator')}
        </span>
      </div>

      <label className="mt-auto grid min-h-10 grid-cols-[auto_minmax(2rem,1fr)_1.25rem] items-center gap-2 border-t border-[var(--crt-line-dk)] px-[9px] py-1.5">
        <span className="flex items-center gap-1 text-[11px] tracking-[0.14em] text-[var(--crt-ink-3)] uppercase">
          <RadioTower aria-hidden="true" className="size-3 text-[var(--crt-acc)]" />
          {t('editor.feedback')}
          <HelpPopover
            className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
            label={t('editor.feedback')}
            text={t('controlHelp.feedback')}
          />
        </span>
        <input
          aria-label={t('editor.feedback')}
          className="min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
          max={7}
          min={0}
          onBlur={onFeedbackGestureEnd}
          onChange={(event) => onFeedbackChange(Number(event.target.value))}
          onKeyDown={(event) => {
            if (rangeKeys.includes(event.key)) onFeedbackGestureStart()
          }}
          onKeyUp={onFeedbackGestureEnd}
          onPointerCancel={onFeedbackGestureEnd}
          onPointerDown={onFeedbackGestureStart}
          onPointerUp={onFeedbackGestureEnd}
          step={1}
          style={rangeStyle(feedback, 0, 7, 'var(--crt-acc)')}
          type="range"
          value={feedback}
        />
        <output className="font-vt323 text-right text-xl leading-none text-[var(--crt-led)]">
          {feedback}
        </output>
      </label>
    </section>
  )
}

const rangeKeys = [
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
]

type OperatorRackProps = {
  algorithm: number
  mutedOperators: ReadonlySet<number>
  onGestureEnd: () => void
  onGestureStart: () => void
  onOutputChange: (operator: number, value: number) => void
  onSelect: (operator: number) => void
  onToggleMute: (operator: number) => void
  onToggleSolo: (operator: number) => void
  parameters: Uint8Array
  renderOperatorDetail: (operator: number) => ReactNode
  selectedOperator: number
  soloOperator: number | null
  syncState: PatchSyncState
}

/** How much wider the open operator column is than a collapsed one. */
const SELECTED_COLUMN_GROW = 2.9

/**
 * The six operators as a rack of columns. Five sit collapsed as readouts —
 * envelope trace, rate/level pairs and a short parameter stack — while the
 * selected one grows in place to carry its full controls.
 *
 * Each column's header and readouts form one `aria-expanded` button owning a
 * labelled region, so the rack is an accordion with a single open member and
 * the editor keeps its one notion of a "selected operator". The output meter
 * and mute/solo sit outside that button on every column, so a level can be
 * trimmed or an operator silenced without opening it.
 *
 * Below `xl` there is no width for six columns side by side, so the rack
 * wraps: the collapsed columns share the top rows and the open one drops to
 * a full-width row of its own beneath them.
 */
export function OperatorRack({
  algorithm,
  mutedOperators,
  onGestureEnd,
  onGestureStart,
  onOutputChange,
  onSelect,
  onToggleMute,
  onToggleSolo,
  parameters,
  renderOperatorDetail,
  selectedOperator,
  soloOperator,
  syncState,
}: OperatorRackProps) {
  const { t } = useTranslation()

  return (
    <div
      aria-label={t('editor.operators')}
      className="flex min-w-0 flex-wrap items-stretch gap-1.5 bg-[var(--crt-bg-2)] p-2.5 xl:flex-nowrap"
      role="group"
    >
      {Array.from({ length: FM1_OPERATOR_COUNT }, (_, index) => {
        const operator = index + 1
        const base = resolveOperatorParameterIndex(operator, 'operator.envelope.rate1')
        const levelOffset = getOperatorParameterDefinition('operator.envelope.level1').offset
        const rates = Array.from(parameters.slice(base, base + 4))
        const levels = Array.from(parameters.slice(base + levelOffset, base + levelOffset + 4))
        const outputIndex = resolveOperatorParameterIndex(operator, 'operator.outputLevel')
        const output = parameters[outputIndex]
        const mode = parameters[resolveOperatorParameterIndex(operator, 'operator.oscillatorMode')]
        const coarse =
          parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.coarse')]
        const fine = parameters[resolveOperatorParameterIndex(operator, 'operator.frequency.fine')]
        const ratio = (coarse === 0 ? 0.5 : coarse) * (1 + fine / 100)
        const frequencyLabel =
          mode === 0 ? formatOperatorRatio(ratio) : formatOperatorFixedFrequency(coarse, fine)
        const isSelected = selectedOperator === operator
        const algorithmOperator = dx7Algorithms[algorithm].find(({ id }) => id === operator)
        const role = algorithmOperator ? getDx7OperatorRole(algorithmOperator) : 'modulator'
        const roleLabel = role === 'carrier' ? t('editor.carrier') : t('editor.modulator')
        const roleShortLabel =
          role === 'carrier' ? t('editor.carrierShort') : t('editor.modulatorShort')
        const auditionStatus = getOperatorAuditionStatus(operator, mutedOperators, soloOperator)
        const auditionLabel = [
          auditionStatus.muted ? t('ui.operatorMuted') : null,
          auditionStatus.soloed ? t('ui.operatorSoloed') : null,
        ]
          .filter(Boolean)
          .join(', ')
        const summaryId = `operator-${operator}-summary`
        const detailId = `operator-${operator}-detail`
        const readValue = (id: Parameters<typeof getOperatorParameterDefinition>[0]) =>
          storedToDisplayValue(
            getOperatorParameterDefinition(id),
            parameters[resolveOperatorParameterIndex(operator, id)],
          )
        const summaryCells = [
          { label: 'RATIO', value: frequencyLabel },
          { label: 'DTUNE', value: readValue('operator.detune') },
          { label: 'VEL', value: readValue('operator.velocitySensitivity') },
          { label: 'A.MOD', value: readValue('operator.ampModSensitivity') },
          { label: 'SCALE', value: readValue('operator.keyboard.rateScaling') },
        ]

        return (
          <div
            className={cn(
              'operator-column flex min-w-0 flex-col border-t-2 border-r-2 border-b-2 border-l-2 border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] bg-[var(--crt-bg-panel)] transition-[flex-grow] duration-200 ease-out motion-reduce:transition-none xl:basis-0',
              // Until the rack fits on one line, the open operator leads it, so
              // the columns below still read in number order.
              isSelected
                ? '-order-1 basis-full border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] xl:order-none'
                : 'basis-[calc((100%-0.75rem)/3)] border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] sm:basis-[calc((100%-1.5rem)/5)]',
            )}
            data-selected={isSelected}
            key={operator}
            style={{ flexGrow: isSelected ? SELECTED_COLUMN_GROW : 1 }}
          >
            <button
              aria-controls={isSelected ? detailId : undefined}
              aria-expanded={isSelected}
              aria-label={t(
                auditionLabel ? 'ui.operatorSummaryWithAudition' : 'ui.operatorSummary',
                {
                  audition: auditionLabel,
                  number: operator,
                  role: roleLabel,
                },
              )}
              className={cn(
                'flex min-w-0 flex-col text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                isSelected ? 'cursor-default' : 'flex-1 cursor-pointer',
              )}
              id={summaryId}
              onClick={() => onSelect(operator)}
              type="button"
            >
              <span
                className={cn(
                  '@container/operator-head flex min-w-0 items-center gap-1.5 border-b border-[var(--crt-shadow)] px-[7px] py-1.5',
                  isSelected ? 'bg-[var(--crt-sel-bg)]' : 'bg-[var(--crt-bg-head)]',
                )}
              >
                <span
                  className="font-vt323 w-4 shrink-0 text-center text-[22px] leading-none"
                  style={{ color: isSelected ? 'var(--crt-ink)' : operatorColors[index] }}
                >
                  {operator}
                </span>
                <span
                  className={cn(
                    'operator-role-badge inline-flex h-[17px] min-w-0 items-center truncate border bg-[var(--crt-bg-1)] px-1.5 text-[10px] leading-none tracking-[0.14em] uppercase',
                    isSelected
                      ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
                      : role === 'carrier'
                        ? 'border-[var(--crt-line)] text-[var(--crt-led)]'
                        : 'border-[var(--crt-line)] text-[var(--crt-ink-3)]',
                  )}
                >
                  {/* Narrow columns shorten the role rather than clip it. */}
                  <span aria-hidden="true" className="@[7.5rem]/operator-head:hidden">
                    {roleShortLabel}
                  </span>
                  <span aria-hidden="true" className="hidden @[7.5rem]/operator-head:inline">
                    {roleLabel}
                  </span>
                </span>
              </span>

              {isSelected ? null : (
                <span className="@container flex min-w-0 flex-1 flex-col gap-[7px] p-[7px]">
                  {/* A plotted trace of the amplitude envelope, as on the panel. */}
                  <span className="crt-well relative block p-[3px]">
                    <svg
                      aria-hidden="true"
                      className="block h-24 w-full"
                      preserveAspectRatio="none"
                      viewBox="0 0 400 180"
                    >
                      <g stroke="var(--crt-grid)" strokeWidth="1">
                        {[100, 200, 300].map((x) => (
                          <line
                            key={x}
                            vectorEffect="non-scaling-stroke"
                            x1={x}
                            x2={x}
                            y1="4"
                            y2="176"
                          />
                        ))}
                        {[60, 120].map((y) => (
                          <line
                            key={y}
                            vectorEffect="non-scaling-stroke"
                            x1="4"
                            x2="396"
                            y1={y}
                            y2={y}
                          />
                        ))}
                      </g>
                      <path
                        d={envelopePath(rates, levels)}
                        fill="none"
                        stroke="var(--crt-acc-dim)"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </span>

                  <span aria-hidden="true" className="grid grid-cols-1 gap-1 @[8rem]:grid-cols-2">
                    {rates.map((rate, point) => (
                      <span
                        className="crt-inset min-w-0 bg-[var(--crt-bg-1)] px-1 py-0.5 text-center"
                        key={point}
                      >
                        <span className="block truncate text-[10px] tracking-[0.1em] text-[var(--crt-ink-4)]">
                          R{point + 1}/L{point + 1}
                        </span>
                        <span className="font-vt323 block text-[17px] leading-tight text-[var(--crt-led)]">
                          {rate}/{levels[point]}
                        </span>
                      </span>
                    ))}
                  </span>

                  <span aria-hidden="true" className="flex flex-1 flex-col gap-1">
                    {summaryCells.map(({ label, value }) => (
                      <span
                        className="flex max-h-[4.5rem] min-h-9 flex-1 flex-col items-center justify-center gap-0.5 border border-[var(--crt-line-dk)] bg-[var(--crt-bg-1)] px-1 py-1 text-center text-[10px] tracking-[0.08em] text-[var(--crt-ink-3)]"
                        key={label}
                      >
                        <span>{label}</span>
                        <span className="font-vt323 max-w-full truncate text-[15px] leading-none text-[var(--crt-ink)]">
                          {value}
                        </span>
                      </span>
                    ))}
                  </span>
                </span>
              )}
            </button>

            {isSelected ? (
              <div
                aria-labelledby={summaryId}
                className="min-w-0 p-[7px]"
                id={detailId}
                role="region"
              >
                {renderOperatorDetail(operator)}
              </div>
            ) : null}

            <div className="mt-auto flex flex-col gap-[5px] border-t border-[var(--crt-line-dk)] p-[7px]">
              <div className="flex items-center justify-between gap-2 py-[3px] text-[11px] tracking-[0.14em] text-[var(--crt-ink-3)] uppercase">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="truncate">{t('editor.output')}</span>
                  {isSelected ? (
                    <HelpPopover
                      className="text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]"
                      label={t('editor.outputLevel')}
                      text={t('controlHelp.outputLevel')}
                    />
                  ) : null}
                </span>
                <output className="font-vt323 text-[22px] leading-[1.2] text-[var(--crt-led)] [text-shadow:0_0_8px_var(--crt-led-glow)]">
                  {output}
                </output>
              </div>
              <input
                aria-label={t('ui.operatorOutput', { number: operator })}
                className="w-full min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                max={99}
                min={0}
                onBlur={onGestureEnd}
                onChange={(event) => onOutputChange(operator, Number(event.target.value))}
                onKeyDown={(event) => {
                  if (rangeKeys.includes(event.key)) onGestureStart()
                }}
                onKeyUp={onGestureEnd}
                onPointerCancel={onGestureEnd}
                onPointerDown={onGestureStart}
                onPointerUp={onGestureEnd}
                step={1}
                style={rangeStyle(
                  output,
                  0,
                  99,
                  isSelected ? 'var(--crt-acc)' : 'var(--crt-acc-dim)',
                )}
                type="range"
                value={output}
              />

              {/*
                Mute and solo keep the labelling and the send-in-flight guard
                they had when they lived in the operator panel's header.
              */}
              <div
                aria-label={t('ui.auditionGroup', { number: operator })}
                className="mt-[4px] flex gap-[5px]"
                role="group"
              >
                <button
                  aria-label={t('ui.auditionAction', {
                    action: t(auditionStatus.muted ? 'ui.unmute' : 'ui.mute'),
                    number: operator,
                  })}
                  aria-pressed={auditionStatus.muted}
                  className={cn(
                    'min-w-0 flex-1 cursor-pointer truncate border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-1 py-[3px] text-[11px] tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50',
                    auditionStatus.muted
                      ? 'operator-audition-badge border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-destructive text-destructive-foreground'
                      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                  )}
                  disabled={syncState === 'sending'}
                  onClick={() => onToggleMute(operator)}
                  title={t(syncState === 'local' ? 'ui.auditionConnect' : 'ui.auditionTemporary', {
                    action: t(auditionStatus.muted ? 'ui.unmute' : 'ui.mute'),
                    number: operator,
                  })}
                  type="button"
                >
                  {t('ui.mute')}
                </button>
                <button
                  aria-label={t('ui.auditionAction', {
                    action: t(auditionStatus.soloed ? 'ui.unsolo' : 'ui.solo'),
                    number: operator,
                  })}
                  aria-pressed={auditionStatus.soloed}
                  className={cn(
                    'min-w-0 flex-1 cursor-pointer truncate border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] px-1 py-[3px] text-[11px] tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:pointer-events-none disabled:opacity-50',
                    auditionStatus.soloed
                      ? 'operator-audition-badge border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-led)] text-[var(--crt-bg-0)]'
                      : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-btn-face)] text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                  )}
                  disabled={syncState === 'sending'}
                  onClick={() => onToggleSolo(operator)}
                  title={t(syncState === 'local' ? 'ui.auditionConnect' : 'ui.auditionTemporary', {
                    action: t(auditionStatus.soloed ? 'ui.unsolo' : 'ui.solo'),
                    number: operator,
                  })}
                  type="button"
                >
                  {t('ui.solo')}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
