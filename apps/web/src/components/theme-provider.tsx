import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export const THEME_STORAGE_KEY = 'yard-theme';

export const themePreferences = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof themePreferences)[number];
export type ResolvedTheme = Exclude<ThemePreference, 'system'>;

type ThemeContextValue = Readonly<{
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}>;

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function normalizeThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function readStoredThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

function writeStoredThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Private browsing and restricted storage should not block theme changes.
  }
}

export const themeInitializationScript = `(() => {
  try {
    const theme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (theme === 'light' || theme === 'dark') {
      document.documentElement.dataset.theme = theme;
    }
  } catch {}
})();`;

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  // Keep the server and first client render on the system default. The head script
  // applies a persisted override before hydration without making storage part of SSR.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    writeStoredThemePreference(nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  useEffect(() => {
    const storedPreference = preference === 'system' ? readStoredThemePreference() : preference;
    const activePreference = storedPreference;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const nextResolvedTheme =
        activePreference === 'dark' || (activePreference === 'system' && mediaQuery.matches)
          ? 'dark'
          : 'light';

      setResolvedTheme(nextResolvedTheme);

      if (activePreference === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.dataset.theme = activePreference;
      }
    };

    applyTheme();

    // The stored preference is read after hydration so the server remains deterministic.
    if (preference === 'system' && storedPreference !== 'system') {
      setPreferenceState(storedPreference);
    }

    if (activePreference !== 'system') {
      return;
    }

    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [preference]);

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}
