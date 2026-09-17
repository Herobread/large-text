import { useEffect } from "react";

interface AnimatedTextDisplayProps {
  text: string;
}

export function AnimatedTextDisplay({ text }: AnimatedTextDisplayProps) {
  useEffect(() => {
    if (!document.querySelector("style[data-text-anim]")) {
      const style = document.createElement("style");
      style.dataset.textAnim = "true";
      style.textContent = `
        @keyframes charPop {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.7) rotate(-4deg);
            filter: blur(4px);
          }
          65% {
            opacity: 1;
            transform: translateY(-2px) scale(1.05) rotate(1deg);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }

        .anim-char {
          display: inline-block;
          animation: charPop 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
          will-change: transform, opacity;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const displayText = text || "TYPE...";

  return (
    <>
      {displayText.split("").map((char, index) => {
        if (char === "\n") {
          return <br key={index} />;
        }
        if (char === " ") {
          return <span key={index}>&nbsp;</span>;
        }
        return (
          <span key={`${char}-${index}`} className="anim-char">
            {char}
          </span>
        );
      })}
    </>
  );
}
