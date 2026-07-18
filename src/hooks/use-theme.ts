import { useEffect, useState } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'fm1-theme'

function getStoredTheme(): ThemePreference {
  try {
    const storedTheme = localStorage.getItem(STORAGE_KEY)

    return storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(theme: ThemePreference) {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.dataset.theme = theme
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)

    try {
      if (theme === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, theme)
      }
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
  }, [theme])

  return { theme, setTheme }
}
