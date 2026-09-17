import { THEMES, type ColorTheme } from "./constants";
import { useStyleSettings } from "./useStyleSettings";

interface ThemeSelectorProps {
  onSelectTheme?: (theme: ColorTheme) => void;
}

export function ThemeSelector({ onSelectTheme }: ThemeSelectorProps) {
  const { theme, setTheme } = useStyleSettings();

  const handleSelect = (nextTheme: ColorTheme) => {
    setTheme(nextTheme);
    onSelectTheme?.(nextTheme);
  };

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
        const isSelected = t.id === theme.id;
        return (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
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
  );
}
