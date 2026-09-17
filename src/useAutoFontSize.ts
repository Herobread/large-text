import { useLayoutEffect, useState, type RefObject } from "react";
import { MAX_FONT_SIZE, snapToScale, type FontOption } from "./constants";

export function useAutoFontSize(
  containerRef: RefObject<HTMLDivElement | null>,
  text: string,
  font: FontOption,
) {
  const [fontSize, setFontSize] = useState<number>(MAX_FONT_SIZE);

  useLayoutEffect(() => {
    const calculate = () => {
      const container = containerRef.current;
      if (!container) return;

      const availableWidth = container.clientWidth - 160;
      const availableHeight = container.clientHeight - 60;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const dummy = document.createElement("div");
      Object.assign(dummy.style, {
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: font.family,
        fontWeight: font.weight,
        lineHeight: `${font.lineHeight}`,
        width: `${availableWidth}px`,
      });
      dummy.innerText = text.trim() || "TYPE...";
      document.body.appendChild(dummy);

      let min = 14;
      let max = MAX_FONT_SIZE;
      let best = min;

      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        dummy.style.fontSize = `${mid}px`;

        if (
          dummy.offsetHeight <= availableHeight &&
          dummy.offsetWidth <= availableWidth
        ) {
          best = mid;
          min = mid + 1;
        } else {
          max = mid - 1;
        }
      }

      document.body.removeChild(dummy);
      setFontSize(Math.min(MAX_FONT_SIZE, Math.max(14, snapToScale(best))));
    };

    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, [text, font, containerRef]);

  return fontSize;
}
