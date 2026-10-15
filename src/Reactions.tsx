import { useCallback, useEffect, useRef } from "react";
import { EMOJIS, type ColorTheme } from "./constants";

/**
 * Generates true physics-based parabolic trajectory keyframes with:
 * - Upward ballistic impulse & random horizontal velocity vector
 * - Gravitational acceleration (curved apex & descent)
 * - Snappy burst pop scale & graceful fade-out
 */
function generatePhysicsKeyframes(
  speed: number,
  angleRad: number,
  gravity: number,
  durationSec: number,
  steps = 16
): Keyframe[] {
  let vx = Math.cos(angleRad) * speed;
  let vy = Math.sin(angleRad) * speed;
  let x = 0;
  let y = 0;
  const dt = durationSec / steps;
  const drag = 0.985;
  const keyframes: Keyframe[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Organic scale curve: snappy burst pop (0.25 -> 1.35) -> gentle settlement -> soft exit
    let scale: number;
    if (t < 0.08) {
      scale = 0.25 + (t / 0.08) * 1.1;
    } else if (t < 0.22) {
      scale = 1.35 - ((t - 0.08) / 0.14) * 0.32;
    } else if (t < 0.65) {
      scale = 1.03 - ((t - 0.22) / 0.43) * 0.08;
    } else {
      scale = 0.95 - ((t - 0.65) / 0.35) * 0.3;
    }

    // Smooth opacity curve: instant appearance -> solid visibility during flight -> graceful fade
    let opacity: number;
    if (t < 0.05) {
      opacity = t / 0.05;
    } else if (t < 0.65) {
      opacity = 1;
    } else {
      opacity = Math.max(0, 1 - (t - 0.65) / 0.35);
    }

    keyframes.push({
      transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`,
      opacity: Number(opacity.toFixed(2)),
      offset: Number(t.toFixed(4)),
    });

    // Advance ballistic simulation step
    x += vx * dt;
    y += vy * dt;
    vy += gravity * dt;
    vx *= drag;
  }

  return keyframes;
}

export function Reactions({ theme }: { theme: ColorTheme }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Detect Mac platform for shortcut hint in tooltips
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/.test(navigator.platform || navigator.userAgent);
  const modKeyLabel = isMac ? "⌘" : "Ctrl";

  const triggerReaction = useCallback((index: number) => {
    if (index < 0 || index >= EMOJIS.length) return;

    const emoji = EMOJIS[index];
    const btn = buttonRefs.current[index];
    const container = containerRef.current;
    if (!container) return;

    let startX = window.innerWidth / 2;
    let startY = window.innerHeight - 47;

    if (btn) {
      const rect = btn.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height * 0.25;
    } else {
      const totalWidth = EMOJIS.length * 46 + (EMOJIS.length - 1) * 12;
      const leftOffset = (window.innerWidth - totalWidth) / 2;
      startX = leftOffset + index * 58 + 23;
    }

    // Ballistic physics parameters:
    // Bias launch angle inwards toward screen center so outer buttons arc across the stage
    const centerBias =
      (index - (EMOJIS.length - 1) / 2) / ((EMOJIS.length - 1) / 2);
    const baseAngleDeg = -90 - centerBias * 22;
    const angleDeg = baseAngleDeg + (Math.random() - 0.5) * 60;
    const angleRad = (angleDeg * Math.PI) / 180;

    // Launch speed and gravitational pull
    const speed = 700 + Math.random() * 220; // 700px/s - 920px/s
    const gravity = 950 + Math.random() * 150; // 950 - 1100 px/s²
    const durationSec = 1.25 + Math.random() * 0.3; // 1.25s - 1.55s
    const durationMs = durationSec * 1000;

    // Launch jitter and sizing
    const jitterX = (Math.random() - 0.5) * 10;
    const jitterY = (Math.random() - 0.5) * 6;
    const size = 42 + Math.random() * 8; // 42px - 50px

    // Create the floating emoji particle
    const el = document.createElement("div");
    el.textContent = emoji;
    Object.assign(el.style, {
      position: "absolute",
      left: `${startX + jitterX}px`,
      top: `${startY + jitterY}px`,
      width: "48px",
      height: "48px",
      marginLeft: "-24px",
      marginTop: "-24px",
      fontSize: `${Math.round(size)}px`,
      lineHeight: "48px",
      textAlign: "center",
      pointerEvents: "none",
      userSelect: "none",
      willChange: "transform, opacity",
      textShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
      fontFamily:
        '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
    });

    container.appendChild(el);

    // Keep active DOM elements bounded to 60 for optimal memory & compositor performance
    if (container.childElementCount > 60) {
      container.firstElementChild?.remove();
    }

    // Generate sampled physics keyframes and execute on GPU compositor thread
    const keyframes = generatePhysicsKeyframes(
      speed,
      angleRad,
      gravity,
      durationSec,
      16
    );

    const animation = el.animate(keyframes, {
      duration: durationMs,
      fill: "forwards",
    });

    animation.onfinish = () => {
      el.remove();
    };

    // Button icon squish & pop feedback
    const icon = btn?.querySelector<HTMLElement>(".reaction-icon");
    if (icon) {
      icon.getAnimations().forEach((a) => a.cancel());
      icon.animate(
        [
          { transform: "scale(1)", easing: "ease-out" },
          {
            transform: "scale(0.72) translateY(2px)",
            offset: 0.25,
            easing: "ease-out",
          },
          {
            transform: "scale(1.22) translateY(-2px)",
            offset: 0.6,
            easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          },
          { transform: "scale(1) translateY(0)", offset: 1 },
        ],
        { duration: 200 }
      );
    }
  }, []);

  // Keyboard shortcut listener: Ctrl + 1..6, Cmd + 1..6, or Alt + 1..6
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
      if (!hasModifier) return;

      let index = -1;

      // Layout-independent detection
      const digitCodeMatch = e.code.match(/^(?:Digit|Numpad)([1-6])$/);
      if (digitCodeMatch) {
        index = parseInt(digitCodeMatch[1], 10) - 1;
      } else if (e.key >= "1" && e.key <= String(EMOJIS.length)) {
        index = parseInt(e.key, 10) - 1;
      }

      if (index >= 0 && index < EMOJIS.length) {
        e.preventDefault();
        e.stopPropagation();
        triggerReaction(index);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [triggerReaction]);

  // Clean up any remaining floating particles when unmounting
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  return (
    <>
      {/* Floating particles portal container (zero React re-renders on spam) */}
      <div
        ref={containerRef}
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 60,
          overflow: "hidden",
        }}
      />

      {/* Bottom Buttons Bar */}
      <aside
        style={
          {
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: "12px",
            zIndex: 20,
            "--reaction-hover-bg": `${theme.text}18`,
          } as React.CSSProperties
        }
      >
        {EMOJIS.map((emoji, index) => (
          <button
            key={emoji}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            className="reaction-btn"
            onMouseDown={(e) => {
              // Prevent losing focus from the central textarea
              e.preventDefault();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              triggerReaction(index);
            }}
            title={`React with ${emoji} (${modKeyLabel}+${index + 1} or Alt+${index + 1})`}
            aria-label={`Reaction ${emoji}, shortcut ${modKeyLabel}+${index + 1}`}
            style={{
              position: "relative",
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
              userSelect: "none",
            }}
          >
            <span
              className="reaction-icon"
              style={{
                display: "inline-block",
                transform: "translateY(-1px)",
                pointerEvents: "none",
                willChange: "transform",
              }}
            >
              {emoji}
            </span>
            <span
              className="reaction-shortcut-badge"
              style={{ color: theme.text }}
            >
              {index + 1}
            </span>
          </button>
        ))}
      </aside>
    </>
  );
}
