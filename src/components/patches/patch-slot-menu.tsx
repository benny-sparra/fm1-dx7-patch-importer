import { Copy, Download, Link, Pencil, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PortalMenu } from '@/components/ui/portal-menu'

type PatchSlotMenuProps = {
  name: string
  onCopy?: () => void
  onDownload?: () => void
  onEdit?: () => void
  onReplace?: () => void
  onShare?: () => void
}

/** A slot's own actions, in a portal menu because the patch grid clips its overflow. */
export function PatchSlotMenu({
  name,
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
        { Icon: Link, label: t('banks.copyShareLink'), onSelect: onShare },
      ]}
      menuLabel={name}
      triggerClassName="z-[1] -my-1 -mr-1"
      triggerLabel={t('banks.bankMenu', { bank: name })}
    />
  )
}
