import type { ThemeTokens } from "./tokens";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());

/** 令牌 → 根元素的 CSS 自定义属性。骨架组件只读 var(--sp-*) */
export function tokensToCssVars(t: ThemeTokens): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t.color)) out[`--sp-${kebab(k)}`] = v;
  for (const [k, v] of Object.entries(t.density)) out[`--sp-${kebab(k)}`] = `${v}px`;
  out["--sp-font-ui"] = t.typography.uiFont;
  out["--sp-font-size-ui"] = `${t.typography.uiFontSize}px`;
  out["--sp-font-size-status"] = `${t.typography.statusFontSize}px`;
  out["--sp-font-mono"] = t.typography.monoFont;
  out["--sp-font-size-editor"] = `${t.typography.editorFontSize}px`;
  out["--sp-line-height-editor"] = String(t.typography.editorLineHeight);
  out["--sp-tab-size"] = String(t.typography.tabSize);
  return out;
}

/**
 * 令牌 → Naive UI themeOverrides。
 * 必须覆盖 fontFamily / fontSize / height* 系列——Naive UI 的默认值
 * （fontSize 14px、heightSmall 28px）比本项目的紧凑密度宽松得多，
 * 不覆盖会出现「骨架紧凑、对话框臃肿」的割裂。
 * 注意：不覆盖 lineHeight —— 那是它组件自身的行高，与编辑器行高无关。
 */
export function tokensToNaiveOverrides(
  t: ThemeTokens,
): Record<string, Record<string, string | number>> {
  return {
    common: {
      fontFamily: t.typography.uiFont,
      fontFamilyMono: t.typography.monoFont,
      fontSize: `${t.typography.uiFontSize}px`,
      fontSizeMini: `${t.typography.statusFontSize}px`,
      fontSizeTiny: `${t.typography.statusFontSize}px`,
      fontSizeSmall: `${t.typography.uiFontSize}px`,
      fontSizeMedium: `${t.typography.uiFontSize}px`,
      heightMini: `${t.density.controlH}px`,
      heightTiny: `${t.density.controlH}px`,
      heightSmall: `${t.density.controlH}px`,
      heightMedium: `${t.density.controlH}px`,
      borderRadius: `${t.density.radius}px`,
      borderRadiusSmall: `${Math.max(t.density.radius - 1, 0)}px`,
      bodyColor: t.color.bgSurface,
      cardColor: t.color.bgChrome,
      borderColor: t.color.border,
      textColorBase: t.color.text,
      textColor1: t.color.text,
      textColor2: t.color.text,
      textColor3: t.color.textDim,
      primaryColor: t.color.accent,
      primaryColorHover: t.color.accent,
    },
  };
}

/** 令牌 → CodeMirror EditorView.theme 的样式对象 */
export function tokensToEditorTheme(t: ThemeTokens): Record<string, Record<string, string>> {
  // §4.2：选中文本底色 = accent 22%（浅）/ 28%（深），叠加在编辑区上。
  // 规范给的是配方不是常量，所以就地派生；ThemeTokens 的颜色键必须都是不透明 #rrggbb
  const selectionPct = t.name === "dark" ? 28 : 22;
  const selectionBg = `color-mix(in srgb, ${t.color.accent} ${selectionPct}%, transparent)`;
  return {
    "&": {
      color: t.color.editorText,
      backgroundColor: t.color.bgSurface,
      fontSize: `${t.typography.editorFontSize}px`,
      fontFamily: t.typography.monoFont,
    },
    ".cm-scroller": {
      // 基座主题在 .cm-scroller 上直接给了 line-height: 1.4，
      // 写在 "&" 上只会被后代规则盖过，必须落在同一元素上
      lineHeight: String(t.typography.editorLineHeight),
    },
    ".cm-content": { caretColor: t.color.editorCaret },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: t.color.editorCaret },
    ".cm-gutters": {
      color: t.color.editorGutter,
      backgroundColor: t.color.bgSurface,
      borderRight: `1px solid ${t.color.border}`,
    },
    // 多光标/矩形选区下 CodeMirror 会给每一条含光标的行都加这个类（highlightActiveLine 的既定语义：
    // 「凡有光标的行」），所以列编辑时整片偏蓝是预期的；精确选区由 drawSelection 画在它之上。
    // 选区绘制层在内容之下（CodeMirror 的图层 z-index 为 -1），当前行底色必须带 alpha，
    // 否则会把本行的选区矩形整片盖住；CodeMirror 自身默认值同样是半透明（#cceeff44）。
    // 45% 是实测折中：既有可见的「当前行」提示，又不吃掉 22% accent 的选区矩形。
    ".cm-activeLine": {
      backgroundColor: `color-mix(in srgb, ${t.color.accentSoft} 45%, transparent)`,
    },
    // 覆盖基座给的灰色 #d9d9d9；聚焦时基座那条特异性更高（#d7d4f0），必须用同样的选择器形状压过
    ".cm-selectionBackground": { backgroundColor: selectionBg },
    "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground": {
      backgroundColor: selectionBg,
    },
  };
}
