import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { lightColors, darkColors, spacing, borderRadius, typography } from "./theme";
import { getLocal, setLocal } from "../utils/storage";

export type ThemeMode = "light" | "dark";

interface Theme {
  colors: typeof lightColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  typography: typeof typography;
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<Theme>({
  colors: lightColors,
  spacing,
  borderRadius,
  typography,
  mode: "light",
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = getLocal("theme_mode");
    if (saved === "dark" || saved === "light") {
      setMode(saved);
    } else {
      setMode(systemScheme === "dark" ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    setLocal("theme_mode", next);
  };

  const setThemeMode = (m: ThemeMode) => {
    setMode(m);
    setLocal("theme_mode", m);
  };

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, spacing, borderRadius, typography, mode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
