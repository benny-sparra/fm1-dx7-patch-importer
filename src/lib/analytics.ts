type AnalyticsEvent =
  | { name: 'bank_transfer_completed' }
  | { name: 'editor_opened' }
  | { name: 'patch_edit_started' }
  | { name: 'patch_saved' }
  | {
      data: { scope: 'all' | 'single' }
      name: 'bank_exported'
    }
  | {
      data: { source: 'catalog' | 'file' }
      name: 'bank_imported'
    }
  | {
      data: {
        reason: 'invalid_bank' | 'no_output' | 'sysex_unavailable' | 'transport'
      }
      name: 'bank_transfer_failed'
    }
  | {
      data: { surface: 'contextual' | 'guide' }
      name: 'help_opened'
    }
  | {
      data: {
        method: 'automatic' | 'manual'
        output: 'available' | 'missing'
        sysex: 'disabled' | 'enabled'
      }
      name: 'midi_connected'
    }
  | {
      data: {
        method: 'automatic' | 'manual'
        reason: 'enable_failed' | 'insecure_context' | 'permission_denied' | 'unsupported_browser'
      }
      name: 'midi_connection_failed'
    }

type UmamiTracker = {
  track: (name: AnalyticsEvent['name'], data?: Record<string, string>) => void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

export function trackAnalyticsEvent(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return

  try {
    window.umami?.track(event.name, 'data' in event ? event.data : undefined)
  } catch {
    // Analytics is best-effort and must never interrupt an application action.
  }
}
