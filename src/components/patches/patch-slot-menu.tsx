import { ArrowRightLeft, Copy, Download, Pencil, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PortalMenu } from '@/components/ui/portal-menu'

type PatchSlotMenuProps = {
  name: string
  onChangeToFm?: () => void
  onCopy?: () => void
  onDownload?: () => void
  onEdit?: () => void
  onReplace?: () => void
}

/**
 * A slot's own actions, in a portal menu because the patch grid clips its overflow. An action
 * without a handler is left out, as importing over a favourite is.
 */
export function PatchSlotMenu({
  name,
  onChangeToFm,
  onCopy,
  onDownload,
  onEdit,
  onReplace,
}: PatchSlotMenuProps) {
  const { t } = useTranslation()

  return (
    <PortalMenu
      items={[
        { Icon: Pencil, label: t('banks.editSelected'), onSelect: onEdit },
        { Icon: Copy, label: t('banks.copySelected'), onSelect: onCopy },
        { Icon: Upload, label: t('banks.importPatchFile'), onSelect: onReplace },
        { Icon: Download, label: t('banks.downloadPatchFile'), onSelect: onDownload },
        { Icon: ArrowRightLeft, label: t('changeToFm.menuItem'), onSelect: onChangeToFm },
      ].filter(({ onSelect }) => onSelect)}
      menuLabel={name}
      triggerClassName="z-[1] -my-1 -mr-1"
      triggerLabel={t('banks.bankMenu', { bank: name })}
    />
  )
}
