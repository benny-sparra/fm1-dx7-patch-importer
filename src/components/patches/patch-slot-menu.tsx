import { ArrowRightLeft, Cable, Copy, Download, Link, Pencil, Upload } from 'lucide-react'
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
  onReceive?: () => void
  onReplace?: () => void
  onShare?: () => void
  /** The slot's code, so slots holding patches of one name keep menus of their own names. */
  slot: string
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
  onReceive,
  onReplace,
  onShare,
  slot,
}: PatchSlotMenuProps) {
  const { t } = useTranslation()
  const transfer = t('banks.menuTransfer')
  const order = t('banks.menuOrder')

  return (
    <PortalMenu
      items={[
        { Icon: Pencil, label: t('banks.editSelected'), onSelect: onEdit },
        { Icon: ArrowRightLeft, label: t('changeToFm.menuItem'), onSelect: onChangeToFm },
        { Icon: Copy, group: transfer, label: t('banks.copySelected'), onSelect: onCopy },
        { Icon: Upload, group: transfer, label: t('banks.importPatchFile'), onSelect: onReplace },
        { Icon: Cable, group: transfer, label: t('banks.receivePatch'), onSelect: onReceive },
        {
          Icon: Download,
          group: transfer,
          label: t('banks.downloadPatchFile'),
          onSelect: onDownload,
        },
        { Icon: Link, group: transfer, label: t('shareLink.menuItem'), onSelect: onShare },
        {
          disabled: move && !move.canMoveEarlier,
          group: order,
          label: t('banks.moveEarlier'),
          onSelect: move && (() => move.onMove(-1)),
        },
        {
          disabled: move && !move.canMoveLater,
          group: order,
          label: t('banks.moveLater'),
          onSelect: move && (() => move.onMove(1)),
        },
      ].filter(({ onSelect }) => onSelect)}
      menuLabel={name}
      triggerClassName="z-[1] -my-1 -mr-1"
      triggerLabel={t('banks.patchMenu', { name, slot })}
    />
  )
}
