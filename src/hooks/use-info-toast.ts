import { useCallback, useEffect } from 'react'

import { useToast } from '@/components/ui/toast'

/**
 * Says something the user should know as a toast whenever the message changes, and nothing while
 * it is null. The editors use it to say why their changes are not playing on the FM1. It returns a
 * function that says it again, since a toast goes in seconds, or null while there is nothing to say.
 */
export function useInfoToast(message: string | null) {
  const toast = useToast()

  useEffect(() => {
    if (message) toast.info(message)
  }, [message, toast])

  const showAgain = useCallback(() => {
    if (message) toast.info(message)
  }, [message, toast])
  return message ? showAgain : null
}
