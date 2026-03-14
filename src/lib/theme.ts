export const appThemes = ['light', 'dark', 'valentine', 'dracula', 'emerald'] as const;

export type AppTheme = (typeof appThemes)[number];

const themeStorageKey = 'pos-web2-theme';
const darkThemes = new Set<AppTheme>(['dark', 'dracula']);

function isAppTheme(value: string | null): value is AppTheme {
  return Boolean(value && appThemes.includes(value as AppTheme));
}

export function getStoredTheme(): AppTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return isAppTheme(storedTheme) ? storedTheme : 'light';
}

export function applyTheme(theme: AppTheme, options?: { persist?: boolean }) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = darkThemes.has(theme) ? 'dark' : 'light';

  if (options?.persist === false || typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(themeStorageKey, theme);
}

export function initializeTheme() {
  const theme = getStoredTheme();
  applyTheme(theme, { persist: false });
  return theme;
}
