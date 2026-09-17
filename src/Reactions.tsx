import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface FontOption {
  id: string;
  name: string;
  family: string;
  weight: string;
  lineHeight: number;
  googleParam: string;
}

interface ColorTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  dot: string;
}

const FONTS: FontOption[] = [
  {
    id: "syne",
    name: "Syne",
    family: '"Syne", sans-serif',
    weight: "800",
    lineHeight: 1.05,
    googleParam: "family=Syne:wght@800",
  },
  {
    id: "italiana",
    name: "Italiana",
    family: '"Italiana", serif',
    weight: "400",
    lineHeight: 1.15,
    googleParam: "family=Italiana",
  },
  {
    id: "rock-salt",
    name: "Rock Salt",
    family: '"Rock Salt", cursive',
    weight: "400",
    lineHeight: 1.3,
    googleParam: "family=Rock+Salt",
  },
  {
    id: "fraunces",
    name: "Fraunces",
    family: '"Fraunces", serif',
    weight: "900",
    lineHeight: 1.05,
    googleParam: "family=Fraunces:opsz,wght@9..144,900",
  },
  {
    id: "inter",
    name: "Inter",
    family: '"Inter", sans-serif',
    weight: "700",
    lineHeight: 1.1,
    googleParam: "family=Inter:wght@700",
  },
  {
    id: "silkscreen",
    name: "Silkscreen",
    family: '"Silkscreen", monospace',
    weight: "700",
    lineHeight: 1.25,
    googleParam: "family=Silkscreen:wght@700",
  },
];

const THEMES: ColorTheme[] = [
  {
    id: "mono-dark",
    name: "Obsidian",
    bg: "#0c0c0e",
    text: "#e6e6e8",
    dot: "#27272a",
  },
  {
    id: "sage",
    name: "Muted Sage",
    bg: "#131916",
    text: "#d3ded7",
    dot: "#2f3f38",
  },
  {
    id: "navy",
    name: "Deep Indigo",
    bg: "#0f141d",
    text: "#d4dbe8",
    dot: "#2a3547",
  },
  {
    id: "plum",
    name: "Muted Plum",
    bg: "#1a1318",
    text: "#ded0da",
    dot: "#3d2e38",
  },
  {
    id: "ochre",
    name: "Burnt Amber",
    bg: "#171410",
    text: "#e4dacd",
    dot: "#42362b",
  },
  {
    id: "paper",
    name: "Warm Parchment",
    bg: "#e8e5de",
    text: "#21201d",
    dot: "#cbc6bc",
  },
];

const STORAGE_KEYS = {
  TEXT: "app_text",
  FONT_ID: "app_font_id",
  THEME_ID: "app_theme_id",
};

const MAX_FONT_SIZE = 64;
const EMOJIS = ["💀", "👀", "🔥", "😂", "❓", "👍"];

function snapToScale(rawSize: number): number {
  let step = 4;
  if (rawSize > 48) step = 8;
  else if (rawSize > 32) step = 6;
  return Math.floor(rawSize / step) * step;
}

// --------------------------------------------------------
// DROP-IN REACTIONS COMPONENT
// --------------------------------------------------------
export function Reactions({ theme }: { theme: ColorTheme }) {
  const [overlay, setOverlay] = useState({ emoji: EMOJIS[0], show: false });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReaction = (emoji: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Set to show
    setOverlay({ emoji, show: true });

    // Auto fade-out after 1.5s
    timeoutRef.current = setTimeout(() => {
      setOverlay((prev) => ({ ...prev, show: false }));
    }, 1500);
  };

  return (
    <>
      {/* Inject custom hover styles dynamically based on the current theme */}
      <style>{`
        .reaction-btn {
          opacity: 0.35;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .reaction-btn:hover {
          opacity: 1 !important;
          background-color: ${theme.text}18 !important;
          transform: translateY(-4px) scale(1.05);
        }
        .reaction-btn:active {
          transform: translateY(0px) scale(0.95);
        }
      `}</style>

      {/* 128px Center Overlay (Never Unmounts) */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          fontSize: "128px",
          pointerEvents: "none",
          zIndex: 50,
          // The magic sauce: Pop in with a spring, fade out gracefully
          transform: overlay.show
            ? "translate(-50%, -50%) scale(1) translateY(0px)"
            : "translate(-50%, -50%) scale(0.4) translateY(40px)",
          opacity: overlay.show ? 1 : 0,
          filter: overlay.show
            ? "drop-shadow(0 20px 30px rgba(0,0,0,0.3))"
            : "drop-shadow(0 0px 0px rgba(0,0,0,0))",
          transition: overlay.show
            ? "transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease-out, filter 0.4s ease-out"
            : "transform 0.6s ease-in, opacity 0.5s ease-in, filter 0.6s ease-in",
        }}
      >
        {overlay.emoji}
      </div>

      {/* Bottom Buttons Bar */}
      <aside
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "12px",
          zIndex: 10,
        }}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            className="reaction-btn"
            onClick={(e) => {
              e.preventDefault();
              triggerReaction(emoji);
            }}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              border: `1px solid ${theme.text}26`,
              backgroundColor: "transparent",
              color: theme.text,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "22px",
            }}
          >
            {emoji}
          </button>
        ))}
      </aside>
    </>
  );
}
// --------------------------------------------------------

export default function App() {
  const [text, setText] = useState<string>(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      try {
        return decodeURIComponent(hash);
      } catch {
        return "";
      }
    }
    return localStorage.getItem(STORAGE_KEYS.TEXT) ?? "";
  });

  const [font, setFont] = useState<FontOption>(() => {
    const savedFontId = localStorage.getItem(STORAGE_KEYS.FONT_ID);
    return FONTS.find((f) => f.id === savedFontId) ?? FONTS[0];
  });

  const [theme, setTheme] = useState<ColorTheme>(() => {
    const savedThemeId = localStorage.getItem(STORAGE_KEYS.THEME_ID);
    return THEMES.find((t) => t.id === savedThemeId) ?? THEMES[0];
  });

  const [fontSize, setFontSize] = useState<number>(MAX_FONT_SIZE);

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Inject Google Fonts and zero-out body/root margins
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
      link.href = fontUrl;
      document.head.appendChild(link);
    }

    let style = document.querySelector<HTMLStyleElement>(
      'style[data-app-reset="true"]',
    );
    if (!style) {
      style = document.createElement("style");
      style.dataset.appReset = "true";
      style.textContent = `
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Persist selections and text to localStorage & URL hash
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FONT_ID, font.id);
  }, [font.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME_ID, theme.id);
  }, [theme.id]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEXT, text);
    if (text) {
      window.history.replaceState(null, "", `#${encodeURIComponent(text)}`);
    } else {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  }, [text]);

  // Fit font size up to 64px based on available container bounds
  useLayoutEffect(() => {
    const calculateFontSize = () => {
      const displayText = text.trim() || "TYPE...";

      if (!containerRef.current) {
        setFontSize(MAX_FONT_SIZE);
        return;
      }

      const { clientWidth, clientHeight } = containerRef.current;
      const paddingX = 160;
      const paddingY = 140; // Increased to ensure text doesn't overlap the new bottom buttons

      const availableWidth = clientWidth - paddingX;
      const availableHeight = clientHeight - paddingY;

      if (availableWidth <= 0 || availableHeight <= 0) return;

      let min = 14;
      let max = MAX_FONT_SIZE;
      let rawBest = min;

      const dummy = document.createElement("div");
      dummy.style.position = "absolute";
      dummy.style.visibility = "hidden";
      dummy.style.whiteSpace = "pre-wrap";
      dummy.style.wordBreak = "break-word";
      dummy.style.fontFamily = font.family;
      dummy.style.fontWeight = font.weight;
      dummy.style.lineHeight = `${font.lineHeight}`;
      dummy.style.width = `${availableWidth}px`;
      dummy.innerText = displayText;
      document.body.appendChild(dummy);

      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        dummy.style.fontSize = `${mid}px`;

        if (
          dummy.offsetHeight <= availableHeight &&
          dummy.offsetWidth <= availableWidth
        ) {
          rawBest = mid;
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }

      document.body.removeChild(dummy);
      setFontSize(Math.min(MAX_FONT_SIZE, Math.max(14, snapToScale(rawBest))));
    };

    calculateFontSize();
    window.addEventListener("resize", calculateFontSize);
    return () => window.removeEventListener("resize", calculateFontSize);
  }, [text, font]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.bg,
        color: theme.text,
        transition: "background-color 0.25s ease, color 0.25s ease",
        userSelect: "none",
      }}
    >
      {/* Drop-in Reactions Component */}
      <Reactions theme={theme} />

      {/* Muted Color Theme Palette */}
      <aside
        style={{
          position: "fixed",
          left: "24px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
        }}
      >
        {THEMES.map((t) => {
          const isSelected = t.id === theme.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t);
                textRef.current?.focus();
              }}
              title={t.name}
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                backgroundColor: t.dot,
                border: isSelected
                  ? `2px solid ${theme.text}`
                  : "2px solid transparent",
                outline: isSelected ? `2px solid ${t.dot}` : "none",
                outlineOffset: "2px",
                cursor: "pointer",
                opacity: isSelected ? 1 : 0.45,
                transition: "all 0.15s ease",
                padding: 0,
              }}
            />
          );
        })}
      </aside>

      {/* Font Family Picker */}
      <aside
        style={{
          position: "fixed",
          right: "24px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {FONTS.map((item) => {
          const isSelected = item.id === font.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setFont(item);
                textRef.current?.focus();
              }}
              title={item.name}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                border: isSelected
                  ? `2px solid ${theme.text}`
                  : `1px solid ${theme.text}26`,
                backgroundColor: isSelected ? `${theme.text}18` : "transparent",
                color: theme.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontFamily: item.family,
                fontWeight: item.weight,
                fontSize: "19px",
                lineHeight: 1,
                opacity: isSelected ? 1 : 0.35,
                transition: "all 0.15s ease",
              }}
            >
              Aa
            </button>
          );
        })}
      </aside>

      {/* Main Text Area */}
      <main
        ref={containerRef}
        onClick={() => textRef.current?.focus()}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          cursor: "text",
        }}
      >
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="TYPE..."
          autoFocus
          spellCheck={false}
          style={{
            width: "100%",
            height: "100%",
            resize: "none",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            color: theme.text,
            fontSize: `${fontSize}px`,
            fontFamily: font.family,
            fontWeight: font.weight,
            textAlign: "center",
            lineHeight: font.lineHeight,
            overflow: "hidden",
            userSelect: "text",
            transition: "color 0.25s ease",
          }}
        />
      </main>
    </div>
  );
}
