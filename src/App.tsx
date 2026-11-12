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
import { EmojiAutocomplete } from "./EmojiAutocomplete";
import {
  findEmojiByShortcode,
  searchEmojis,
  type EmojiEntry,
} from "./emojiData";

interface EmojiTriggerState {
  query: string;
  colonIndex: number;
  cursor: number;
}

function getEmojiTrigger(val: string, cursor: number): EmojiTriggerState | null {
  const before = val.slice(0, cursor);
  const match = before.match(/(?:^|\s):([a-zA-Z0-9_а-яА-ЯіїєґІЇЄҐ+!-]*)$/u);
  if (!match) return null;
  const query = match[1];
  const colonIndex = cursor - query.length - 1;
  return { query, colonIndex, cursor };
}

interface WordDeleteRange {
  startIndex: number;
  endIndex: number;
  deletedText: string;
}

function findWordDeleteRange(
  text: string,
  selectionStart: number,
  selectionEnd: number
): WordDeleteRange | null {
  if (selectionStart !== selectionEnd) {
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return {
      startIndex: start,
      endIndex: end,
      deletedText: text.slice(start, end),
    };
  }

  const cursorPos = selectionStart;
  const before = text.slice(0, cursorPos);
  if (!before) return null;

  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const segments = Array.from(segmenter.segment(before));
    if (segments.length === 0) return null;

    const lastIdx = segments.length - 1;
    const lastSeg = segments[lastIdx];

    if (/^\s+$/.test(lastSeg.segment)) {
      if (segments.length === 1) {
        return {
          startIndex: 0,
          endIndex: cursorPos,
          deletedText: before,
        };
      }
      const prevSeg = segments[lastIdx - 1];
      return {
        startIndex: prevSeg.index,
        endIndex: cursorPos,
        deletedText: text.slice(prevSeg.index, cursorPos),
      };
    }

    return {
      startIndex: lastSeg.index,
      endIndex: cursorPos,
      deletedText: text.slice(lastSeg.index, cursorPos),
    };
  }

  const match = before.match(/((?:[\p{L}\p{N}_]+|[^\s\p{L}\p{N}]+)?\s*)$/u);
  if (match && match[1].length > 0) {
    const startIndex = cursorPos - match[1].length;
    return {
      startIndex,
      endIndex: cursorPos,
      deletedText: match[1],
    };
  }

  return {
    startIndex: Math.max(0, cursorPos - 1),
    endIndex: cursorPos,
    deletedText: text.slice(Math.max(0, cursorPos - 1), cursorPos),
  };
}

interface ActiveDelete {
  prefix: string;
  suffix: string;
  startIndex: number;
}

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
  const hasUppercase = /\p{Lu}/u.test(cleanText);
  const hasLowercase = /\p{Ll}/u.test(cleanText);
  const isAllCaps =
    hasUppercase &&
    !hasLowercase &&
    cleanText.length >= 2 &&
    cleanText === cleanText.toUpperCase();
  const isRage = isAllCaps || hasMultipleExclamations;
  const isWhisper = !isRage && /(\.{3,}|…)$/.test(cleanText);

  // Rapid-Fire Word Backspace Deletion Effect on Ctrl + Backspace (or Alt + Backspace on Mac)
  const [isRapidDeleting, setIsRapidDeleting] = useState(false);
  const isDeletingRef = useRef(false);
  const activeDeleteRef = useRef<ActiveDelete | null>(null);
  const deleteAnimIdRef = useRef<number | null>(null);
  const dissolveContainerRef = useRef<HTMLDivElement>(null);
  const measureMirrorRef = useRef<HTMLDivElement>(null);

  const cancelRapidDelete = useCallback(() => {
    if (deleteAnimIdRef.current !== null) {
      cancelAnimationFrame(deleteAnimIdRef.current);
      deleteAnimIdRef.current = null;
    }
    isDeletingRef.current = false;
    activeDeleteRef.current = null;
    setIsRapidDeleting(false);
    setFrozenFontSize(null);
    if (measureMirrorRef.current) {
      measureMirrorRef.current.textContent = "";
    }
  }, []);

  // Telegram-style :emoji autocomplete state & positioning
  const [emojiTrigger, setEmojiTrigger] = useState<EmojiTriggerState | null>(null);
  const [emojiSuggestions, setEmojiSuggestions] = useState<EmojiEntry[]>([]);
  const [selectedEmojiIndex, setSelectedEmojiIndex] = useState(0);
  const [emojiPopoverPosition, setEmojiPopoverPosition] = useState<{
    x: number;
    y: number;
    placeAbove: boolean;
  } | null>(null);

  const updateEmojiPopoverPosition = useCallback(
    (colonIndex: number, currentText?: string) => {
      const mirror = measureMirrorRef.current;
      const textarea = textRef.current;
      if (!mirror || !textarea) return;

      const fullText = currentText ?? textarea.value;
      const beforeText = fullText.slice(0, colonIndex);

      mirror.innerHTML = "";
      if (beforeText) {
        mirror.appendChild(document.createTextNode(beforeText));
      }
      const marker = document.createElement("span");
      marker.textContent = ":";
      marker.style.display = "inline";
      mirror.appendChild(marker);

      const rect = marker.getBoundingClientRect();
      mirror.innerHTML = "";

      if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
        const tr = textarea.getBoundingClientRect();
        setEmojiPopoverPosition({
          x: tr.left + 24,
          y: tr.top + 60,
          placeAbove: false,
        });
        return;
      }

      const popupHeight = 240;
      const placeAbove = rect.top - popupHeight - 16 > 10;
      const y = placeAbove ? rect.top - 8 : rect.bottom + 8;
      const x = Math.max(16, Math.min(window.innerWidth - 300, rect.left - 8));

      setEmojiPopoverPosition({ x, y, placeAbove });
    },
    []
  );

  const insertEmoji = useCallback(
    (chosenEmoji: string) => {
      const trigger = emojiTrigger;
      const textarea = textRef.current;
      if (!trigger || !textarea) return;

      const val = textarea.value;
      const before = val.slice(0, trigger.colonIndex);
      const after = val.slice(trigger.cursor);
      const replacement = `${chosenEmoji} `;
      const nextVal = `${before}${replacement}${after}`;
      const nextCursor = before.length + replacement.length;

      setText(nextVal);
      textarea.value = nextVal;
      textarea.setSelectionRange(nextCursor, nextCursor);
      textarea.focus();

      setEmojiTrigger(null);
      setEmojiSuggestions([]);
      setSelectedEmojiIndex(0);
      setEmojiPopoverPosition(null);
    },
    [emojiTrigger]
  );

  useEffect(() => {
    if (emojiTrigger) {
      updateEmojiPopoverPosition(emojiTrigger.colonIndex);
    }
  }, [fontSize, emojiTrigger, updateEmojiPopoverPosition]);

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
    // If a deletion is already in progress, immediately finalize it so the next word deletes instantly
    if (isDeletingRef.current && activeDeleteRef.current) {
      const prev = activeDeleteRef.current;
      if (deleteAnimIdRef.current !== null) {
        cancelAnimationFrame(deleteAnimIdRef.current);
        deleteAnimIdRef.current = null;
      }
      const committedText = prev.prefix + prev.suffix;
      setText(committedText);
      if (textRef.current) {
        textRef.current.value = committedText;
        textRef.current.setSelectionRange(prev.startIndex, prev.startIndex);
      }
      activeDeleteRef.current = null;
      isDeletingRef.current = false;
    }

    const currentVal = textRef.current?.value ?? text;
    if (!currentVal) return;

    const selectionStart = textRef.current?.selectionStart ?? currentVal.length;
    const selectionEnd = textRef.current?.selectionEnd ?? currentVal.length;

    const targetRange = findWordDeleteRange(currentVal, selectionStart, selectionEnd);
    if (!targetRange || targetRange.startIndex === targetRange.endIndex) return;

    const { startIndex, endIndex, deletedText } = targetRange;
    if (!deletedText) return;

    const prefix = currentVal.slice(0, startIndex);
    const suffix = currentVal.slice(endIndex);

    let graphemes: string[] = [];
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      graphemes = Array.from(graphemeSegmenter.segment(deletedText)).map((s) => s.segment);
    } else {
      graphemes = Array.from(deletedText);
    }
    if (graphemes.length === 0) return;

    isDeletingRef.current = true;
    activeDeleteRef.current = { prefix, suffix, startIndex };
    setIsRapidDeleting(true);
    setHasSelection(false);
    setFrozenFontSize(autoFontSize);

    const totalChars = graphemes.length;
    // Dynamic rapid-fire pacing: 120ms to 540ms based on character count
    const targetDurationMs = Math.min(540, Math.max(120, totalChars * 24));

    const startTime = performance.now();
    let alreadyDeleted = 0;
    let currentWordGraphemes = [...graphemes];

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

        const deletedChars = currentWordGraphemes.slice(
          Math.max(0, currentWordGraphemes.length - charsToDelete)
        );
        const remainingWordGraphemes = currentWordGraphemes.slice(
          0,
          Math.max(0, currentWordGraphemes.length - charsToDelete)
        );
        const remainingWordText = remainingWordGraphemes.join("");

        // Precision in-DOM measurement mirror to dissolve each letter in place
        const mirror = measureMirrorRef.current;
        if (mirror) {
          mirror.innerHTML = "";
          if (prefix || remainingWordText) {
            mirror.appendChild(document.createTextNode(prefix + remainingWordText));
          }
          const spans: HTMLSpanElement[] = [];
          for (const ch of deletedChars) {
            const span = document.createElement("span");
            span.textContent = ch;
            span.style.display = "inline";
            mirror.appendChild(span);
            spans.push(span);
          }
          if (suffix) {
            mirror.appendChild(document.createTextNode(suffix));
          }

          for (let i = 0; i < spans.length; i++) {
            const ch = deletedChars[i];
            const rect = spans[i].getBoundingClientRect();
            dissolveLetter(ch, rect);
          }
        }

        currentWordGraphemes = remainingWordGraphemes;
        const nextText = prefix + remainingWordText + suffix;
        const newCursorPos = prefix.length + remainingWordText.length;

        setText(nextText);
        if (textRef.current) {
          textRef.current.value = nextText;
          textRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }

        if (alreadyDeleted >= totalChars || currentWordGraphemes.length === 0) {
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

  // Shortcut handler: Backspace/Delete with active selection (e.g. Ctrl + A -> Backspace) or Ctrl + X (Cut)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement> | KeyboardEvent) => {
      // Telegram-style :emoji autocomplete navigation & selection
      if (emojiTrigger && emojiSuggestions.length > 0) {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEmojiIndex((prev) => (prev + 1) % emojiSuggestions.length);
          return;
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEmojiIndex(
            (prev) => (prev - 1 + emojiSuggestions.length) % emojiSuggestions.length
          );
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          e.stopPropagation();
          const chosen = emojiSuggestions[selectedEmojiIndex];
          if (chosen) {
            insertEmoji(chosen.emoji);
          }
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setEmojiTrigger(null);
          setEmojiSuggestions([]);
          setEmojiPopoverPosition(null);
          return;
        }
      }

      const isBackspace = e.key === "Backspace" || e.code === "Backspace";
      const isDelete = e.key === "Delete" || e.code === "Delete";
      const isCutKey =
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        (e.code === "KeyX" || (typeof e.key === "string" && e.key.toLowerCase() === "x"));

      const hasActiveSelection =
        textRef.current != null &&
        textRef.current.selectionStart !== textRef.current.selectionEnd;

      const isSelectionDelete =
        (isBackspace || isDelete) && hasActiveSelection;

      const isCut = isCutKey && hasActiveSelection;

      if (isSelectionDelete || isCut) {
        if (isCut && textRef.current) {
          const start = Math.min(textRef.current.selectionStart, textRef.current.selectionEnd);
          const end = Math.max(textRef.current.selectionStart, textRef.current.selectionEnd);
          const selectedText = textRef.current.value.slice(start, end);
          if (selectedText && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(selectedText).catch(() => {});
          }
        }

        e.preventDefault();
        e.stopPropagation();
        startRapidDelete();
        return;
      }

      // If user starts typing or presses another key while word deleting, commit and interrupt
      if (
        isDeletingRef.current &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        if (activeDeleteRef.current) {
          const prev = activeDeleteRef.current;
          const finalPrevText = prev.prefix + prev.suffix;
          setText(finalPrevText);
          if (textRef.current) {
            textRef.current.value = finalPrevText;
            textRef.current.setSelectionRange(prev.startIndex, prev.startIndex);
          }
        }
        cancelRapidDelete();
      }
    },
    [
      cancelRapidDelete,
      emojiSuggestions,
      emojiTrigger,
      insertEmoji,
      selectedEmojiIndex,
      startRapidDelete,
    ]
  );

  const handleCut = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const target = textRef.current;
      if (!target) return;
      const { selectionStart, selectionEnd, value } = target;
      if (selectionStart !== selectionEnd) {
        const start = Math.min(selectionStart, selectionEnd);
        const end = Math.max(selectionStart, selectionEnd);
        const selectedText = value.slice(start, end);
        if (selectedText) {
          e.clipboardData.setData("text/plain", selectedText);
        }
        e.preventDefault();
        e.stopPropagation();
        startRapidDelete();
      }
    },
    [startRapidDelete]
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

        {emojiTrigger && emojiSuggestions.length > 0 && (
          <EmojiAutocomplete
            suggestions={emojiSuggestions}
            selectedIndex={selectedEmojiIndex}
            query={emojiTrigger.query}
            position={emojiPopoverPosition}
            theme={theme}
            onSelect={insertEmoji}
            onHoverIndex={setSelectedEmojiIndex}
          />
        )}

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
              const nextVal = e.target.value;
              const cursor = e.target.selectionStart;

              // Check if exact shortcode was just closed, e.g. :fire:
              const beforeCursor = nextVal.slice(0, cursor);
              const exactMatch = beforeCursor.match(
                /(?:^|\s):([a-zA-Z0-9_а-яА-ЯіїєґІЇЄҐ+!-]+):$/u
              );

              if (exactMatch) {
                const shortcode = exactMatch[1];
                const found = findEmojiByShortcode(shortcode);
                if (found) {
                  const colonStart = cursor - shortcode.length - 2;
                  const before = nextVal.slice(0, colonStart);
                  const after = nextVal.slice(cursor);
                  const replaced = `${before}${found.emoji} ${after}`;
                  const newCursor = before.length + found.emoji.length + 1;

                  setText(replaced);
                  e.target.value = replaced;
                  e.target.setSelectionRange(newCursor, newCursor);

                  setEmojiTrigger(null);
                  setEmojiSuggestions([]);
                  setSelectedEmojiIndex(0);
                  setEmojiPopoverPosition(null);
                  checkSelection(e);
                  return;
                }
              }

              setText(nextVal);
              checkSelection(e);

              // Check for active emoji autocomplete trigger, e.g. :fi
              const trigger = getEmojiTrigger(nextVal, cursor);
              if (trigger) {
                setEmojiTrigger(trigger);
                const matches = searchEmojis(trigger.query, 6);
                setEmojiSuggestions(matches);
                setSelectedEmojiIndex(0);
                updateEmojiPopoverPosition(trigger.colonIndex, nextVal);
              } else {
                setEmojiTrigger(null);
                setEmojiSuggestions([]);
                setSelectedEmojiIndex(0);
                setEmojiPopoverPosition(null);
              }
            }}
            onKeyDown={handleKeyDown}
            onCut={handleCut}
            onSelect={(e) => {
              checkSelection(e);
              const cursor = e.currentTarget.selectionStart;
              const val = e.currentTarget.value;
              if (e.currentTarget.selectionStart !== e.currentTarget.selectionEnd) {
                setEmojiTrigger(null);
                setEmojiSuggestions([]);
                setEmojiPopoverPosition(null);
              } else {
                const trigger = getEmojiTrigger(val, cursor);
                if (trigger) {
                  setEmojiTrigger(trigger);
                  const matches = searchEmojis(trigger.query, 6);
                  setEmojiSuggestions(matches);
                  updateEmojiPopoverPosition(trigger.colonIndex, val);
                } else if (emojiTrigger) {
                  setEmojiTrigger(null);
                  setEmojiSuggestions([]);
                  setEmojiPopoverPosition(null);
                }
              }
            }}
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
