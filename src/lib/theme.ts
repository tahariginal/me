/**
 * Palette for canvas and WebGL code, which cannot read CSS tokens cheaply.
 * Keep in sync with the @theme block in src/app/globals.css.
 */
export const palette = {
  bg: "#0c0c0b",
  fg: "#ece7df",
  accent: "#3b82f6",
  accentDeep: "#2563eb",
  accentLight: "#60a5fa",
} as const;

/** `#rrggbb` → `rgba(r,g,b,a)` for Canvas 2D styles. */
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
};
