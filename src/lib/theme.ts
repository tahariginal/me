/**
 * Cached palette for canvas and WebGL. CSS remains the source of truth;
 * read it only when the theme changes, never during animation frames.
 */
export const palette = {
  bg: "#0c0c0b",
  fg: "#ece7df",
  accent: "#3b82f6",
  accentDeep: "#2563eb",
  accentLight: "#60a5fa",
};

export function observePalette(update: () => void) {
  const root = document.documentElement;
  const sync = () => {
    const css = getComputedStyle(root);
    for (const key of Object.keys(palette) as (keyof typeof palette)[]) {
      const token = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      palette[key] = css.getPropertyValue(`--color-${token}`).trim();
    }
    update();
  };
  sync();
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** `#rrggbb` → `rgba(r,g,b,a)` for Canvas 2D styles. */
export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
};
