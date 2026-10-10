/**
 * 样式的唯一源。浅色与深色两套取值，语义命名（不是外观命名）——
 * 同一个令牌名在浅色下是深灰、深色下是浅灰，因此两套主题共用同一组键。
 *
 * 颜色取值经 WCAG 2.1 对比度实测（见 derive.test.ts），
 * 改动任何颜色都必须重跑对比度测试。
 */
export interface ThemeTokens {
  name: "light" | "dark";
  color: {
    bgChrome: string;
    bgTabStrip: string;
    bgSurface: string;
    bgStatus: string;
    bgHover: string;
    text: string;
    textDim: string;
    textDisabled: string;
    border: string;
    accent: string;
    accentSoft: string;
    /** 强调色底上的文字。必须是每主题各自的令牌，不能全局用白色 */
    onAccent: string;
    focusRing: string;
    editorText: string;
    editorGutter: string;
    editorCaret: string;
  };
  density: {
    menuH: number;
    toolbarH: number;
    tabH: number;
    statusH: number;
    dockH: number;
    controlH: number;
    radius: number;
    pad: number;
    icon: number;
  };
  typography: {
    uiFont: string;
    uiFontSize: number;
    statusFontSize: number;
    monoFont: string;
    editorFontSize: number;
    editorLineHeight: number;
    tabSize: number;
  };
}

const DENSITY = {
  menuH: 24,
  toolbarH: 28,
  tabH: 26,
  statusH: 22,
  dockH: 80,
  controlH: 18,
  radius: 3,
  pad: 8,
  icon: 15,
} as const;

const UI_FONT = '"Segoe UI", "Microsoft YaHei", system-ui, sans-serif';
// TODO(Task 3): 中日韩回退字体的字宽待实测确认。Task 3 会移除本行标记并写下结论
const MONO_FONT = 'Consolas, "Cascadia Mono", "Microsoft YaHei", monospace';

export const LIGHT_TOKENS: ThemeTokens = {
  name: "light",
  color: {
    bgChrome: "#f3f3f3",
    bgTabStrip: "#e9e9e9",
    bgSurface: "#ffffff",
    bgStatus: "#eeeeee",
    bgHover: "#e0e0e0",
    text: "#1f1f1f",
    textDim: "#666666",
    textDisabled: "#a0a0a0",
    border: "#d2d2d2",
    accent: "#2f6fd0",
    accentSoft: "#e7effb",
    onAccent: "#ffffff",
    focusRing: "#2f6fd0",
    editorText: "#1f1f1f",
    editorGutter: "#a8a8a8",
    editorCaret: "#1f1f1f",
  },
  density: { ...DENSITY },
  typography: {
    uiFont: UI_FONT,
    uiFontSize: 12,
    statusFontSize: 11,
    monoFont: MONO_FONT,
    editorFontSize: 13,
    editorLineHeight: 1.45,
    tabSize: 4,
  },
};

export const DARK_TOKENS: ThemeTokens = {
  name: "dark",
  color: {
    bgChrome: "#2c2c2c",
    bgTabStrip: "#242424",
    bgSurface: "#1c1c1c",
    bgStatus: "#2c2c2c",
    bgHover: "#3b3b3b",
    text: "#e6e6e6",
    textDim: "#9a9a9a",
    textDisabled: "#6a6a6a",
    border: "#3e3e3e",
    accent: "#6ea8fe",
    accentSoft: "#25344a",
    // 深色主题下白字在 #6ea8fe 上仅 2.42:1；改深字后 6.54:1
    onAccent: "#10233d",
    focusRing: "#6ea8fe",
    editorText: "#e6e6e6",
    editorGutter: "#5f5f5f",
    editorCaret: "#e6e6e6",
  },
  density: { ...DENSITY },
  typography: {
    uiFont: UI_FONT,
    uiFontSize: 12,
    statusFontSize: 11,
    monoFont: MONO_FONT,
    editorFontSize: 13,
    editorLineHeight: 1.45,
    tabSize: 4,
  },
};
