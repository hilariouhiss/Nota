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

  /**
   * 变量名逐字抄自规范 §4.2/§4.3/§4.4，刻意不从令牌键推导——用实现同一套规则
   * 推导出的期望值只能与实现一致，永远不可能失败（派生出 `--sp-bg-tab-strip`、
   * 而计划 CSS 四处读的 `--sp-bg-tabstrip` 拿不到值，就是这么溜过去的）。
   */
  const DOCUMENTED_VARS = [
    // §4.2 颜色
    "--sp-bg-chrome",
    "--sp-bg-tabstrip",
    "--sp-bg-surface",
    "--sp-bg-status",
    "--sp-bg-hover",
    "--sp-text",
    "--sp-text-dim",
    "--sp-text-disabled",
    "--sp-border",
    "--sp-accent",
    "--sp-accent-soft",
    "--sp-on-accent",
    "--sp-focus-ring",
    "--sp-editor-text",
    "--sp-editor-gutter",
    "--sp-editor-caret",
    // §4.3 密度
    "--sp-menu-h",
    "--sp-toolbar-h",
    "--sp-tab-h",
    "--sp-status-h",
    "--sp-dock-h",
    "--sp-control-h",
    "--sp-radius",
    "--sp-pad",
    "--sp-icon",
    // §4.4 字体
    "--sp-font-ui",
    "--sp-font-size-ui",
    "--sp-font-size-status",
    "--sp-font-mono",
    "--sp-font-size-editor",
    "--sp-line-height-editor",
    "--sp-tab-size",
  ];

  it("规范文档化的每个变量名都由令牌产出且非空", () => {
    const vars = tokensToCssVars(LIGHT_TOKENS);
    for (const name of DOCUMENTED_VARS) {
      expect(vars[name], `缺少 ${name}`).toBeTruthy();
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
    // 令牌是样式唯一源：编辑器行高也必须由令牌驱动，而不是 CodeMirror 基座的 1.4。
    // 必须落在 .cm-scroller（承载行高的元素）上，写在 "&" 上会被基座的后代规则盖过
    expect(theme[".cm-scroller"].lineHeight).toBe("1.45");
  });

  /**
   * §4.2 的 `--sp-editor-selection` 是「accent 22%（浅）/ 28%（深）叠加在编辑区上」这条**配方**，
   * 不是十六进制常量，所以就地派生、不进 ThemeTokens（T1 要求颜色键都是不透明 #rrggbb）。
   * 两条规则都要覆盖：基座在 `.cm-selectionBackground` 上给灰色 #d9d9d9，
   * 聚焦时那条 `&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground`
   * 特异性更高（#d7d4f0），只覆盖前者在真实浏览器里依然是基座的灰紫色。
   */
  it.each([
    ["浅色", LIGHT_TOKENS, "#2f6fd0", "22%"],
    ["深色", DARK_TOKENS, "#6ea8fe", "28%"],
  ] as const)("%s主题：选中底色由 accent 按规范百分比派生", (_name, tokens, accent, pct) => {
    const theme = tokensToEditorTheme(tokens);
    const expected = `color-mix(in srgb, ${accent} ${pct}, transparent)`;
    expect(theme[".cm-selectionBackground"].backgroundColor).toBe(expected);
    expect(
      theme["&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground"]
        .backgroundColor,
    ).toBe(expected);
  });

  /**
   * 当前行底色必须带 alpha，正文与行号槽都一样。CodeMirror 把选区绘制层排在内容之下
   * （图层 z-index: -1），不透明的当前行底色会把本行的选区矩形整片盖掉——最后一条断言
   * 就是这条性质的守卫：任何人把实现改回 `t.color.accentSoft`（不透明令牌）都必须让这里失败。
   * 行号槽（基座不透明蓝 #e2f2ff／#222227）是同一个坑，且那一格还得由令牌派生。
   */
  it.each([
    ["浅色", LIGHT_TOKENS, "#e7effb"],
    ["深色", DARK_TOKENS, "#25344a"],
  ] as const)(
    "%s主题：当前行底色（正文与行号槽）半透明，不盖住下方的选区绘制层",
    (_name, tokens, soft) => {
      const { backgroundColor } = tokensToEditorTheme(tokens)[".cm-activeLine"];
      expect(backgroundColor).toBe(`color-mix(in srgb, ${soft} 45%, transparent)`);
      expect(backgroundColor).toContain(`color-mix`);
      expect(backgroundColor).toContain(soft);
      expect(backgroundColor).toContain(`45%`);
      expect(backgroundColor).not.toBe(tokens.color.accentSoft);

      const gutter = tokensToEditorTheme(tokens)[".cm-activeLineGutter"].backgroundColor;
      expect(gutter).toBe(`color-mix(in srgb, ${soft} 45%, transparent)`);
      expect(gutter).toContain(soft);
      expect(gutter).toContain(`45%`);
      expect(gutter).not.toBe(tokens.color.accentSoft);
    },
  );
});

describe("对比度（WCAG 2.1）", () => {
  const cases: [string, keyof ThemeTokens["color"], keyof ThemeTokens["color"], number][] = [
    ["编辑器正文/编辑区", "editorText", "bgSurface", 4.5],
    ["界面正文/菜单栏", "text", "bgChrome", 4.5],
    ["次要文字/状态栏", "textDim", "bgStatus", 4.5],
    ["次要文字/标签栏", "textDim", "bgTabstrip", 4.5],
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
