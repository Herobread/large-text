import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { AnimatedTextDisplay } from "./AnimatedTextDisplay";
import {
  FONTS,
  STORAGE_KEYS,
  THEMES,
  type ColorTheme,
  type FontOption,
} from "./constants";
import { Reactions } from "./Reactions";
import { FontSelector, ThemeSelector } from "./Selectors";
import { useAutoFontSize } from "./useAutoFontSize";

export default function App() {
  const [text, setText] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    return hash
      ? decodeURIComponent(hash)
      : (localStorage.getItem(STORAGE_KEYS.TEXT) ?? "");
  });

  const [font, setFont] = useState<FontOption>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FONT_ID);
    return FONTS.find((f) => f.id === saved) ?? FONTS[0];
  });

  const [theme, setTheme] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME_ID);
    return THEMES.find((t) => t.id === saved) ?? THEMES[0];
  });

  const [hasSelection, setHasSelection] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fontSize = useAutoFontSize(containerRef, text, font);

  useEffect(() => {
    const fontParams = FONTS.map((f) => f.googleParam).join("&");
    const fontUrl = `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;

    let link = document.querySelector<HTMLLinkElement>(
      'link[data-app-fonts="true"]',
    );
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset.appFonts = "true";
      document.head.appendChild(link);
    }
    link.href = fontUrl;
  }, []);

  useEffect(() => {
    let style = document.querySelector<HTMLStyleElement>(
      'style[data-app-reset="true"]',
    );
    if (!style) {
      style = document.createElement("style");
      style.dataset.appReset = "true";
      document.head.appendChild(style);
    }
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
      
      /* Only reveal foreground text when highlighted */
      textarea::selection {
        background-color: ${theme.text}33;
        color: ${theme.text} !important; 
      }
    `;
  }, [theme.text]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_ID, font.id);
    localStorage.setItem(STORAGE_KEYS.THEME_ID, theme.id);
    localStorage.setItem(STORAGE_KEYS.TEXT, text);
    const target = text
      ? `#${encodeURIComponent(text)}`
      : window.location.pathname + window.location.search;
    window.history.replaceState(null, "", target);
  }, [font.id, theme.id, text]);

  const checkSelection = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setHasSelection(target.selectionStart !== target.selectionEnd);
  };

  // THE FIX: Both layers share the exact same box model and typography
  const sharedTextStyles: React.CSSProperties = {
    position: "absolute",
    inset: "48px",
    width: "calc(100% - 96px)",
    height: "calc(100% - 96px)",
    margin: 0,
    padding: 0,
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize: `${fontSize}px`,
    lineHeight: font.lineHeight,
    textAlign: "center",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: "none",
    boxSizing: "border-box",
    overflow: "hidden", // hide scrollbars so metrics match
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        backgroundColor: theme.bg,
        color: theme.text,
        transition: "background-color 0.25s ease, color 0.25s ease",
        userSelect: "none",
      }}
    >
      <ThemeSelector
        currentTheme={theme}
        onSelect={(t) => {
          setTheme(t);
          textRef.current?.focus();
        }}
      />
      <FontSelector
        currentFont={font}
        textColor={theme.text}
        onSelect={(f) => {
          setFont(f);
          textRef.current?.focus();
        }}
      />

      <main
        ref={containerRef}
        onClick={() => textRef.current?.focus()}
        style={{ position: "relative", width: "100%", height: "100%" }}
      >
        <Reactions theme={theme} />

        {/* 1. ANIMATED BACKGROUND LAYER */}
        <div
          aria-hidden="true"
          style={{
            ...sharedTextStyles,
            pointerEvents: "none",
            color: theme.text,
            opacity: hasSelection || !text ? 0.35 : 1, // Fades when selecting or empty
            transition: "opacity 0.1s ease, color 0.25s ease",
            zIndex: 1,
          }}
        >
          <AnimatedTextDisplay text={text} />
        </div>

        {/* 2. INTERACTIVE FOREGROUND LAYER */}
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            checkSelection(e);
          }}
          onSelect={checkSelection}
          onKeyUp={checkSelection}
          onMouseUp={checkSelection}
          onBlur={() => setHasSelection(false)}
          autoFocus
          spellCheck={false}
          style={{
            ...sharedTextStyles,
            backgroundColor: "transparent",
            color: "transparent", // Text stays invisible normally
            caretColor: theme.text, // Keeps the native blinking cursor visible!
            outline: "none",
            resize: "none",
            zIndex: 2,
          }}
        />
      </main>
    </div>
  );
}
