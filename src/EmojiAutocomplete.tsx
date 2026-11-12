import React from "react";
import type { ColorTheme } from "./constants";
import type { EmojiEntry } from "./emojiData";

interface EmojiAutocompleteProps {
  suggestions: EmojiEntry[];
  selectedIndex: number;
  query: string;
  position: { x: number; y: number; placeAbove: boolean } | null;
  theme: ColorTheme;
  onSelect: (emoji: string) => void;
  onHoverIndex: (index: number) => void;
}

export const EmojiAutocomplete: React.FC<EmojiAutocompleteProps> = ({
  suggestions,
  selectedIndex,
  query,
  position,
  theme,
  onSelect,
  onHoverIndex,
}) => {
  if (!position || suggestions.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        ["--popover-base-transform" as string]: position.placeAbove
          ? "translateY(-100%)"
          : "translateY(0)",
        transform: position.placeAbove ? "translateY(-100%)" : "translateY(0)",
        zIndex: 100,
        width: "280px",
        maxHeight: "310px",
        backgroundColor: `${theme.bg}ee`,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: "16px",
        border: `1px solid ${theme.text}22`,
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px ${theme.text}10`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
        userSelect: "none",
        animation: "emojiPopoverIn 0.14s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      }}
      onMouseDown={(e) => {
        // Prevent stealing focus from textarea
        e.preventDefault();
      }}
    >
      {/* Header with Query & Match Count */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${theme.text}14`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "11px",
          color: `${theme.text}99`,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ opacity: 0.6 }}>:</span>
          <span style={{ color: theme.text }}>{query || "emoji"}</span>
        </span>
        <span style={{ fontSize: "10px", opacity: 0.5 }}>
          {suggestions.length} match{suggestions.length === 1 ? "" : "es"}
        </span>
      </div>

      {/* Suggestions List */}
      <div
        style={{
          padding: "4px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {suggestions.map((entry, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={entry.name}
              onMouseEnter={() => onHoverIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSelect(entry.emoji);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "6px 10px",
                borderRadius: "10px",
                cursor: "pointer",
                backgroundColor: isSelected ? `${theme.text}18` : "transparent",
                transition: "background-color 0.1s ease",
              }}
            >
              {/* Emoji Glyph */}
              <span
                style={{
                  fontSize: "24px",
                  lineHeight: "1",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontFamily:
                    '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                }}
              >
                {entry.emoji}
              </span>

              {/* Name & Primary Alias */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  flexGrow: 1,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: theme.text,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  :{entry.name}:
                </span>
                {entry.keywords.length > 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: `${theme.text}66`,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontFamily:
                        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    }}
                  >
                    {entry.keywords.slice(0, 3).join(", ")}
                  </span>
                )}
              </div>

              {/* Enter badge on selected row */}
              {isSelected && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "5px",
                    backgroundColor: `${theme.text}20`,
                    color: theme.text,
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    opacity: 0.85,
                  }}
                >
                  ↵
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Navigation Hints */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: `1px solid ${theme.text}10`,
          fontSize: "10px",
          color: `${theme.text}60`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: `${theme.text}06`,
        }}
      >
        <span>
          <strong style={{ color: `${theme.text}90` }}>↑↓</strong> or{" "}
          <strong style={{ color: `${theme.text}90` }}>←→</strong> navigate
        </span>
        <span>
          <strong style={{ color: `${theme.text}90` }}>↵ / Tab</strong> select
        </span>
      </div>
    </div>
  );
};
