import { FONTS, type FontOption } from "./constants";
import { useStyleSettings } from "./useStyleSettings";

interface FontSelectorProps {
  onSelectFont?: (font: FontOption) => void;
}

export function FontSelector({ onSelectFont }: FontSelectorProps) {
  const { font, setFont, theme } = useStyleSettings();

  const handleSelect = (nextFont: FontOption) => {
    setFont(nextFont);
    onSelectFont?.(nextFont);
  };

  return (
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
            onClick={() => handleSelect(item)}
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
  );
}
