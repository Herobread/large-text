export interface FontOption {
  id: string;
  name: string;
  family: string;
  weight: string;
  lineHeight: number;
  googleParam: string;
}

export interface ColorTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  dot: string;
}

export const STORAGE_KEYS = {
  TEXT: "app_text",
  FONT_ID: "app_font_id",
  THEME_ID: "app_theme_id",
} as const;

export const MAX_FONT_SIZE = 64;

export const snapToScale = (rawSize: number): number => {
  let step = 4;
  if (rawSize > 48) step = 8;
  else if (rawSize > 32) step = 6;
  return Math.floor(rawSize / step) * step;
};

export const FONTS: FontOption[] = [
  {
    id: "inter",
    name: "Inter",
    family: '"Inter", sans-serif',
    weight: "700",
    lineHeight: 1.1,
    googleParam: "family=Inter:wght@700",
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
    id: "caveat",
    name: "Caveat",
    family: '"Caveat", cursive',
    weight: "700",
    lineHeight: 1.15,
    googleParam: "family=Caveat:wght@700",
  },
  {
    id: "vt323",
    name: "VT323",
    family: '"VT323", monospace',
    weight: "400",
    lineHeight: 1.0,
    googleParam: "family=VT323",
  },
  {
    id: "fontdiner-swanky",
    name: "Fontdiner Swanky",
    family: '"Fontdiner Swanky", cursive',
    weight: "400",
    lineHeight: 1.15,
    googleParam: "family=Fontdiner+Swanky",
  },
  {
    id: "rubik-80s-fade",
    name: "Rubik 80s Fade",
    family: '"Rubik 80s Fade", cursive',
    weight: "400",
    lineHeight: 1.1,
    googleParam: "family=Rubik+80s+Fade",
  },
  {
    id: "rye",
    name: "Rye",
    family: '"Rye", serif',
    weight: "400",
    lineHeight: 1.15,
    googleParam: "family=Rye",
  },
  {
    id: "fuzzy-bubbles",
    name: "Fuzzy Bubbles",
    family: '"Fuzzy Bubbles", cursive',
    weight: "700",
    lineHeight: 1.2,
    googleParam: "family=Fuzzy+Bubbles:wght@700",
  },
];

export const THEMES: ColorTheme[] = [
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
    bg: "#fcf8cf",
    text: "#21201d",
    dot: "#cbc6bc",
  },
];
