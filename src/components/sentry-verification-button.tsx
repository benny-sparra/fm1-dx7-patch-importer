import { Bug } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { triggerSentryVerification } from '@/lib/monitoring'

type SentryVerificationButtonProps = {
  enabled?: boolean
  onVerify?: () => void
}

const verificationEnabled = import.meta.env.PROD && import.meta.env.VITE_SENTRY_VERIFY === 'true'

export function SentryVerificationButton({
  enabled = verificationEnabled,
  onVerify = triggerSentryVerification,
}: SentryVerificationButtonProps) {
  if (!enabled) return null

  return (
    <aside className="flex flex-col gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        <span className="font-semibold">Sentry verification enabled.</span> This temporary button
        intentionally reports and throws a test error.
      </p>
      <Button className="self-start sm:self-auto" onClick={onVerify} variant="destructive">
        <Bug aria-hidden="true" />
        Send Sentry test error
      </Button>
    </aside>
  )
}
