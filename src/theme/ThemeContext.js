// App-wide theme provider.
//
// Holds the current theme ("light" | "dark"), persists the choice to
// AsyncStorage so it survives app restarts, and exposes a `colors` object plus
// a `toggleTheme` / `setTheme` so any screen can react to theme changes.
//
// Usage in a screen:
//   const { colors, isDark, toggleTheme } = useTheme();
//   const styles = useMemo(() => makeStyles(colors), [colors]);

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lightColors, darkColors } from "./colors";

const STORAGE_KEY = "app_theme";

const ThemeContext = createContext({
  theme: "light",
  isDark: false,
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  // Load the saved theme once on startup.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setThemeState(saved);
        }
      } catch (err) {
        console.log("Theme load error:", err);
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(STORAGE_KEY, next).catch((err) =>
      console.log("Theme save error:", err)
    );
  }, []);

  const setTheme = useCallback(
    (next) => {
      if (next !== "light" && next !== "dark") return;
      setThemeState(next);
      persist(next);
    },
    [persist]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "light" ? "dark" : "light";
      persist(next);
      return next;
    });
  }, [persist]);

  const isDark = theme === "dark";
  const colors = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ theme, isDark, colors, toggleTheme, setTheme }),
    [theme, isDark, colors, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
