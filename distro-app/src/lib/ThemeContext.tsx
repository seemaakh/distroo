import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  scheme: ColorScheme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  scheme: "light",
  isDark: false,
  toggleTheme: () => { },
});

const THEME_KEY = "distro_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [scheme, setScheme] = useState<ColorScheme>("light");

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY)
      .then((saved) => {
        if (saved === "dark" || saved === "light") {
          setScheme(saved);
        }
      })
      .catch(() => { });
  }, []);

  const toggleTheme = () => {
    const next: ColorScheme = scheme === "light" ? "dark" : "light";
    setScheme(next);
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => { });
  };

  return (
    <ThemeContext.Provider value={{ scheme, isDark: scheme === "dark", toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
