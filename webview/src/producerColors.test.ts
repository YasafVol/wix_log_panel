import { describe, expect, it } from "vitest";
import { detectThemeMode, getProducerColor } from "./producerColors";

describe("getProducerColor", () => {
  it("returns deterministic color for same producer", () => {
    const a = getProducerColor("dev-server");
    const b = getProducerColor("dev-server");
    expect(a).toBe(b);
  });

  it("returns generated hsl color for non-empty producer", () => {
    const color = getProducerColor("cli");
    expect(color.startsWith("hsl(")).toBe(true);
  });

  it("uses different lightness for light and dark themes", () => {
    const darkColor = getProducerColor("cli", "dark");
    const lightColor = getProducerColor("cli", "light");
    expect(darkColor).not.toBe(lightColor);
  });

  it("returns neutral fallback for empty producer", () => {
    expect(getProducerColor("  ")).toBe("var(--vscode-descriptionForeground)");
  });
});

describe("detectThemeMode", () => {
  it("detects light theme class", () => {
    expect(detectThemeMode(["vscode-light"])).toBe("light");
  });

  it("detects high contrast class", () => {
    expect(detectThemeMode(["vscode-high-contrast"])).toBe("highContrast");
  });

  it("defaults to dark when no classes are present", () => {
    expect(detectThemeMode([])).toBe("dark");
  });
});
