// Centralized theme for LEO AI. Earthy, light, calm.
export const colors = {
  bg: "#FDFBF7",
  surface: "#F4F1EA",
  surfaceElevated: "#EBE7DD",
  primary: "#C86A51",
  primaryFg: "#FFFFFF",
  secondary: "#7E947A",
  secondaryFg: "#FFFFFF",
  textPrimary: "#2D332C",
  textSecondary: "#5C665A",
  textMuted: "#8A9488",
  border: "#E2DDD0",
  borderFocus: "#C86A51",
  danger: "#B0463A",
};

export const fonts = {
  // System serif looks elegant on both iOS (New York) and Android (serif)
  serif: "serif",
  sans: undefined as string | undefined, // system default
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = (n: number) => n * 8;
