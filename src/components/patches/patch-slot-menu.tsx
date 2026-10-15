import { ArrowRightLeft, Copy, Download, Link, Pencil, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PortalMenu } from '@/components/ui/portal-menu'

/** Moving a slot one place without a drag, which some pointers cannot make (WCAG 2.5.7). */
export type PatchSlotMove = {
  canMoveEarlier: boolean
  canMoveLater: boolean
  onMove: (offset: -1 | 1) => void
}

type PatchSlotMenuProps = {
  move?: PatchSlotMove
  name: string
  onChangeToFm?: () => void
  onCopy?: () => void
  onDownload?: () => void
  onEdit?: () => void
  onReplace?: () => void
  onShare?: () => void
}

/**
 * A slot's own actions, in a portal menu because the patch grid clips its overflow. An action
 * without a handler is left out, as importing over a favourite is.
 */
export function PatchSlotMenu({
  move,
  name,
  onChangeToFm,
  onCopy,
  onDownload,
  onEdit,
  onReplace,
  onShare,
}: PatchSlotMenuProps) {
  const { t } = useTranslation()

  return (
    <PortalMenu
      items={[
        { Icon: Pencil, label: t('banks.editSelected'), onSelect: onEdit },
        { Icon: Copy, label: t('banks.copySelected'), onSelect: onCopy },
        { Icon: Upload, label: t('banks.importPatchFile'), onSelect: onReplace },
        { Icon: Download, label: t('banks.downloadPatchFile'), onSelect: onDownload },
        { Icon: Link, label: t('shareLink.menuItem'), onSelect: onShare },
        { Icon: ArrowRightLeft, label: t('changeToFm.menuItem'), onSelect: onChangeToFm },
        {
          disabled: move && !move.canMoveEarlier,
          label: t('banks.moveEarlier'),
          onSelect: move && (() => move.onMove(-1)),
        },
        {
          disabled: move && !move.canMoveLater,
          label: t('banks.moveLater'),
          onSelect: move && (() => move.onMove(1)),
        },
      ].filter(({ onSelect }) => onSelect)}
      menuLabel={name}
      triggerClassName="z-[1] -my-1 -mr-1"
      triggerLabel={t('banks.bankMenu', { bank: name })}
    />
  )
}
