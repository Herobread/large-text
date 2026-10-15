import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from "react";
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
  const autoFontSize = useAutoFontSize(containerRef, text, font);
  const [frozenFontSize, setFrozenFontSize] = useState<number | null>(null);
  const fontSize = frozenFontSize ?? autoFontSize;

  // Reactive Typography detection:
  // - Rage / Intensity: ALL CAPS (min 2 chars) OR multiple exclamation marks like "!!" or "?!"
  // - Whisper / Calm: ends with ellipsis "..." or "…"
  const cleanText = text.trim();
  const hasMultipleExclamations = /!{2,}|\?!|!\?/.test(cleanText);
  const hasLetters = /[a-zA-Z]/.test(cleanText);
  const isAllCaps =
    hasLetters &&
    cleanText.length >= 2 &&
    cleanText === cleanText.toUpperCase() &&
    !/[a-z]/.test(cleanText);
  const isRage = isAllCaps || hasMultipleExclamations;
  const isWhisper = !isRage && /(\.{3,}|…)$/.test(cleanText);

  // Rapid-Fire Backspace Deletion Effect on Shift + Delete / Shift + Backspace
  const [isRapidDeleting, setIsRapidDeleting] = useState(false);
  const isDeletingRef = useRef(false);
  const deleteAnimIdRef = useRef<number | null>(null);
  const dissolveContainerRef = useRef<HTMLDivElement>(null);
  const measureMirrorRef = useRef<HTMLDivElement>(null);

  const cancelRapidDelete = useCallback(() => {
    if (deleteAnimIdRef.current !== null) {
      cancelAnimationFrame(deleteAnimIdRef.current);
      deleteAnimIdRef.current = null;
    }
    isDeletingRef.current = false;
    setIsRapidDeleting(false);
    setFrozenFontSize(null);
    if (measureMirrorRef.current) {
      measureMirrorRef.current.textContent = "";
    }
  }, []);

  useEffect(() => {
    const dissolveContainer = dissolveContainerRef.current;
    const measureMirror = measureMirrorRef.current;
    return () => {
      if (deleteAnimIdRef.current !== null) {
        cancelAnimationFrame(deleteAnimIdRef.current);
      }
      if (dissolveContainer) {
        dissolveContainer.innerHTML = "";
      }
      if (measureMirror) {
        measureMirror.textContent = "";
      }
    };
  }, []);

  const dissolveLetter = useCallback(
    (char: string, rect: DOMRect) => {
      if (!char || /^\s$/.test(char)) return;
      const container = dissolveContainerRef.current;
      if (!container) return;

      if (container.childElementCount > 40) {
        container.firstElementChild?.remove();
      }

      const el = document.createElement("div");
      el.textContent = char;

      let targetLeft = rect.left;
      let targetTop = rect.top;
      let targetWidth = rect.width;
      let targetHeight = rect.height;

      if (targetWidth === 0 || targetHeight === 0) {
        if (textRef.current) {
          const r = textRef.current.getBoundingClientRect();
          targetLeft = r.left + 24;
          targetTop = r.top + 24;
          targetWidth = fontSize * 0.6;
          targetHeight = fontSize;
        }
      }

      Object.assign(el.style, {
        position: "fixed",
        left: `${targetLeft}px`,
        top: `${targetTop}px`,
        width: `${Math.max(1, targetWidth)}px`,
        height: `${Math.max(1, targetHeight)}px`,
        fontSize: `${fontSize}px`,
        lineHeight: font.lineHeight,
        fontFamily: font.family,
        fontWeight: font.weight,
        color: theme.text,
        textAlign: "left",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: "60",
        whiteSpace: "pre",
        transformOrigin: "center center",
        willChange: "opacity, filter, transform",
        textShadow: `0 0 16px ${theme.text}40, 0 0 32px ${theme.text}20`,
      });

      container.appendChild(el);

      const keyframes: Keyframe[] = [
        {
          opacity: 1,
          filter: "blur(0px) brightness(1)",
          transform: "scale(1)",
          offset: 0,
        },
        {
          opacity: 0.82,
          filter: "blur(2.5px) brightness(1.2)",
          transform: "scale(1.02)",
          offset: 0.35,
        },
        {
          opacity: 0,
          filter: "blur(10px) brightness(1.35)",
          transform: "scale(1.05)",
          offset: 1,
        },
      ];

      const anim = el.animate(keyframes, {
        duration: 340,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      });

      anim.onfinish = () => {
        el.remove();
      };
    },
    [font.family, font.lineHeight, font.weight, fontSize, theme.text]
  );

  const startRapidDelete = useCallback(() => {
    // If already deleting, pressing the shortcut again acts as an instant force-nuke
    if (isDeletingRef.current) {
      cancelRapidDelete();
      setText("");
      if (textRef.current) {
        textRef.current.value = "";
        textRef.current.focus();
      }
      return;
    }

    const currentVal = textRef.current?.value ?? text;
    if (!currentVal.trim()) return;

    // Use Array.from for clean Unicode & emoji grapheme preservation
    const graphemes = Array.from(currentVal);
    if (graphemes.length === 0) return;

    isDeletingRef.current = true;
    setIsRapidDeleting(true);
    setFrozenFontSize(autoFontSize);

    const totalChars = graphemes.length;
    // Dynamic rapid-fire pacing: 160ms to 540ms total duration
    const targetDurationMs = Math.min(540, Math.max(160, totalChars * 26));

    const startTime = performance.now();
    let alreadyDeleted = 0;
    let currentGraphemes = [...graphemes];

    const step = (now: number) => {
      if (!isDeletingRef.current) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / targetDurationMs));

      // Nonlinear Ease-In curve: starts with tactile deliberate pace, smoothly accelerates up to ~5x speed
      const easedProgress = 0.22 * progress + 0.78 * Math.pow(progress, 2.3);
      const targetDeleted = Math.min(
        totalChars,
        progress >= 1 ? totalChars : Math.round(easedProgress * totalChars)
      );

      const charsToDelete = targetDeleted - alreadyDeleted;

      if (charsToDelete > 0) {
        alreadyDeleted += charsToDelete;

        const deletedChars = currentGraphemes.slice(
          Math.max(0, currentGraphemes.length - charsToDelete)
        );
        const prefix = currentGraphemes
          .slice(0, Math.max(0, currentGraphemes.length - charsToDelete))
          .join("");

        // Precision in-DOM measurement mirror to dissolve each letter in place
        const mirror = measureMirrorRef.current;
        if (mirror) {
          mirror.textContent = prefix;
          const spans: HTMLSpanElement[] = [];
          for (const ch of deletedChars) {
            const span = document.createElement("span");
            span.textContent = ch;
            span.style.display = "inline";
            mirror.appendChild(span);
            spans.push(span);
          }

          for (let i = 0; i < spans.length; i++) {
            const ch = deletedChars[i];
            const rect = spans[i].getBoundingClientRect();
            dissolveLetter(ch, rect);
          }
        }

        currentGraphemes = currentGraphemes.slice(
          0,
          Math.max(0, currentGraphemes.length - charsToDelete)
        );
        const nextText = currentGraphemes.join("");

        setText(nextText);
        if (textRef.current) {
          textRef.current.value = nextText;
          textRef.current.setSelectionRange(nextText.length, nextText.length);
        }

        if (alreadyDeleted >= totalChars || currentGraphemes.length === 0) {
          cancelRapidDelete();
          textRef.current?.focus();
          return;
        }
      } else if (progress >= 1) {
        cancelRapidDelete();
        textRef.current?.focus();
        return;
      }

      deleteAnimIdRef.current = requestAnimationFrame(step);
    };

    deleteAnimIdRef.current = requestAnimationFrame(step);
  }, [autoFontSize, cancelRapidDelete, dissolveLetter, text]);

  // Shortcut handler: Shift + Delete or Shift + Backspace
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => {
      const isShiftDelete =
        e.shiftKey &&
        (e.key === "Delete" ||
          e.code === "Delete" ||
          e.key === "Backspace" ||
          e.code === "Backspace" ||
          e.code === "NumpadDecimal");

      if (isShiftDelete) {
        e.preventDefault();
        e.stopPropagation();
        startRapidDelete();
        return;
      }

      // If user starts typing or presses another key while rapid backspacing, interrupt immediately
      if (
        isDeletingRef.current &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        cancelRapidDelete();
      }
    },
    [cancelRapidDelete, startRapidDelete]
  );

  // Global window fallback listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

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

  const textStageStyles: React.CSSProperties = {
    position: "absolute",
    top: "64px",
    bottom: "64px",
    left: 0,
    right: 0,
    width: "calc(100% - 168px)",
    maxWidth: "800px",
    margin: "0 auto",
    boxSizing: "border-box",
  };

  const sharedTextStyles: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    padding: 0,
    fontFamily: font.family,
    fontWeight: font.weight,
    fontSize: `${fontSize}px`,
    lineHeight: font.lineHeight,
    textAlign: "left",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    border: "none",
    boxSizing: "border-box",
    overflow: "hidden",
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
      {/* Dissolve Letters Container */}
      <div
        ref={dissolveContainerRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 60,
          overflow: "hidden",
        }}
      />

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

        {/* TEXT STAGE (Applies Rage Vibration & Whisper Shimmer) */}
        <div
          className={`text-stage ${!isRapidDeleting && isRage ? "text-rage" : !isRapidDeleting && isWhisper ? "text-whisper" : ""}`}
          style={
            {
              ...textStageStyles,
              "--shimmer-dim": `${theme.text}40`,
              "--shimmer-bright": theme.text,
            } as React.CSSProperties
          }
        >
          {/* 1. ANIMATED BACKGROUND LAYER */}
          <div
            aria-hidden="true"
            style={{
              ...sharedTextStyles,
              pointerEvents: "none",
              color: isWhisper ? "transparent" : theme.text,
              opacity: hasSelection || !text ? 0.35 : 1,
              transition: "opacity 0.1s ease, color 0.25s ease",
              zIndex: 1,
            }}
          >
            <span className="shimmer-text-target">
              <AnimatedTextDisplay text={text} />
            </span>
          </div>

          {/* 2. INTERACTIVE FOREGROUND LAYER */}
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => {
              if (isDeletingRef.current) {
                cancelRapidDelete();
              }
              setText(e.target.value);
              checkSelection(e);
            }}
            onKeyDown={handleKeyDown}
            onSelect={checkSelection}
            onKeyUp={checkSelection}
            onMouseUp={checkSelection}
            onBlur={() => setHasSelection(false)}
            autoFocus
            spellCheck={false}
            style={{
              ...sharedTextStyles,
              backgroundColor: "transparent",
              color: "transparent",
              caretColor: theme.text,
              outline: "none",
              resize: "none",
              zIndex: 2,
            }}
          />

          {/* 3. MEASUREMENT MIRROR FOR PIXEL-PERFECT POSITION TRACKING */}
          <div
            ref={measureMirrorRef}
            aria-hidden="true"
            style={{
              ...sharedTextStyles,
              visibility: "hidden",
              pointerEvents: "none",
              zIndex: -1,
            }}
          />
        </div>
      </main>
    </div>
  );
}
