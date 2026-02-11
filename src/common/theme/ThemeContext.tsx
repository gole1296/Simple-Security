import React, { createContext, useContext, useMemo, useState } from 'react';

export type ThemeName = 'earth' | 'night' | 'clean-slate';

export type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (next: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  children: React.ReactNode;
  storageKey?: string;
  defaultTheme?: ThemeName;
  baseClassName?: string;
  themeClassPrefix?: string;
};

export function ThemeProvider({
  children,
  storageKey = 'app-theme',
  defaultTheme = 'earth',
  baseClassName = 'app-shell',
  themeClassPrefix = 'theme-',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'earth' || stored === 'night' || stored === 'clean-slate') {
      return stored;
    }
    return defaultTheme;
  });

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, theme);
  }, [storageKey, theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  const className = `${baseClassName} ${themeClassPrefix}${theme}`;

  return (
    <ThemeContext.Provider value={value}>
      <div className={className}>{children}</div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
