import { FONTS, THEMES, type ColorTheme, type FontOption } from "./constants";

export function ThemeSelector({
  currentTheme,
  onSelect,
}: {
  currentTheme: ColorTheme;
  onSelect: (t: ColorTheme) => void;
}) {
  return (
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
        const isSelected = t.id === currentTheme.id;
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t)}
            title={t.name}
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: t.dot,
              border: isSelected
                ? `2px solid ${currentTheme.text}`
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
  );
}

export function FontSelector({
  currentFont,
  textColor,
  onSelect,
}: {
  currentFont: FontOption;
  textColor: string;
  onSelect: (f: FontOption) => void;
}) {
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
        const isSelected = item.id === currentFont.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            title={item.name}
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              border: isSelected
                ? `2px solid ${textColor}`
                : `1px solid ${textColor}26`,
              backgroundColor: isSelected ? `${textColor}18` : "transparent",
              color: textColor,
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
