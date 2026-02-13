import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Currently dark-only; wrapping in useMemo for future light mode support
  const theme = useMemo(() => darkTheme, []);
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
