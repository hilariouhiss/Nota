import { describe, expect, it } from "vite-plus/test";
import { DARK_TOKENS, LIGHT_TOKENS, type ThemeTokens } from "./tokens";

const HEX = /^#[0-9a-f]{6}$/;

/** 这些键在两套主题里都必须存在——漏一个就会渲染出 undefined */
const REQUIRED_COLOR_KEYS: (keyof ThemeTokens["color"])[] = [
  "bgChrome",
  "bgTabStrip",
  "bgSurface",
  "bgStatus",
  "bgHover",
  "text",
  "textDim",
  "textDisabled",
  "border",
  "accent",
  "accentSoft",
  "onAccent",
  "focusRing",
  "editorText",
  "editorGutter",
  "editorCaret",
];

describe("设计令牌", () => {
  it.each([
    ["浅色", LIGHT_TOKENS],
    ["深色", DARK_TOKENS],
  ])("%s主题包含全部必需的颜色键", (_name, tokens) => {
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(tokens.color[key], `缺少 color.${key}`).toBeTruthy();
    }
  });

  it.each([
    ["浅色", LIGHT_TOKENS],
    ["深色", DARK_TOKENS],
  ])("%s主题的实色均为不透明十六进制", (_name, tokens) => {
    // onAccent 在深色主题下必须是深色文字而非白色（WCAG 实测：白字在
    // #6ea8fe 上仅 2.42:1），因此这里强制格式而不强制取值
    for (const key of REQUIRED_COLOR_KEYS) {
      expect(tokens.color[key], `color.${key} 不是 #rrggbb`).toMatch(HEX);
    }
  });

  it("密度取值与设计规范一致", () => {
    expect(LIGHT_TOKENS.density).toEqual({
      menuH: 24,
      toolbarH: 28,
      tabH: 26,
      statusH: 22,
      dockH: 80,
      controlH: 18,
      radius: 3,
      pad: 8,
      icon: 15,
    });
  });

  it("字体取值与设计规范一致", () => {
    expect(LIGHT_TOKENS.typography.uiFontSize).toBe(12);
    expect(LIGHT_TOKENS.typography.statusFontSize).toBe(11);
    expect(LIGHT_TOKENS.typography.editorFontSize).toBe(13);
    expect(LIGHT_TOKENS.typography.editorLineHeight).toBe(1.45);
    expect(LIGHT_TOKENS.typography.tabSize).toBe(4);
  });

  it("两套主题共用同一组令牌名，不因主题不同而缺键", () => {
    expect(Object.keys(LIGHT_TOKENS.color).sort()).toEqual(Object.keys(DARK_TOKENS.color).sort());
  });
});
