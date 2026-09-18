import { useEffect, useState } from "react";

interface AnimatedTextDisplayProps {
  text: string;
}

export function AnimatedTextDisplay({ text }: AnimatedTextDisplayProps) {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setIsPaused(false);
    const timer = setTimeout(() => {
      setIsPaused(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!document.querySelector("style[data-word-anim]")) {
      const style = document.createElement("style");
      style.dataset.wordAnim = "true";
      style.textContent = `
        @keyframes wordLockIn {
          0% {
            opacity: 0.45;
            filter: blur(1px);
          }
          100% {
            opacity: 1;
            filter: blur(0);
          }
        }

        .word-locked {
          display: inline;
          animation: wordLockIn 0.12s ease-out forwards;
        }

        .word-active {
          display: inline;
          opacity: 0.45;
          transition: opacity 0.1s ease;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const displayText = text || "TYPE...";
  // Split on whitespace boundaries while preserving whitespace sequences exactly
  const tokens = displayText.match(/\S+|\s+/g) || [];

  return (
    <>
      {tokens.map((token, index) => {
        // Render whitespace verbatim to preserve exact word-wrap parity with the textarea
        if (/^\s+$/.test(token)) {
          return token;
        }

        const isLastToken = index === tokens.length - 1;
        const isActive = isLastToken && !isPaused;

        return (
          <span
            key={`${index}-${token}`}
            className={isActive ? "word-active" : "word-locked"}
          >
            {token}
          </span>
        );
      })}
    </>
  );
}
