import React, { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem('theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    // localStorage can throw in private-browsing / locked-down contexts.
    return 'light';
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Read the saved theme synchronously on first render (not in an effect),
  // so a fresh page load — e.g. a link opened in a new tab — never paints
  // the wrong theme before flipping to the right one.
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // useLayoutEffect applies the attribute before the browser paints,
  // instead of after (useEffect), which is what caused the light-mode flash.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('theme', theme);
    } catch {
      // Ignore write failures; the theme still works for this session.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return ctx;
};