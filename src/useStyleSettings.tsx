import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  FONTS,
  THEMES,
  STORAGE_KEYS,
  type FontOption,
  type ColorTheme,
} from "./constants";

interface StyleContextType {
  font: FontOption;
  setFont: (font: FontOption) => void;
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
  setCustomColors: (colors: Partial<Omit<ColorTheme, "id" | "name">>) => void;
}

const StyleContext = createContext<StyleContextType | null>(null);

export function StyleProvider({ children }: { children: ReactNode }) {
  const [font, setFont] = useState<FontOption>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.FONT_ID);
    return FONTS.find((f) => f.id === savedId) ?? FONTS[0];
  });

  const [theme, setTheme] = useState<ColorTheme>(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.THEME_ID);
    return THEMES.find((t) => t.id === savedId) ?? THEMES[0];
  });

  // Inject Google Fonts
  useEffect(() => {
    const fontParams = FONTS.map((f) => f.googleParam).join("&");
    const fontUrl = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;

    let link = document.querySelector<HTMLLinkElement>('link[data-app-fonts="true"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.appFonts = "true";
      document.head.appendChild(link);
    }
    link.href = fontUrl;
  }, []);

  // Persist selections
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_ID, font.id);
  }, [font.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME_ID, theme.id);
  }, [theme.id]);

  const setCustomColors = (colors: Partial<Omit<ColorTheme, "id" | "name">>) => {
    setTheme((prev) => ({ ...prev, ...colors }));
  };

  return (
    <StyleContext.Provider value={{ font, setFont, theme, setTheme, setCustomColors }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyleSettings() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyleSettings must be used within a StyleProvider");
  }
  return context;
}