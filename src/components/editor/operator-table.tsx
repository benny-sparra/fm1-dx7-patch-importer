import { type TransitionEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  OperatorAuditionButtons,
  OperatorEnvelopeTrace,
  OperatorIdentity,
  type OperatorLayoutProps,
  OperatorMenu,
  OperatorOutputSlider,
  operatorSummaryLabel,
  readOperatorSummary,
} from '@/components/editor/editor-workspace'
import { FM1_OPERATOR_COUNT } from '@/lib/fm1-parameters'
import { cn } from '@/lib/utils'

/*
  Identity, envelope trace, the five readouts, the four rate/level pairs,
  output, then mute, solo and the open operator's menu. Every row is a subgrid
  of these columns, so each value sits under the same value in the next row.
*/
const tableColumns =
  'grid-cols-[7.5rem_minmax(5.5rem,1fr)_repeat(5,minmax(3.25rem,1fr))_repeat(4,minmax(3.75rem,1fr))_minmax(8.5rem,1.5fr)_auto]'
/** The columns a row's expand button spans: identity through the last rate/level pair. */
const summaryColumns = 'col-span-11'

const headingClass = 'truncate text-[10px] tracking-[0.1em] text-[var(--crt-ink-4)] uppercase'

/**
 * The six operators as rows of a table under one set of column headings, as
 * on the TX81Z's editors, for windows wide enough to set every value side by
 * side. Each row summarises its operator, so its values can be compared with
 * the same values on the others at a glance.
 *
 * As in the rack, each row's readouts form one `aria-expanded` button owning a
 * labelled region, with output and mute/solo outside it. The open operator
 * grows in place beneath its own row to carry its full controls, while its row
 * keeps showing its readouts. The row it replaces folds away at the same time,
 * holding its height as an empty placeholder while it does, since its
 * controls have already gone.
 */
export function OperatorTable(props: OperatorLayoutProps) {
  const {
    onCopyOperator,
    onGestureEnd,
    onGestureStart,
    onOutputChange,
    onPasteOperator,
    onSelect,
    onToggleMute,
    onToggleSolo,
    pasteSource,
    renderOperatorDetail,
    selectedOperator,
    syncState,
  } = props
  const { t } = useTranslation()
  const detailRefs = useRef(new Map<number, HTMLDivElement>())
  const [closing, setClosing] = useState<{ height: number; operator: number } | null>(null)

  const open = (operator: number) => {
    if (operator !== selectedOperator) {
      const detail = detailRefs.current.get(selectedOperator)
      setClosing(detail ? { height: detail.offsetHeight, operator: selectedOperator } : null)
    }
    onSelect(operator)
  }
  const finishClosing = (operator: number) => (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== 'height') return
    setClosing((current) => (current?.operator === operator ? null : current))
  }

  const headings = [
    '',
    '',
    ...readOperatorSummary(props, 1).readouts.map(({ label }) => label),
    ...[1, 2, 3, 4].map((point) => `R${point}/L${point}`),
    t('editor.output'),
    '',
  ]

  return (
    <div
      aria-label={t('editor.operators')}
      className={cn('grid min-w-0 gap-x-1.5 gap-y-1 bg-[var(--crt-bg-2)] p-2.5', tableColumns)}
      role="group"
    >
      <div
        aria-hidden="true"
        className="col-span-full grid grid-cols-subgrid items-end border-2 border-transparent px-[7px]"
      >
        {headings.map((heading, index) => (
          <span
            className={cn(headingClass, index >= 2 && index < 11 ? 'text-center' : null)}
            key={index}
          >
            {heading}
          </span>
        ))}
      </div>

      {Array.from({ length: FM1_OPERATOR_COUNT }, (_, index) => {
        const operator = index + 1
        const summary = readOperatorSummary(props, operator)
        const isSelected = selectedOperator === operator
        const summaryId = `operator-${operator}-summary`
        const detailId = `operator-${operator}-detail`

        return (
          <div
            className={cn(
              'operator-row col-span-full grid grid-cols-subgrid border-t-2 border-r-2 border-b-2 border-l-2 border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] bg-[var(--crt-bg-panel)]',
              isSelected
                ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)]'
                : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)]',
            )}
            data-selected={isSelected}
            key={operator}
          >
            <button
              aria-controls={isSelected ? detailId : undefined}
              aria-expanded={isSelected}
              aria-label={operatorSummaryLabel(t, operator, summary)}
              className={cn(
                summaryColumns,
                'grid grid-cols-subgrid items-center py-1.5 pl-[7px] text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                isSelected
                  ? 'cursor-default bg-[var(--crt-sel-bg)]'
                  : 'cursor-pointer hover:bg-[var(--crt-bg-head)]',
              )}
              id={summaryId}
              onClick={() => open(operator)}
              type="button"
            >
              <OperatorIdentity isSelected={isSelected} operator={operator} role={summary.role} />
              <OperatorEnvelopeTrace
                className="h-7"
                levels={summary.levels}
                rates={summary.rates}
              />
              {summary.readouts.map(({ label, value }) => (
                <span
                  aria-hidden="true"
                  className="font-vt323 truncate text-center text-[17px] leading-none text-[var(--crt-ink)]"
                  key={label}
                >
                  {value}
                </span>
              ))}
              {summary.rates.map((rate, point) => (
                <span
                  aria-hidden="true"
                  className="font-vt323 truncate text-center text-[17px] leading-none text-[var(--crt-led)]"
                  key={point}
                >
                  {rate}/{summary.levels[point]}
                </span>
              ))}
            </button>

            <span className="flex min-w-0 items-center gap-2">
              <OperatorOutputSlider
                isSelected={isSelected}
                onChange={(value) => onOutputChange(operator, value)}
                onGestureEnd={onGestureEnd}
                onGestureStart={onGestureStart}
                operator={operator}
                output={summary.output}
              />
              <output className="font-vt323 w-6 shrink-0 text-right text-[20px] leading-none text-[var(--crt-led)] [text-shadow:0_0_8px_var(--crt-led-glow)]">
                {summary.output}
              </output>
            </span>

            <span className="flex items-center gap-1 pr-[5px]">
              <OperatorAuditionButtons
                auditionStatus={summary.auditionStatus}
                className="flex w-28 gap-[5px]"
                onToggleMute={onToggleMute}
                onToggleSolo={onToggleSolo}
                operator={operator}
                syncState={syncState}
              />
              {/* The menu keeps its place on every row, so the columns never shift. */}
              <span className="flex size-6 shrink-0 items-center">
                {isSelected ? (
                  <OperatorMenu
                    className="flex items-center"
                    disabled={syncState === 'sending'}
                    onCopy={(part) => onCopyOperator(operator, part)}
                    onPaste={() => onPasteOperator(operator)}
                    operator={operator}
                    pasteSource={pasteSource}
                  />
                ) : null}
              </span>
            </span>

            <div
              className="rack-collapsible col-span-full"
              data-collapsed={!isSelected}
              onTransitionEnd={finishClosing(operator)}
            >
              <div>
                {isSelected ? (
                  <div
                    aria-labelledby={summaryId}
                    className="min-w-0 border-t border-[var(--crt-line-dk)] p-[7px]"
                    id={detailId}
                    ref={(node) => {
                      if (!node) return
                      detailRefs.current.set(operator, node)
                      return () => {
                        detailRefs.current.delete(operator)
                      }
                    }}
                    role="region"
                  >
                    {renderOperatorDetail(operator)}
                  </div>
                ) : closing?.operator === operator ? (
                  <div style={{ height: closing.height }} />
                ) : null}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
