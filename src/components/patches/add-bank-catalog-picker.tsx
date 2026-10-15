import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { BevelRadio, slotBadgeClassName } from '@/components/ui/bevel-radio'
import { dx7BankCatalog } from '@/data/dx7-bank-catalog'
import '@/i18n/librarian-dialogs'
import { cn } from '@/lib/utils'

type CatalogGroup = {
  category: (typeof dx7BankCatalog)[number]['category']
  label: string
}

type AddBankCatalogPickerProps = {
  /** The bank chosen in the open collection. */
  bankId: string
  collection: CatalogGroup['category']
  disabled?: boolean
  groups: CatalogGroup[]
  onChooseBank: (bankId: string) => void
  onChooseCollection: (category: CatalogGroup['category']) => void
}

/**
 * Two panes of choices: the bundled collections on the left, as the librarian lists its banks,
 * and the banks in the open collection on the right, as it lists patches.
 */
export function AddBankCatalogPicker({
  bankId,
  collection,
  disabled = false,
  groups,
  onChooseBank,
  onChooseCollection,
}: AddBankCatalogPickerProps) {
  const { t } = useTranslation()
  const id = useId()
  const collectionName = id + 'collection'
  const bankName = id + 'bank'
  const banks = dx7BankCatalog.filter((bank) => bank.category === collection)
  const openLabel = groups.find((group) => group.category === collection)?.label ?? collection

  return (
    <div className="grid min-h-0 grid-rows-[minmax(0,1fr)] gap-3 sm:grid-cols-[15rem_minmax(0,1fr)]">
      <fieldset className="relative grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5">
        <legend className="sr-only">{t('banks.collections')}</legend>
        {groups.map(({ category, label }) => {
          const count = dx7BankCatalog.filter((bank) => bank.category === category).length
          const countId = `${id}count-${category}`
          const selected = category === collection
          return (
            <BevelRadio
              aria-describedby={countId}
              aria-label={label}
              checked={selected}
              className="flex items-center gap-[9px] px-2 py-[7px]"
              disabled={disabled}
              key={category}
              name={collectionName}
              onChange={() => onChooseCollection(category)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'font-dot-matrix min-w-0 flex-1 truncate text-[14px] font-bold',
                  selected ? 'text-[var(--crt-led)]' : 'text-[var(--crt-ink-2)]',
                )}
              >
                {label}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 rounded-full bg-[var(--crt-bg-well)] px-2 py-0.5 text-[11px] text-[var(--crt-ink-3)]"
              >
                {count}
              </span>
              <span className="sr-only" id={countId}>
                {t('banks.collectionBanks', { count })}
              </span>
            </BevelRadio>
          )
        })}
      </fieldset>

      <fieldset className="dither-well relative grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5 overflow-y-auto border border-[var(--crt-line-dk)] p-2">
        <legend className="sr-only">
          {t('banks.banksInCollection', { collection: openLabel })}
        </legend>
        {banks.map((bank, index) => {
          const selected = bank.id === bankId
          const descriptionId = `${id}description-${bank.id}`
          return (
            <BevelRadio
              aria-describedby={bank.description ? descriptionId : undefined}
              aria-label={bank.name}
              checked={selected}
              className="flex min-h-12 items-center gap-2 px-2 py-2"
              disabled={disabled}
              key={bank.id}
              name={bankName}
              onChange={() => onChooseBank(bank.id)}
            >
              <span aria-hidden="true" className={slotBadgeClassName(selected)}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <span aria-hidden="true" className="min-w-0 flex-1">
                <span
                  className={cn(
                    'font-dot-matrix block truncate text-[14px] font-bold',
                    selected ? 'text-white' : 'text-[var(--crt-ink)]',
                  )}
                >
                  {bank.name}
                </span>
                {bank.description ? (
                  <span className="block truncate text-[11px] text-[var(--crt-ink-3)]">
                    {bank.description}
                  </span>
                ) : null}
              </span>
              {bank.description ? (
                <span className="sr-only" id={descriptionId}>
                  {bank.description}
                </span>
              ) : null}
            </BevelRadio>
          )
        })}
      </fieldset>
    </div>
  )
}
