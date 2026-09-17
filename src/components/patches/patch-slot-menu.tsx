import { Copy, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PortalMenu } from '@/components/ui/portal-menu'

type PatchSlotMenuProps = {
  name: string
  onCopy?: () => void
  onEdit?: () => void
}

/** A slot's own actions, in a portal menu because the patch grid clips its overflow. */
export function PatchSlotMenu({ name, onCopy, onEdit }: PatchSlotMenuProps) {
  const { t } = useTranslation()

  return (
    <PortalMenu
      items={[
        { Icon: Pencil, label: t('banks.editSelected'), onSelect: onEdit },
        { Icon: Copy, label: t('banks.copySelected'), onSelect: onCopy },
      ]}
      menuLabel={name}
      triggerClassName="z-[1] -my-1 -mr-1"
      triggerLabel={t('banks.bankMenu', { bank: name })}
    />
  )
}
