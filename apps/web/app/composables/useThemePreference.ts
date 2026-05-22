type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'agartharead-theme'

function normalizeTheme(value: unknown): ThemeMode {
  return value === 'dark' ? 'dark' : 'light'
}

function applyTheme(theme: ThemeMode) {
  if (!import.meta.client) return

  const html = document.documentElement
  html.classList.toggle('dark', theme === 'dark')
  html.style.colorScheme = theme
}

export function useThemePreference() {
  const theme = useState<ThemeMode>('theme-preference', () => 'light')

  async function persistTheme(nextTheme: ThemeMode) {
    if (!import.meta.client) return

    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // Ignore storage failures and keep the in-memory theme.
    }

    if (useAuthUser().value) {
      try {
        await $fetch('/api/profile/settings', {
          method: 'POST',
          credentials: 'include',
          body: { theme: nextTheme }
        })
      } catch {
        // Keep the UI responsive even if persistence fails.
      }
    }
  }

  function setTheme(nextTheme: ThemeMode) {
    const normalizedTheme = normalizeTheme(nextTheme)
    theme.value = normalizedTheme
    applyTheme(normalizedTheme)
    void persistTheme(normalizedTheme)
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  async function loadThemePreference(serverTheme?: string | null) {
    if (!import.meta.client) {
      theme.value = normalizeTheme(serverTheme)
      return theme.value
    }

    let storedTheme: ThemeMode | null = null

    try {
      storedTheme = normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
    } catch {
      storedTheme = null
    }

    const resolvedTheme = normalizeTheme(storedTheme ?? serverTheme)
    theme.value = resolvedTheme
    applyTheme(resolvedTheme)
    return resolvedTheme
  }

  return {
    theme,
    isDark: computed(() => theme.value === 'dark'),
    setTheme,
    toggleTheme,
    loadThemePreference,
    applyTheme
  }
}