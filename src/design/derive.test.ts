import { describe, expect, it } from "vite-plus/test";
import { contrastRatio } from "./contrast";
import { tokensToCssVars, tokensToEditorTheme, tokensToNaiveOverrides } from "./derive";
import { DARK_TOKENS, LIGHT_TOKENS, type ThemeTokens } from "./tokens";

describe("tokensToCssVars", () => {
  it("产出 --sp- 前缀的变量，颜色为纯值、尺寸带 px", () => {
    const vars = tokensToCssVars(LIGHT_TOKENS);
    expect(vars["--sp-text"]).toBe("#1f1f1f");
    expect(vars["--sp-menu-h"]).toBe("24px");
    expect(vars["--sp-icon"]).toBe("15px");
    expect(vars["--sp-radius"]).toBe("3px");
    expect(vars["--sp-font-size-editor"]).toBe("13px");
    expect(vars["--sp-line-height-editor"]).toBe("1.45");
  });

  it("每个颜色令牌都有对应的 CSS 变量", () => {
    const vars = tokensToCssVars(LIGHT_TOKENS);
    for (const key of Object.keys(LIGHT_TOKENS.color)) {
      const varName = "--sp-" + key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
      expect(vars[varName], `缺少 ${varName}`).toBeTruthy();
    }
  });
});

describe("tokensToNaiveOverrides", () => {
  it("覆盖 Naive UI 偏宽松的默认尺寸", () => {
    const o = tokensToNaiveOverrides(LIGHT_TOKENS);
    expect(o.common.fontSize).toBe("12px");
    expect(o.common.fontFamily).toBe(LIGHT_TOKENS.typography.uiFont);
    expect(o.common.fontFamilyMono).toBe(LIGHT_TOKENS.typography.monoFont);
    expect(o.common.borderRadius).toBe("3px");
    expect(o.common.primaryColor).toBe(LIGHT_TOKENS.color.accent);
  });

  it("不覆盖 lineHeight——那是组件自身行高，与编辑器行高是两回事", () => {
    expect(tokensToNaiveOverrides(LIGHT_TOKENS).common.lineHeight).toBeUndefined();
  });
});

describe("tokensToEditorTheme", () => {
  it("使用编辑器专属令牌", () => {
    const theme = tokensToEditorTheme(DARK_TOKENS);
    expect(theme["&"].color).toBe(DARK_TOKENS.color.editorText);
    expect(theme["&"].backgroundColor).toBe(DARK_TOKENS.color.bgSurface);
    expect(theme[".cm-gutters"].color).toBe(DARK_TOKENS.color.editorGutter);
  });
});

describe("对比度（WCAG 2.1）", () => {
  const cases: [string, keyof ThemeTokens["color"], keyof ThemeTokens["color"], number][] = [
    ["编辑器正文/编辑区", "editorText", "bgSurface", 4.5],
    ["界面正文/菜单栏", "text", "bgChrome", 4.5],
    ["次要文字/状态栏", "textDim", "bgStatus", 4.5],
    ["次要文字/标签栏", "textDim", "bgTabStrip", 4.5],
    ["强调色/菜单栏", "accent", "bgChrome", 3],
    ["强调色底/on-accent", "onAccent", "accent", 4.5],
  ];

  for (const [name, light] of [
    ["浅色", LIGHT_TOKENS],
    ["深色", DARK_TOKENS],
  ] as const) {
    it.each(cases)("%s主题 · %s ≥ %s:1", (_label, fg, bg, min) => {
      const ratio = contrastRatio(light.color[fg], light.color[bg]);
      expect(ratio, `${name} ${_label} 实得 ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
    });
  }
});
