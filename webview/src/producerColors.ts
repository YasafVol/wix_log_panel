const SATURATION = 74;
const LIGHTNESS_DARK = 68;
const LIGHTNESS_LIGHT = 50;
const LIGHTNESS_HIGH_CONTRAST = 62;

export type ThemeMode = "light" | "dark" | "highContrast";

export function getProducerColor(
  producer: string,
  themeMode: ThemeMode = "dark"
): string {
  const normalized = producer.trim().toLowerCase();
  if (!normalized) {
    return "var(--vscode-descriptionForeground)";
  }

  // Deterministic hue so each producer gets a stable color.
  const hue = Math.abs(hashString(normalized)) % 360;
  const lightness =
    themeMode === "light"
      ? LIGHTNESS_LIGHT
      : themeMode === "highContrast"
        ? LIGHTNESS_HIGH_CONTRAST
        : LIGHTNESS_DARK;
  return `hsl(${hue} ${SATURATION}% ${lightness}%)`;
}

export function detectThemeMode(classNamesInput?: Iterable<string>): ThemeMode {
  const classNames = new Set(
    classNamesInput ??
      (typeof document !== "undefined" ? Array.from(document.body.classList) : [])
  );
  if (
    classNames.has("vscode-high-contrast") ||
    classNames.has("vscode-high-contrast-light")
  ) {
    return "highContrast";
  }
  if (classNames.has("vscode-light")) {
    return "light";
  }
  return "dark";
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}
