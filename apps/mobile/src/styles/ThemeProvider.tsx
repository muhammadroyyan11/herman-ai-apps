import React, { createContext, useContext, ReactNode } from "react";
import { colors, spacing, borderRadius, typography } from "./theme";

interface Theme {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme>({
  colors,
  spacing,
  borderRadius,
  typography,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors, spacing, borderRadius, typography }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
