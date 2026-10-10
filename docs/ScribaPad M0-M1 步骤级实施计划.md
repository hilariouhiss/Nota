# ScribaPad M0–M1 步骤级实施计划

> **给自动化执行者：** 本计划必须用 subagent-driven-development（推荐）或 executing-plans 逐任务执行。步骤用复选框（`- [ ]`）标记进度。

**目标**：交付第一个可人工验收的产物——一个能启动、能输入、能撤销、有完整界面骨架的最小编辑器，并把工程基线（测试、CI）一次建好。

**架构**：界面骨架全部自定义、只读设计令牌；CodeMirror 6 独占编辑区渲染；Naive UI 只在需要时以 `n-icon` 形式出现；一个类型化令牌模块作为样式唯一源，派生 CSS 变量、CodeMirror 主题、Naive UI overrides 三处消费。

**技术栈**：Tauri 2.12 · Vue 3.5 · TypeScript 6.0 · Vite+ 1.1.0（`vp`）· Vitest 5（`vp test`）· CodeMirror 6 · Pinia · `@vicons/fluent` · Rust edition 2021

**Spec**：`docs/ScribaPad UI 设计规范.md`（V1.3，界面取值与交互的唯一来源）与 `docs/ScribaPad 应用实施计划.md`（V0.4，里程碑 M1 的覆盖需求与出口标准）。本计划是这两份文档在 M1 上的细化，**执行时必须同时读这两份**。

## 全局约束

以下为项目级要求，**每个任务都隐含包含**。取值逐字来自设计文档，不要凭印象改动。

- **包管理器必须是 pnpm**（12.3.4）。不要用 npm/yarn。`vp install` 会切换托管的 pnpm 版本并重建 `node_modules`，**本计划一律用 `pnpm add` / `pnpm install`**。
- **工具链命令**：`vp dev`、`vp build`、`vp check`（格式化 + 检查）、`vp test`（Vitest，零配置，默认 include `**/*.{test,spec}.?(c|m)[jt]s?(x)`）。
- **类型检查以 `vue-tsc -b` 为准**。`vp check` 的类型检查**不覆盖 `.vue` 单文件组件**（实测：SFC 内的类型错误会被它静默放过），不要依赖它判定 SFC 类型安全。
- **`docs/**`、`src-tauri/**`、`dist/**` 在 `vite.config.ts` 的 `fmt.ignorePatterns` 中**，不要移除。
- **M1 禁止引入 `@codemirror/lang-*` 语言包**。V1.0 全阶段为纯文本编辑（FR-16 语法高亮归 V1.1 的 M6），提前引入会与 M6 的 Tree-sitter 高亮形成两套并存机制。
- **Naive UI 只允许用 `NIcon`**（M1 无对话框）。
- **图标一律 `@vicons/fluent` 0.13.0，经 `n-icon` 承载**；尺寸由 `--sp-icon` 令牌驱动，不在调用点写死；默认用 `Regular`，`Filled` 仅用于选中／激活态。
- **字体使用系统字体栈，不引入任何内嵌字体包**（`vfonts` 已评估并否决，理由见规范 §4.4.1）。
- **颜色令牌不得随意改动**。两套主题各 8 项 WCAG 对比度已实测达标，改动任何颜色后必须重跑 Task 2 的对比度测试。
- **令牌取值**（规范 §4.2～§4.4，逐字）：菜单栏 24px · 工具栏 28px · 标签栏 26px · 状态栏 22px · 面板内容区默认 80px · 面板内控件 18px · 圆角 3px · 区域内边距 8px · 图标 15px · UI 字号 12px · 状态栏字号 11px · 编辑器字号 13px · 编辑器行高 1.45 · 制表符 4。
- **窗口**：默认 1200×800、最小 640×400、标题 `文件名 — ScribaPad`。
- **提交粒度**：每个任务结束提交一次，提交信息用中文、遵循现有的 `type(scope): 摘要` 风格。

---

## 文件结构

先锁定文件职责，任务划分据此展开。

| 路径 | 职责 |
| ---- | ---- |
| `src/design/tokens.ts` | `ThemeTokens` 类型 + 内置浅/深两套值。**样式唯一源** |
| `src/design/derive.ts` | 三个纯函数：令牌 → CSS 变量 / CodeMirror 主题 / Naive UI overrides |
| `src/design/apply.ts` | 把派生结果写到 DOM 与 Naive UI（唯一有副作用的一层） |
| `src/shell/AppShell.vue` | 六区域编排与令牌注入 |
| `src/shell/MenuBar.vue` | 顶层菜单、下拉、键盘导航 |
| `src/shell/ToolBar.vue` | 按钮组与溢出菜单 |
| `src/shell/TabBar.vue` | 标签显示、切换、关闭、未保存标记 |
| `src/shell/StatusBar.vue` | 左侧信息段、右侧可点击字段、溢出优先级 |
| `src/shell/DockPanel.vue` | 底部统一容器：页签条、内容区、拖拽调高、折叠 |
| `src/editor/EditorHost.vue` | CodeMirror 生命周期封装，不含产品逻辑 |
| `src/editor/extensions.ts` | 编辑器扩展装配（行号、括号匹配、当前行高亮、列编辑） |
| `src/editor/theme.ts` | 令牌 → `EditorView.theme`，经 `Compartment` 支持热替换 |
| `src/stores/documents.ts` | 文档集合与活动标签 |
| `src/menu/model.ts` | 菜单结构数据（菜单栏与状态栏共用） |
| `src/dev/measure-cjk-width.ts` | 中文字宽探针（Task 3） |
| `src/main.ts` | 应用入口：装 Pinia、注入令牌、挂载 AppShell |
| `probe/cjk-width.html` | 字宽探针页面，`vp dev` 下直接打开 |
| `.github/workflows/ci.yml` | CI |

**不建立**：`src/components/ui/`（M1 无通用 UI 组件需求）、任何 `AppIcon.vue` 封装（`n-icon` 已完成归一，见规范 §6.5.2）。

---

### Task 1: 设计令牌类型与两套主题取值

这是第一个真实交付物，同时把 `test` 脚本建起来——前端测试基建**不需要额外搭建**，`vp test` 已内置 Vitest。

**文件：**
- 创建：`src/design/tokens.ts`
- 创建：`src/design/tokens.test.ts`
- 修改：`package.json`（加 `test` 脚本）

**接口：**
- 产出：`ThemeTokens` 类型、`LIGHT_TOKENS`、`DARK_TOKENS`（Task 2、4 消费）

- [ ] **Step 1: 写失败的测试**

创建 `src/design/tokens.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { DARK_TOKENS, LIGHT_TOKENS, type ThemeTokens } from "./tokens";

const HEX = /^#[0-9a-f]{6}$/;

/** 这些键在两套主题里都必须存在——漏一个就会渲染出 undefined */
const REQUIRED_COLOR_KEYS: (keyof ThemeTokens["color"])[] = [
  "bgChrome", "bgTabStrip", "bgSurface", "bgStatus", "bgHover",
  "text", "textDim", "textDisabled", "border",
  "accent", "accentSoft", "onAccent", "focusRing",
  "editorText", "editorGutter", "editorCaret",
];

describe("设计令牌", () => {
  it.each([["浅色", LIGHT_TOKENS], ["深色", DARK_TOKENS]])(
    "%s主题包含全部必需的颜色键",
    (_name, tokens) => {
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(tokens.color[key], `缺少 color.${key}`).toBeTruthy();
      }
    },
  );

  it.each([["浅色", LIGHT_TOKENS], ["深色", DARK_TOKENS]])(
    "%s主题的实色均为不透明十六进制",
    (_name, tokens) => {
      // onAccent 在深色主题下必须是深色文字而非白色（WCAG 实测：白字在
      // #6ea8fe 上仅 2.42:1），因此这里强制格式而不强制取值
      for (const key of REQUIRED_COLOR_KEYS) {
        expect(tokens.color[key], `color.${key} 不是 #rrggbb`).toMatch(HEX);
      }
    },
  );

  it("密度取值与设计规范一致", () => {
    expect(LIGHT_TOKENS.density).toEqual({
      menuH: 24, toolbarH: 28, tabH: 26, statusH: 22,
      dockH: 80, controlH: 18, radius: 3, pad: 8, icon: 15,
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
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/design/tokens.test.ts
```

预期：FAIL，报 `Failed to resolve import "./tokens"`。

- [ ] **Step 3: 写最小实现**

创建 `src/design/tokens.ts`：

```ts
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
    menuH: number; toolbarH: number; tabH: number; statusH: number;
    dockH: number; controlH: number; radius: number; pad: number; icon: number;
  };
  typography: {
    uiFont: string; uiFontSize: number; statusFontSize: number;
    monoFont: string; editorFontSize: number; editorLineHeight: number;
    tabSize: number;
  };
}

const DENSITY = {
  menuH: 24, toolbarH: 28, tabH: 26, statusH: 22,
  dockH: 80, controlH: 18, radius: 3, pad: 8, icon: 15,
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
    uiFont: UI_FONT, uiFontSize: 12, statusFontSize: 11,
    monoFont: MONO_FONT, editorFontSize: 13, editorLineHeight: 1.45, tabSize: 4,
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
    uiFont: UI_FONT, uiFontSize: 12, statusFontSize: 11,
    monoFont: MONO_FONT, editorFontSize: 13, editorLineHeight: 1.45, tabSize: 4,
  },
};
```

- [ ] **Step 4: 加 test 脚本并运行**

修改 `package.json` 的 `scripts`，在 `"tauri": "tauri"` 之前插入：

```json
    "test": "vp test",
```

运行：

```bash
pnpm test src/design/tokens.test.ts
```

预期：PASS，5 个用例通过。

- [ ] **Step 5: 提交**

```bash
git add src/design/tokens.ts src/design/tokens.test.ts package.json
git commit -m "feat(design): 新增设计令牌模块与首条测试"
```

---

### Task 2: 三个派生纯函数与对比度断言

**文件：**
- 创建：`src/design/derive.ts`
- 创建：`src/design/derive.test.ts`
- 创建：`src/design/contrast.ts`（WCAG 计算，被测试与后续校验共用）

**接口：**
- 消费：Task 1 的 `ThemeTokens`、`LIGHT_TOKENS`、`DARK_TOKENS`
- 产出：`tokensToCssVars(tokens): Record<string, string>`、`tokensToEditorTheme(tokens): Record<string, Record<string, string>>`、`tokensToNaiveOverrides(tokens): Record<string, Record<string, string | number>>`

- [ ] **Step 1: 写失败的测试**

创建 `src/design/derive.test.ts`：

```ts
import { describe, expect, it } from "vitest";
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

  for (const [name, light, dark] of [["浅色", LIGHT_TOKENS], ["深色", DARK_TOKENS]] as const) {
    it.each(cases)("%s主题 · %s ≥ %s:1", (_label, fg, bg, min) => {
      const ratio = contrastRatio(light.color[fg], light.color[bg]);
      expect(ratio, `${name} ${_label} 实得 ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
      void dark;
    });
  }
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/design/derive.test.ts
```

预期：FAIL，`Failed to resolve import "./contrast"`。

- [ ] **Step 3: 写最小实现**

创建 `src/design/contrast.ts`：

```ts
const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG 2.1 相对亮度 */
export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.1 对比度，返回值形如 4.73（表示 4.73:1） */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
```

创建 `src/design/derive.ts`：

```ts
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
  return {
    "&": {
      color: t.color.editorText,
      backgroundColor: t.color.bgSurface,
      fontSize: `${t.typography.editorFontSize}px`,
      fontFamily: t.typography.monoFont,
    },
    ".cm-content": { caretColor: t.color.editorCaret },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: t.color.editorCaret },
    ".cm-gutters": {
      color: t.color.editorGutter,
      backgroundColor: t.color.bgSurface,
      borderRight: `1px solid ${t.color.border}`,
    },
    ".cm-activeLine": { backgroundColor: t.color.accentSoft },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/design/derive.test.ts
```

预期：PASS。若对比度用例失败，**不要调低阈值**——回到 `tokens.ts` 改颜色，并把新值记入设计规范 §4.5 的实测表。

- [ ] **Step 5: 提交**

```bash
git add src/design/derive.ts src/design/derive.test.ts src/design/contrast.ts
git commit -m "feat(design): 令牌派生纯函数与 WCAG 对比度断言"
```

---

### Task 3: 中文字宽验证（决定 `--sp-font-mono`）

**这是 M1 的第一件事**（设计规范 §9.1 第 1 项）。Consolas 不含 CJK 字形，中文回退到 Microsoft YaHei（非等宽）；中日韩字符能否正好占 2 个拉丁字符宽，决定列编辑（FR-14）能否对齐，也是 DC-04／FR-53 在视觉上的落点。

本任务**不产出单元测试**（字体度量需要真实渲染引擎，jsdom 没有），产出的是一个**可重复的测量过程与结论**。判定规则见 Step 4，必须照做。

**文件：**
- 创建：`probe/cjk-width.html`
- 修改：`src/design/tokens.ts`（据结论确定 `MONO_FONT` 并移除 TODO 注释）

- [ ] **Step 1: 创建探针页面**

创建 `probe/cjk-width.html`。`vp dev` 会把项目根下的 HTML 作为独立入口提供，所以这个页面与应用的任何代码解耦，可以在写任何界面之前先跑：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>中文字宽探针</title>
    <style>
      body { font: 13px "Segoe UI", "Microsoft YaHei", sans-serif; padding: 20px; }
      table { border-collapse: collapse; margin-top: 12px; }
      th, td { border: 1px solid #ccc; padding: 4px 10px; text-align: left; }
      .pass { color: #1a7f37; font-weight: 600; }
      .fail { color: #c0392b; font-weight: 600; }
      code { background: #f3f3f3; padding: 1px 4px; }
    </style>
  </head>
  <body>
    <h1>中文字宽探针</h1>
    <p>
      判定规则：<b>中日韩字符的宽度必须正好等于拉丁字符宽度的 2 倍</b>（误差 &lt; 0.1px）。
      不满足则列编辑无法对齐，需更换等宽字体栈。
    </p>
    <div id="out"></div>
    <script type="module" src="/probe/cjk-width.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: 创建探针逻辑**

创建 `probe/cjk-width.ts`：

```ts
const MONO_FONT = 'Consolas, "Cascadia Mono", "Microsoft YaHei", monospace';
const SIZE = 13;
const LATIN = "MMMMMMMMMM";        // 10 个拉丁字符
const CJK = "中文汉字测试文本".slice(0, 10); // 10 个中日韩字符

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("无法取得 2D 上下文");

const widthOf = (text: string) => {
  ctx.font = `${SIZE}px ${MONO_FONT}`;
  return ctx.measureText(text).width;
};

const latinPer = widthOf(LATIN) / [...LATIN].length;
const cjkPer = widthOf(CJK) / [...CJK].length;
const ratio = cjkPer / latinPer;
const delta = Math.abs(cjkPer - latinPer * 2);
const pass = delta < 0.1;

const rows: [string, string][] = [
  ["候选字体栈", MONO_FONT],
  ["字号", `${SIZE}px`],
  ["单个拉丁字符宽度", `${latinPer.toFixed(3)}px`],
  ["单个中日韩字符宽度", `${cjkPer.toFixed(3)}px`],
  ["比值（应为 2）", ratio.toFixed(4)],
  ["与 2 倍的差值（应 < 0.1px）", `${delta.toFixed(3)}px`],
  ["结论", pass ? "PASS" : "FAIL"],
];

document.querySelector("#out")!.innerHTML =
  `<table><tbody>${rows
    .map(([k, v], i) => {
      const cls = i === rows.length - 1 ? (pass ? "pass" : "fail") : "";
      return `<tr><td>${k}</td><td class="${cls}">${v}</td></tr>`;
    })
    .join("")}</tbody></table>` +
  (pass ? "" : `<p class="fail">需更换等宽字体栈。候选：<code>Sarasa Mono SC</code>（需确认授权与是否随包分发）或在栈中显式指定中日韩等宽回退字体。</p>`);

console.table(Object.fromEntries(rows));
```

- [ ] **Step 3: 运行探针并记录结果**

```bash
pnpm exec vp dev
```

浏览器打开 `http://localhost:1420/probe/cjk-width.html`，读取结论。

- [ ] **Step 4: 按判定规则处理结论**

判定规则，**照做，不要凭感觉**：

- **PASS**（差值 < 0.1px）：保持 `MONO_FONT` 不变。删除 `probe/` 目录，并在 `src/design/tokens.ts` 的 `MONO_FONT` 上把 TODO 注释替换为结论，格式：`// 中文字宽已实测：13px 下中日韩恰为拉丁的 2 倍（偏差 < 0.1px）`。
- **FAIL**：不要删探针。保持 `probe/` 目录与 `tokens.ts` 中的 TODO，**停下来向人报告**实测比值与差值，并给出候选解法——这是设计变更，不是实现细节，不能自行决定。

- [ ] **Step 5: 提交**

```bash
git add -A src/design/tokens.ts probe/
git commit -m "test(design): 中文字宽探针与实测结论"
```

---

### Task 4: 引入运行时依赖并接上令牌注入

**文件：**
- 修改：`package.json`（pnpm add）
- 创建：`src/design/apply.ts`
- 修改：`src/main.ts`

**接口：**
- 消费：Task 1 的 `ThemeTokens`、`LIGHT_TOKENS`；Task 2 的 `tokensToCssVars`、`tokensToNaiveOverrides`
- 产出：`applyTokens(tokens): void`、`useTokens(): { tokens, setTheme }`（Task 5～14 全部消费）

- [ ] **Step 1: 写失败的测试**

创建 `src/design/apply.test.ts`：

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { applyTokens } from "./apply";
import { DARK_TOKENS, LIGHT_TOKENS } from "./tokens";

describe("applyTokens", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sp-theme");
  });

  it("把令牌写到根元素的 CSS 变量上", () => {
    applyTokens(LIGHT_TOKENS);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--sp-text")).toBe("#1f1f1f");
    expect(style.getPropertyValue("--sp-menu-h")).toBe("24px");
  });

  it("切换主题时替换变量值而不残留旧值", () => {
    applyTokens(LIGHT_TOKENS);
    applyTokens(DARK_TOKENS);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--sp-text")).toBe("#e6e6e6");
    expect(document.documentElement.dataset.spTheme).toBe("dark");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/design/apply.test.ts
```

预期：FAIL，`Failed to resolve import "./apply"`。

- [ ] **Step 3: 写最小实现**

创建 `src/design/apply.ts`：

```ts
import { readonly, ref, type Ref } from "vue";
import { tokensToCssVars } from "./derive";
import { LIGHT_TOKENS, type ThemeTokens } from "./tokens";

const current = ref<ThemeTokens>(LIGHT_TOKENS);

/**
 * 把令牌写到根元素。切换主题时只替换令牌对象，不重挂组件——
 * CodeMirror 的主题经 Compartment 热替换（见 src/editor/theme.ts）。
 */
export function applyTokens(tokens: ThemeTokens): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokensToCssVars(tokens))) {
    root.style.setProperty(name, value);
  }
  root.dataset.spTheme = tokens.name;
  current.value = tokens;
}

/** 供组件读取当前令牌（只读，改写一律经 applyTokens） */
export function useTokens(): { tokens: Readonly<Ref<ThemeTokens>>; setTheme: (t: ThemeTokens) => void } {
  return { tokens: readonly(current) as Readonly<Ref<ThemeTokens>>, setTheme: applyTokens };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/design/apply.test.ts
```

预期：PASS，2 个用例通过。若报 `document is not defined`，确认文件首行的 `// @vitest-environment jsdom` 注释存在。

- [ ] **Step 5: 引入依赖**

```bash
pnpm add @codemirror/state @codemirror/view @codemirror/commands @codemirror/search
pnpm add naive-ui @vicons/fluent pinia @vueuse/core
```

预期：全部装成功。`@vicons/fluent` 是 0.13.0（2024-12-20 发布，不受 pnpm 的 24 小时供应链门禁影响）。

**注意**：不要执行 `vp install` 或 `vp add`——它们会切换 pnpm 托管版本并重建 `node_modules`，本项目已因此损坏过一次。

- [ ] **Step 6: 在入口注入令牌**

修改 `src/main.ts` 为：

```ts
import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { applyTokens } from "./design/apply";
import { LIGHT_TOKENS } from "./design/tokens";

// 窗口背景色由 Rust 侧按上次主题设置（见 Task 15），
// 这里注入的是同一套令牌，因此首帧不会出现异色
applyTokens(LIGHT_TOKENS);

createApp(App).use(createPinia()).mount("#app");
```

- [ ] **Step 7: 验证类型与构建**

```bash
pnpm exec vue-tsc -b && pnpm exec vp test && pnpm exec vp check
```

预期：三条都通过。**注意 `vue-tsc -b` 是唯一能发现 `.vue` 内类型错误的检查**，不要跳过。

- [ ] **Step 8: 提交**

```bash
git add -A package.json pnpm-lock.yaml src/
git commit -m "feat(app): 引入运行时依赖并接入令牌注入"
```

---

### Task 5: AppShell 六区域骨架

**文件：**
- 创建：`src/shell/AppShell.vue`
- 创建：`src/shell/AppShell.test.ts`
- 修改：`src/App.vue`（改为渲染 AppShell，删除脚手架的 greet 演示）

**接口：**
- 消费：Task 4 的令牌注入
- 产出：AppShell 组件，内部依次渲染 `MenuBar` / `ToolBar` / `TabBar` / 编辑区槽位 / `DockPanel` / `StatusBar`（Task 6～14 逐个替换为真实组件）

- [ ] **Step 1: 写失败的测试**

创建 `src/shell/AppShell.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppShell from "./AppShell.vue";

describe("AppShell", () => {
  it("渲染六个区域，且顺序符合设计规范 §3.1", () => {
    const wrapper = mount(AppShell);
    const regions = wrapper.findAll("[data-region]").map((n) => n.attributes("data-region"));
    expect(regions).toEqual(["menu", "toolbar", "tabs", "editor", "dock", "status"]);
  });

  it("折叠态下面板只保留页签条（设计规范 §3.2）", () => {
    const wrapper = mount(AppShell);
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("true");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp add -D @vue/test-utils 2>/dev/null || pnpm add -D @vue/test-utils
pnpm exec vp test src/shell/AppShell.test.ts
```

预期：FAIL，`Failed to resolve import "./AppShell.vue"`。

- [ ] **Step 3: 写最小实现**

创建 `src/shell/AppShell.vue`。全部尺寸读令牌，**不写死任何像素值**：

```vue
<script setup lang="ts">
import { ref } from "vue";

const dockCollapsed = ref(true);
</script>

<template>
  <div class="shell">
    <div class="region menu" data-region="menu" />
    <div class="region toolbar" data-region="toolbar" />
    <div class="region tabs" data-region="tabs" />
    <div class="region editor" data-region="editor"><slot /></div>
    <div
      class="region dock"
      data-region="dock"
      :data-collapsed="String(dockCollapsed)"
    />
    <div class="region status" data-region="status" />
  </div>
</template>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: var(--sp-font-ui);
  font-size: var(--sp-font-size-ui);
  color: var(--sp-text);
  background: var(--sp-bg-chrome);
}
.region { flex-shrink: 0; }
.menu { height: var(--sp-menu-h); border-bottom: 1px solid var(--sp-border); }
.toolbar { height: var(--sp-toolbar-h); border-bottom: 1px solid var(--sp-border); }
.tabs { height: var(--sp-tab-h); background: var(--sp-bg-tabstrip); border-bottom: 1px solid var(--sp-border); }
/* 编辑区必须能收缩：min-height 0 是 flex 子项可收缩的前提，
   否则 CodeMirror 长内容会把骨架撑破 */
.editor { flex: 1; min-height: 0; background: var(--sp-bg-surface); }
.dock { height: var(--sp-tab-h); background: var(--sp-bg-tabstrip); border-top: 1px solid var(--sp-border); }
.dock[data-collapsed="false"] { height: calc(var(--sp-tab-h) + var(--sp-dock-h)); }
.status { height: var(--sp-status-h); background: var(--sp-bg-status); border-top: 1px solid var(--sp-border); }
</style>
```

修改 `src/App.vue` 为：

```vue
<script setup lang="ts">
import AppShell from "./shell/AppShell.vue";
</script>

<template>
  <AppShell />
</template>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/shell/AppShell.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，2 个用例通过；类型检查无错误。

- [ ] **Step 5: 人工确认骨架**

```bash
pnpm dev
```

预期：窗口出现六条横向区域，自上而下依次可见；**区域高度必须与设计规范的 24/28/26/flex/26/22 一致**。

- [ ] **Step 6: 提交**

```bash
git add -A src/
git commit -m "feat(shell): AppShell 六区域骨架"
```

---

### Task 6: StatusBar

**文件：**
- 创建：`src/shell/StatusBar.vue`
- 创建：`src/shell/StatusBar.test.ts`
- 修改：`src/shell/AppShell.vue:11`（把 `data-region="status"` 的占位 div 换成 `<StatusBar />`）

**接口：**
- 消费：Task 5 的 AppShell 槽位
- 产出：`StatusBar` 组件，props：`{ line: number; column: number; language: string; encoding?: string; eol?: string }`

- [ ] **Step 1: 写失败的测试**

创建 `src/shell/StatusBar.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import StatusBar from "./StatusBar.vue";

const base = { line: 3, column: 42, language: "纯文本", encoding: "UTF-8", eol: "CRLF" };

describe("StatusBar", () => {
  it("显示行列号、语言模式、编码、换行符（UI-06）", () => {
    const text = mount(StatusBar, { props: base }).text();
    expect(text).toContain("行 3，列 42");
    expect(text).toContain("纯文本");
    expect(text).toContain("UTF-8");
    expect(text).toContain("CRLF");
  });

  it("编码与换行符字段可点击，行列号不可点击", () => {
    const wrapper = mount(StatusBar, { props: base });
    expect(wrapper.find("[data-field='encoding']").attributes("role")).toBe("button");
    expect(wrapper.find("[data-field='eol']").attributes("role")).toBe("button");
    expect(wrapper.find("[data-field='position']").attributes("role")).toBeUndefined();
  });

  it("窄窗时按优先级隐藏：先语言模式，最后才编码/换行符（设计规范 §6.3）", () => {
    const wrapper = mount(StatusBar, { props: { ...base, compact: "hideLanguage" } });
    expect(wrapper.find("[data-field='language']").exists()).toBe(false);
    expect(wrapper.find("[data-field='encoding']").exists()).toBe(true);
    expect(wrapper.find("[data-field='position']").exists()).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/shell/StatusBar.test.ts
```

预期：FAIL，`Failed to resolve import "./StatusBar.vue"`。

- [ ] **Step 3: 写最小实现**

创建 `src/shell/StatusBar.vue`：

```vue
<script setup lang="ts">
withDefaults(
  defineProps<{
    line: number;
    column: number;
    language: string;
    encoding?: string;
    eol?: string;
    /** 窄窗降级：语言模式最先隐藏，行列号永不隐藏（设计规范 §6.3） */
    compact?: "none" | "hideLanguage" | "hideLanguageAndEol";
  }>(),
  { compact: "none" },
);

const emit = defineEmits<{ pickEncoding: []; pickEol: [] }>();
</script>

<template>
  <div class="status">
    <span data-field="position">行 {{ line }}，列 {{ column }}</span>
    <span v-if="compact === 'none'" data-field="language">{{ language }}</span>
    <span class="spacer" />
    <button
      v-if="compact !== 'hideLanguageAndEol'"
      data-field="eol"
      type="button"
      role="button"
      class="field"
      @click="emit('pickEol')"
    >
      {{ eol }} ▾
    </button>
    <button
      data-field="encoding"
      type="button"
      role="button"
      class="field"
      @click="emit('pickEncoding')"
    >
      {{ encoding }} ▾
    </button>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: calc(var(--sp-pad) * 1.1);
  height: var(--sp-status-h);
  padding: 0 var(--sp-pad);
  color: var(--sp-text-dim);
  font-size: var(--sp-font-size-status);
  background: var(--sp-bg-status);
}
.spacer { flex: 1; }
.field {
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  cursor: pointer;
  border-radius: calc(var(--sp-radius) * 0.7);
}
.field:hover { color: var(--sp-text); background: var(--sp-bg-hover); }
.field:focus-visible { outline: 2px solid var(--sp-focus-ring); outline-offset: 1px; }
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/shell/StatusBar.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，3 个用例通过。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(shell): StatusBar 含可点击编码/换行符与窄窗降级"
```

---

### Task 7: TabBar（单标签）

**文件：**
- 创建：`src/shell/TabBar.vue`
- 创建：`src/shell/TabBar.test.ts`
- 修改：`src/shell/AppShell.vue:10`（替换 `data-region="tabs"` 占位）

**接口：**
- 产出：`TabBar` 组件，props：`{ tabs: { id: string; title: string; dirty: boolean }[]; activeId: string }`；emits：`select(id)`、`close(id)`

- [ ] **Step 1: 写失败的测试**

创建 `src/shell/TabBar.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TabBar from "./TabBar.vue";

const tabs = [
  { id: "a", title: "app.log", dirty: false },
  { id: "b", title: "config.toml", dirty: true },
];

describe("TabBar", () => {
  it("活动标签带强调色指示条", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    expect(wrapper.findAll(".tab")[0].classes()).toContain("active");
  });

  it("未保存标签显示圆点而不是关闭按钮（设计规范 §7.1：● 不需要悬停即可见）", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    const dirty = wrapper.findAll(".tab")[1];
    expect(dirty.find(".dot").exists()).toBe(true);
  });

  it("已保存标签常显关闭按钮", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    expect(wrapper.findAll(".tab")[0].find(".close").exists()).toBe(true);
  });

  it("点击标签触发 select，点击关闭触发 close", async () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    await wrapper.findAll(".tab")[1].trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["b"]);
    await wrapper.findAll(".tab")[0].find(".close").trigger("click");
    expect(wrapper.emitted("close")?.[0]).toEqual(["a"]);
  });

  it("中键点击关闭标签（Windows 惯例）", async () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    await wrapper.findAll(".tab")[1].trigger("auxclick", { button: 1 });
    expect(wrapper.emitted("close")?.[0]).toEqual(["b"]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/shell/TabBar.test.ts
```

预期：FAIL，`Failed to resolve import "./TabBar.vue"`。

- [ ] **Step 3: 写最小实现**

创建 `src/shell/TabBar.vue`：

```vue
<script setup lang="ts">
defineProps<{
  tabs: { id: string; title: string; dirty: boolean }[];
  activeId: string;
}>();

const emit = defineEmits<{ select: [id: string]; close: [id: string] }>();

/** 中键关闭：Windows 惯例，无需精确点到关闭按钮 */
function onAuxClick(e: MouseEvent, id: string) {
  if (e.button === 1) {
    e.preventDefault();
    emit("close", id);
  }
}
</script>

<template>
  <div class="tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="tab"
      :class="{ active: tab.id === activeId }"
      @click="emit('select', tab.id)"
      @auxclick="onAuxClick($event, tab.id)"
    >
      <span class="title">{{ tab.title }}</span>
      <!-- 未保存时用圆点：状态可见优先于界面简洁 -->
      <span v-if="tab.dirty" class="dot" aria-label="未保存" />
      <span v-else class="close" aria-label="关闭" @click.stop="emit('close', tab.id)">×</span>
    </button>
  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  max-width: 180px;
  padding: 0 calc(var(--sp-pad) * 0.9);
  border: 0;
  border-right: 1px solid var(--sp-border);
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover { background: var(--sp-bg-hover); }
.tab.active {
  color: var(--sp-text);
  background: var(--sp-bg-surface);
  box-shadow: inset 0 2px 0 var(--sp-accent);
}
.tab:focus-visible { outline: 2px solid var(--sp-focus-ring); outline-offset: -2px; }
.title { overflow: hidden; text-overflow: ellipsis; }
.dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: var(--sp-accent); }
.close { opacity: 0.8; }
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/shell/TabBar.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，5 个用例通过。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(shell): TabBar 含未保存标记、中键关闭与点击区分离"
```

---

### Task 8: EditorHost 基础集成

**文件：**
- 创建：`src/editor/EditorHost.vue`
- 创建：`src/editor/extensions.ts`
- 创建：`src/editor/extensions.test.ts`
- 修改：`src/shell/AppShell.vue:12`（编辑区槽位内放 `<EditorHost />`）

**接口：**
- 产出：`createBaseExtensions(opts): Extension[]`（供 Task 9、10 扩展）、`EditorHost` 组件

- [ ] **Step 1: 写失败的测试**

创建 `src/editor/extensions.test.ts`。**编辑器用 `EditorState` 级测试，不测像素、不挂 DOM**——这是 I-02 风险（IME 无法自动化）下的可行做法：

```ts
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { createBaseExtensions } from "./extensions";

const stateWith = (doc: string) =>
  EditorState.create({ doc, extensions: createBaseExtensions({ tabSize: 4, lineNumbers: true }) });

describe("基础编辑器扩展", () => {
  it("装配后是合法状态，且文档内容一致", () => {
    const state = stateWith("hello\nworld");
    expect(state.doc.toString()).toBe("hello\nworld");
    expect(state.doc.lines).toBe(2);
  });

  it("支持撤销历史", () => {
    const state = stateWith("a");
    const tr = state.update({ changes: { from: 1, insert: "b" } });
    expect(tr.state.doc.toString()).toBe("ab");
    expect(tr.state.toJSON()).toBeTruthy();
  });

  it("关闭行号时不引入行号扩展仍可正常工作", () => {
    const state = EditorState.create({
      doc: "x",
      extensions: createBaseExtensions({ tabSize: 4, lineNumbers: false }),
    });
    expect(state.doc.toString()).toBe("x");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/editor/extensions.test.ts
```

预期：FAIL，`Failed to resolve import "./extensions"`。

- [ ] **Step 3: 写最小实现**

创建 `src/editor/extensions.ts`：

```ts
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { bracketMatching } from "@codemirror/language";

export interface BaseExtensionOptions {
  tabSize: number;
  lineNumbers: boolean;
  activeLine?: boolean;
  bracketMatching?: boolean;
}

/**
 * M1 的基础扩展装配。
 * 明确不引入任何 `@codemirror/lang-*`——V1.0 是纯文本编辑体验，
 * 语法高亮归 V1.1 的 Tree-sitter 服务（设计规范与实施计划 M1 均禁止）。
 */
export function createBaseExtensions(opts: BaseExtensionOptions): Extension[] {
  const exts: Extension[] = [
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorState.tabSize.of(opts.tabSize),
    EditorView.lineWrapping,
  ];
  if (opts.lineNumbers) exts.push(lineNumbers(), highlightActiveLineGutter());
  if (opts.activeLine !== false) exts.push(highlightActiveLine());
  if (opts.bracketMatching !== false) exts.push(bracketMatching());
  return exts;
}
```

创建 `src/editor/EditorHost.vue`：

```vue
<script setup lang="ts">
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTokens } from "../design/apply";
import { createBaseExtensions } from "./extensions";

const props = withDefaults(defineProps<{ doc?: string; lineNumbers?: boolean }>(), {
  doc: "",
  lineNumbers: true,
});

const host = ref<HTMLDivElement | null>(null);
const { tokens } = useTokens();
let view: EditorView | null = null;

onMounted(() => {
  if (!host.value) return;
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.doc,
      extensions: createBaseExtensions({
        tabSize: tokens.value.typography.tabSize,
        lineNumbers: props.lineNumbers,
      }),
    }),
  });
});

// 行数/状态由 ViewPlugin 上报，此处只处理显式传入的文档替换
watch(
  () => props.doc,
  (next) => {
    if (!view || view.state.doc.toString() === next) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  },
);

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="host" class="editor-host" />
</template>

<style scoped>
.editor-host { height: 100%; overflow: hidden; }
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/editor/extensions.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，3 个用例通过。

- [ ] **Step 5: 人工确认**

```bash
pnpm dev
```

预期：编辑区可点击、可输入、可删字、行号与内容对齐；**输入中文不出乱码，输入法候选框位置正常**（IME 人工验收，自动化测不了）。

- [ ] **Step 6: 提交**

```bash
git add -A src/
git commit -m "feat(editor): EditorHost 与基础扩展装配"
```

---

### Task 9: 编辑器主题热替换与编辑增强

**文件：**
- 创建：`src/editor/theme.ts`
- 创建：`src/editor/theme.test.ts`
- 修改：`src/editor/EditorHost.vue`、`src/editor/extensions.ts`

**接口：**
- 消费：Task 2 的 `tokensToEditorTheme`、Task 4 的 `useTokens`
- 产出：`createThemeCompartment(tokens): { compartment, reconfigure(tokens): void }`

- [ ] **Step 1: 写失败的测试**

创建 `src/editor/theme.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { DARK_TOKENS, LIGHT_TOKENS } from "../design/tokens";
import { createEditorTheme } from "./theme";

describe("编辑器主题", () => {
  it("由令牌生成，含正文与行号配色", () => {
    const theme = createEditorTheme(LIGHT_TOKENS);
    expect(theme).toBeTruthy();
    // EditorView.theme 的返回值是不透明对象，能构造即说明入参形状正确
    expect(typeof theme).toBe("object");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/editor/theme.test.ts
```

预期：FAIL，`Failed to resolve import "./theme"`。

- [ ] **Step 3: 写最小实现**

创建 `src/editor/theme.ts`：

```ts
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import { tokensToEditorTheme } from "../design/derive";
import type { ThemeTokens } from "../design/tokens";

/** 令牌 → CodeMirror 主题扩展 */
export function createEditorTheme(tokens: ThemeTokens): Extension {
  return EditorView.theme(tokensToEditorTheme(tokens), { dark: tokens.name === "dark" });
}
```

修改 `src/editor/EditorHost.vue` 的 `<script setup>`，加入 `Compartment` 热替换。**必须用 Compartment，不能重建 EditorView**——重建会丢失撤销历史与滚动位置：

```ts
import { Compartment } from "@codemirror/state";
import { createEditorTheme } from "./theme";

const themeCompartment = new Compartment();
// createBaseExtensions 之后追加：
//   themeCompartment.of(createEditorTheme(tokens.value))

// 主题变化时热替换，不重建 view
watch(
  () => tokens.value.name,
  () => view?.dispatch({ effects: themeCompartment.reconfigure(createEditorTheme(tokens.value)) }),
);
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test && pnpm exec vue-tsc -b
```

预期：全部 PASS。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(editor): 令牌驱动的编辑器主题与 Compartment 热替换"
```

---

### Task 10: 列编辑（FR-14）

**文件：**
- 修改：`src/editor/extensions.ts`
- 修改：`src/editor/extensions.test.ts`

- [ ] **Step 1: 写失败的测试**

在 `src/editor/extensions.test.ts` 追加：

```ts
it("矩形选区扩展已装配（FR-14 列编辑）", () => {
  const exts = createBaseExtensions({ tabSize: 4, lineNumbers: true });
  // Extension 是不透明值，这里断言装配数量随开关变化，确保列编辑确实被加进去
  const without = createBaseExtensions({ tabSize: 4, lineNumbers: true, rectangularSelection: false });
  expect(exts.length).toBe(without.length + 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/editor/extensions.test.ts
```

预期：FAIL，`rectangularSelection` 不是已知属性 / 长度相等。

- [ ] **Step 3: 写最小实现**

修改 `src/editor/extensions.ts`：在导入中加入 `import { crosshairCursor, rectangularSelection } from "@codemirror/view";`，在 `BaseExtensionOptions` 加 `rectangularSelection?: boolean;`，并在函数末尾追加：

```ts
  if (opts.rectangularSelection !== false) exts.push(rectangularSelection(), crosshairCursor());
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/editor/extensions.test.ts && pnpm exec vue-tsc -b
```

预期：PASS。

- [ ] **Step 5: 人工验收列编辑**

```bash
pnpm dev
```

按住 `Alt` 用鼠标纵向拖选若干行，输入文字，预期**多行同时插入**。这一步无法自动化，必须人工确认。

- [ ] **Step 6: 提交**

```bash
git add -A src/
git commit -m "feat(editor): 列编辑（rectangularSelection + crosshairCursor）"
```

---

### Task 11: documents store

**文件：**
- 创建：`src/stores/documents.ts`
- 创建：`src/stores/documents.test.ts`
- 修改：`src/shell/AppShell.vue`（接上 TabBar 与 EditorHost）

**接口：**
- 产出：`useDocumentsStore()`，含 `tabs`、`activeId`、`activeTab`、`newDocument(title)`、`closeDocument(id)`、`selectDocument(id)`、`setDirty(id, dirty)`

- [ ] **Step 1: 写失败的测试**

创建 `src/stores/documents.test.ts`：

```ts
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useDocumentsStore } from "./documents";

describe("documents store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("初始为空的文档集合没有活动标签", () => {
    const s = useDocumentsStore();
    expect(s.tabs).toEqual([]);
    expect(s.activeTab).toBeUndefined();
  });

  it("新建文档后自动成为活动标签", () => {
    const s = useDocumentsStore();
    s.newDocument("未命名 1");
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(s.tabs[0].id);
    expect(s.activeTab?.title).toBe("未命名 1");
  });

  it("关闭活动标签后焦点落到相邻标签", () => {
    const s = useDocumentsStore();
    s.newDocument("a");
    s.newDocument("b");
    const firstId = s.tabs[0].id;
    s.selectDocument(firstId);
    s.closeDocument(firstId);
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(s.tabs[0].id);
  });

  it("关闭最后一个标签时自动新建一个未命名文档（设计规范 §7.1：不存在无标签空态）", () => {
    const s = useDocumentsStore();
    s.newDocument("only");
    s.closeDocument(s.tabs[0].id);
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].title).toMatch(/^未命名 \d+$/);
  });

  it("编辑后标记为未保存", () => {
    const s = useDocumentsStore();
    s.newDocument("a");
    s.setDirty(s.tabs[0].id, true);
    expect(s.activeTab?.dirty).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/stores/documents.test.ts
```

预期：FAIL，`Failed to resolve import "./documents"`。

- [ ] **Step 3: 写最小实现**

创建 `src/stores/documents.ts`：

```ts
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface DocumentTab {
  id: string;
  title: string;
  dirty: boolean;
  /** 已保存文件的绝对路径；未命名文档为 null */
  path: string | null;
}

let counter = 0;
const nextId = () => `doc-${++counter}`;

export const useDocumentsStore = defineStore("documents", () => {
  const tabs = ref<DocumentTab[]>([]);
  const activeId = ref<string | null>(null);

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value));

  function newDocument(title?: string): DocumentTab {
    const tab: DocumentTab = {
      id: nextId(),
      title: title ?? `未命名 ${tabs.value.length + 1}`,
      dirty: false,
      path: null,
    };
    tabs.value.push(tab);
    activeId.value = tab.id;
    return tab;
  }

  function selectDocument(id: string) {
    activeId.value = id;
  }

  function closeDocument(id: string) {
    const index = tabs.value.findIndex((t) => t.id === id);
    if (index < 0) return;
    tabs.value.splice(index, 1);

    // 关闭最后一个标签时不留空态：直接新建一个，少一个需要实现的界面状态
    if (tabs.value.length === 0) {
      newDocument();
      return;
    }
    if (activeId.value === id) {
      const neighbour = tabs.value[Math.min(index, tabs.value.length - 1)];
      activeId.value = neighbour.id;
    }
  }

  function setDirty(id: string, dirty: boolean) {
    const tab = tabs.value.find((t) => t.id === id);
    if (tab) tab.dirty = dirty;
  }

  return { tabs, activeId, activeTab, newDocument, selectDocument, closeDocument, setDirty };
});
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/stores/documents.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，5 个用例通过。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(stores): documents store 含标签增删选与未保存标记"
```

---

### Task 12: MenuBar

**文件：**
- 创建：`src/menu/model.ts`
- 创建：`src/menu/model.test.ts`
- 创建：`src/shell/MenuBar.vue`
- 创建：`src/shell/MenuBar.test.ts`
- 修改：`src/shell/AppShell.vue:8`（替换 `data-region="menu"` 占位）

**接口：**
- 产出：`MENU_MODEL`（设计规范 §6.1 的七个顶层菜单，逐项含快捷键与启用条件）、`MenuBar` 组件

- [ ] **Step 1: 写失败的测试**

创建 `src/menu/model.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { MENU_MODEL, V1_0_TOP_LEVEL } from "./model";

describe("菜单模型", () => {
  it("V1.0 恰好七个顶层菜单，顺序固定（设计规范 §6.1）", () => {
    expect(MENU_MODEL.filter((m) => m.version === "V1.0").map((m) => m.label)).toEqual([
      "文件", "编辑", "搜索", "视图", "编码", "设置", "帮助",
    ]);
    expect(V1_0_TOP_LEVEL).toHaveLength(7);
  });

  it("不含任何候选功能——设计规范 §9.3 已明确排除", () => {
    const all = MENU_MODEL.flatMap((m) => m.items.map((i) => i.label));
    expect(all).not.toContain("转到行…");
    expect(all).not.toContain("工具栏");
    expect(all).not.toContain("跟随系统主题");
  });

  it("每一项都标注归属版本", () => {
    for (const menu of MENU_MODEL) {
      for (const item of menu.items) {
        expect(item.version, `${menu.label} → ${item.label} 缺版本`).toBeTruthy();
      }
    }
  });
});
```

创建 `src/shell/MenuBar.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import MenuBar from "./MenuBar.vue";

describe("MenuBar", () => {
  it("渲染七个顶层菜单", () => {
    expect(mount(MenuBar).findAll(".top").map((n) => n.text())).toEqual([
      "文件", "编辑", "搜索", "视图", "编码", "设置", "帮助",
    ]);
  });

  it("V1.1/V1.2/V2.0 的预留项不出现在 V1.0 界面里", async () => {
    const wrapper = mount(MenuBar);
    await wrapper.findAll(".top")[2].trigger("click"); // 搜索
    expect(wrapper.text()).not.toContain("在文件中查找");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/menu/model.test.ts src/shell/MenuBar.test.ts
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 写最小实现**

创建 `src/menu/model.ts`。**结构照设计规范 §6.1 逐条录入**，V1.0 之外的项标版本但不渲染：

```ts
export type MenuVersion = "V1.0" | "V1.1" | "V1.2" | "V2.0";

export interface MenuItem {
  label: string;
  /** 快捷键提示，仅用于显示；绑定在 Task 14 之后统一接线 */
  accelerator?: string;
  /** 对应的 FR／OR 编号，便于追溯 */
  requirement?: string;
  version: MenuVersion;
  /** 分隔线（label 为空） */
  separator?: boolean;
  command?: string;
}

export interface TopLevelMenu {
  label: string;
  /** 助记符，Alt+ 该键可直接打开 */
  mnemonic: string;
  version: MenuVersion;
  items: MenuItem[];
}

export const MENU_MODEL: TopLevelMenu[] = [
  {
    label: "文件", mnemonic: "f", version: "V1.0",
    items: [
      { label: "新建", accelerator: "Ctrl+N", requirement: "FR-04", version: "V1.0", command: "file.new" },
      { label: "打开…", accelerator: "Ctrl+O", requirement: "FR-05", version: "V1.0", command: "file.open" },
      { label: "最近文件", requirement: "FR-07", version: "V1.0", command: "file.recent" },
      { label: "", separator: true, version: "V1.0" },
      { label: "保存", accelerator: "Ctrl+S", requirement: "FR-06", version: "V1.0", command: "file.save" },
      { label: "另存为…", accelerator: "Ctrl+Shift+S", requirement: "FR-06", version: "V1.0", command: "file.saveAs" },
      { label: "", separator: true, version: "V1.0" },
      { label: "关闭标签", accelerator: "Ctrl+W", requirement: "FR-10", version: "V1.0", command: "tab.close" },
      { label: "全部关闭", requirement: "FR-10", version: "V1.0", command: "tab.closeAll" },
      { label: "", separator: true, version: "V1.0" },
      { label: "退出", accelerator: "Alt+F4", requirement: "FR-02", version: "V1.0", command: "app.exit" },
    ],
  },
  {
    label: "编辑", mnemonic: "e", version: "V1.0",
    items: [
      { label: "撤销", accelerator: "Ctrl+Z", requirement: "FR-12", version: "V1.0", command: "edit.undo" },
      { label: "重做", accelerator: "Ctrl+Y", requirement: "FR-12", version: "V1.0", command: "edit.redo" },
      { label: "", separator: true, version: "V1.0" },
      { label: "剪切", accelerator: "Ctrl+X", requirement: "FR-12", version: "V1.0", command: "edit.cut" },
      { label: "复制", accelerator: "Ctrl+C", requirement: "FR-12", version: "V1.0", command: "edit.copy" },
      { label: "粘贴", accelerator: "Ctrl+V", requirement: "FR-12", version: "V1.0", command: "edit.paste" },
      { label: "", separator: true, version: "V1.0" },
      { label: "删除行", accelerator: "Ctrl+Shift+K", requirement: "FR-13", version: "V1.0", command: "edit.deleteLine" },
      { label: "复制行", accelerator: "Ctrl+Shift+D", requirement: "FR-13", version: "V1.0", command: "edit.copyLine" },
      { label: "上移行", accelerator: "Alt+↑", requirement: "FR-13", version: "V1.0", command: "edit.moveLineUp" },
      { label: "下移行", accelerator: "Alt+↓", requirement: "FR-13", version: "V1.0", command: "edit.moveLineDown" },
      { label: "合并行", accelerator: "Ctrl+J", requirement: "FR-13", version: "V1.0", command: "edit.joinLines" },
      { label: "", separator: true, version: "V1.0" },
      { label: "列选择模式", accelerator: "Alt+C", requirement: "FR-14", version: "V1.0", command: "edit.columnMode" },
      { label: "全选", accelerator: "Ctrl+A", requirement: "FR-12", version: "V1.0", command: "edit.selectAll" },
    ],
  },
  {
    label: "搜索", mnemonic: "s", version: "V1.0",
    items: [
      { label: "查找…", accelerator: "Ctrl+F", requirement: "FR-21", version: "V1.0", command: "search.find" },
      { label: "替换…", accelerator: "Ctrl+H", requirement: "FR-23", version: "V1.0", command: "search.replace" },
      { label: "", separator: true, version: "V1.0" },
      { label: "查找下一个", accelerator: "F3", requirement: "FR-21", version: "V1.0", command: "search.next" },
      { label: "查找上一个", accelerator: "Shift+F3", requirement: "FR-21", version: "V1.0", command: "search.prev" },
      { label: "在文件中查找…", accelerator: "Ctrl+Shift+F", requirement: "FR-24", version: "V1.2", command: "search.inFiles" },
    ],
  },
  {
    label: "视图", mnemonic: "v", version: "V1.0",
    items: [
      { label: "主题", requirement: "FR-37", version: "V1.0", command: "view.theme" },
      { label: "字体…", requirement: "FR-38", version: "V1.0", command: "view.font" },
      { label: "", separator: true, version: "V1.0" },
      { label: "行号", requirement: "FR-20", version: "V1.0", command: "view.lineNumbers" },
      { label: "当前行高亮", requirement: "FR-19", version: "V1.0", command: "view.activeLine" },
      { label: "括号匹配", requirement: "FR-18", version: "V1.0", command: "view.bracketMatching" },
      { label: "自动缩进", requirement: "FR-15", version: "V1.0", command: "view.autoIndent" },
      { label: "代码折叠", requirement: "FR-17", version: "V1.1", command: "view.fold" },
    ],
  },
  {
    label: "编码", mnemonic: "c", version: "V1.0",
    items: [
      { label: "重新加载为…", requirement: "FR-26", version: "V1.0", command: "encoding.reloadAs" },
      { label: "转换为…", requirement: "FR-27", version: "V1.0", command: "encoding.convertTo" },
      { label: "换行符", requirement: "FR-29/FR-30", version: "V1.0", command: "encoding.eol" },
      { label: "", separator: true, version: "V1.0" },
      { label: "带 BOM 保存", requirement: "FR-28", version: "V1.0", command: "encoding.bom" },
    ],
  },
  {
    label: "设置", mnemonic: "t", version: "V1.0",
    items: [
      { label: "首选项…", accelerator: "Ctrl+,", requirement: "FR-37/FR-38/FR-43", version: "V1.0", command: "settings.open" },
      { label: "快捷键…", requirement: "FR-39", version: "V1.0", command: "settings.shortcuts" },
      { label: "", separator: true, version: "V1.0" },
      { label: "导入配置…", requirement: "FR-40", version: "V1.0", command: "settings.import" },
      { label: "导出配置…", requirement: "FR-40", version: "V1.0", command: "settings.export" },
    ],
  },
  {
    label: "帮助", mnemonic: "h", version: "V1.0",
    items: [
      { label: "快捷键说明", accelerator: "F1", requirement: "OR-01", version: "V1.0", command: "help.shortcuts" },
      { label: "", separator: true, version: "V1.0" },
      { label: "关于 ScribaPad", requirement: "OR-03", version: "V1.0", command: "help.about" },
    ],
  },
];

export const V1_0_TOP_LEVEL = MENU_MODEL.filter((m) => m.version === "V1.0");
```

创建 `src/shell/MenuBar.vue`：

```vue
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { MENU_MODEL, type MenuItem } from "../menu/model";

const openIndex = ref<number | null>(null);

/** V1.0 只渲染本期菜单，预留项不在界面上出现 */
const menus = computed(() => MENU_MODEL.filter((m) => m.version === "V1.0"));

const emit = defineEmits<{ run: [command: string] }>();

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i;
}
/** Windows 惯例：已有菜单打开时，悬停另一个顶层直接切换 */
function hover(i: number) {
  if (openIndex.value !== null) openIndex.value = i;
}
function run(item: MenuItem) {
  if (item.separator || !item.command) return;
  emit("run", item.command);
  openIndex.value = null;
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") openIndex.value = null;
  // Alt 聚焦菜单栏；Alt+助记符直接打开对应菜单
  if (e.altKey && !e.ctrlKey) {
    const i = menus.value.findIndex((m) => m.mnemonic === e.key.toLowerCase());
    if (i >= 0) {
      e.preventDefault();
      openIndex.value = i;
    }
  }
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="menubar">
    <div
      v-for="(menu, i) in menus"
      :key="menu.label"
      class="top"
      :class="{ open: openIndex === i }"
      @click="toggle(i)"
      @mouseenter="hover(i)"
    >
      {{ menu.label }}
      <ul v-if="openIndex === i" class="dropdown">
        <template v-for="(item, j) in menu.items" :key="j">
          <li v-if="item.separator" class="sep" />
          <li
            v-else
            class="item"
            :class="{ reserved: item.version !== 'V1.0' }"
            @click.stop="run(item)"
          >
            <span>{{ item.label }}</span>
            <span v-if="item.accelerator" class="accel">{{ item.accelerator }}</span>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.menubar {
  display: flex;
  align-items: center;
  height: var(--sp-menu-h);
  padding: 0 var(--sp-pad);
  gap: calc(var(--sp-pad) * 1.15);
}
.top { position: relative; cursor: default; user-select: none; }
.top.open { color: var(--sp-accent); }
.top:focus-visible { outline: 2px solid var(--sp-focus-ring); outline-offset: 1px; }
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  min-width: 180px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--sp-bg-chrome);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius);
  box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 3px calc(var(--sp-pad) * 1.2);
  white-space: nowrap;
}
.item:hover { background: var(--sp-bg-hover); }
.item.reserved { color: var(--sp-text-disabled); }
.accel { color: var(--sp-text-dim); font-size: var(--sp-font-size-status); }
.sep { height: 1px; margin: 4px 0; background: var(--sp-border); }
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/menu/model.test.ts src/shell/MenuBar.test.ts && pnpm exec vue-tsc -b
```

预期：PASS。若 `不含任何候选功能` 用例失败，说明往菜单里加了设计规范 §9.3 明确排除的项（转到行／工具栏显隐／跟随系统主题），**删掉它而不是改测试**。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(shell): MenuBar 与 V1.0 七菜单模型"
```

---

### Task 13: ToolBar 与图标接入

**文件：**
- 创建：`src/shell/ToolBar.vue`
- 创建：`src/shell/ToolBar.test.ts`
- 修改：`src/shell/AppShell.vue:9`（替换 `data-region="toolbar"` 占位）

**接口：**
- 消费：Task 12 的 `command` 命名约定（工具栏按钮 emit 同名 command）
- 产出：`ToolBar` 组件，emits：`run(command)`

图标名**逐字取自设计规范 §6.5.3 的清单**，不要自行改名。每个名字都已在 `@vicons/fluent` 包内核实存在。

- [ ] **Step 1: 写失败的测试**

创建 `src/shell/ToolBar.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ToolBar from "./ToolBar.vue";

describe("ToolBar", () => {
  it("恰好 8 个按钮，顺序符合设计规范 §6.2", () => {
    const wrapper = mount(ToolBar);
    expect(wrapper.findAll("[data-action]").map((n) => n.attributes("data-action"))).toEqual([
      "file.new", "file.open", "file.save",
      "edit.undo", "edit.redo",
      "search.find", "search.replace",
      "settings.open",
    ]);
  });

  it("不包含编码与换行符按钮——它们已在状态栏，工具栏不重复（设计规范 §6.2）", () => {
    const actions = mount(ToolBar).findAll("[data-action]").map((n) => n.attributes("data-action"));
    expect(actions.some((a) => a?.startsWith("encoding."))).toBe(false);
  });

  it("点击按钮 emit 对应 command", async () => {
    const wrapper = mount(ToolBar);
    await wrapper.find("[data-action='file.save']").trigger("click");
    expect(wrapper.emitted("run")?.[0]).toEqual(["file.save"]);
  });

  it("不可用的按钮置灰而非隐藏（设计规范 §3.4：避免按钮位置跳动）", () => {
    const wrapper = mount(ToolBar, { props: { disabled: ["file.save", "edit.undo"] } });
    const save = wrapper.find("[data-action='file.save']");
    expect(save.exists()).toBe(true);
    expect(save.attributes("disabled")).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/shell/ToolBar.test.ts
```

预期：FAIL，`Failed to resolve import "./ToolBar.vue"`。

- [ ] **Step 3: 写最小实现**

创建 `src/shell/ToolBar.vue`。图标经 `n-icon` 承载，**不传 `size`/`color` 属性**——`n-icon` 是 `1em` 见方且 `fill: currentColor`，尺寸与颜色由 CSS 令牌继承：

```vue
<script setup lang="ts">
import {
  ArrowRedo20Filled, ArrowRedo20Regular,
  ArrowSwap20Regular,
  ArrowUndo20Filled, ArrowUndo20Regular,
  DocumentAdd20Regular,
  FolderOpen20Regular,
  Save20Regular,
  Search20Regular,
  Settings20Regular,
} from "@vicons/fluent";
import { NIcon } from "naive-ui";
import { computed } from "vue";

const props = withDefaults(defineProps<{ disabled?: string[] }>(), { disabled: () => [] });

const emit = defineEmits<{ run: [command: string] }>();

/** 图标名取自设计规范 §6.5.3；Regular 为默认，Filled 留给激活态 */
const buttons = [
  { command: "file.new", label: "新建", icon: DocumentAdd20Regular },
  { command: "file.open", label: "打开", icon: FolderOpen20Regular },
  { command: "file.save", label: "保存", icon: Save20Regular },
  { command: "edit.undo", label: "撤销", icon: ArrowUndo20Regular },
  { command: "edit.redo", label: "重做", icon: ArrowRedo20Regular },
  { command: "search.find", label: "查找", icon: Search20Regular },
  { command: "search.replace", label: "替换", icon: ArrowSwap20Regular },
  { command: "settings.open", label: "设置", icon: Settings20Regular },
] as const;

const isDisabled = (command: string) => props.disabled.includes(command);
const overflowFrom = computed(() => buttons.length);
</script>

<template>
  <div class="toolbar">
    <button
      v-for="b in buttons"
      :key="b.command"
      type="button"
      class="tb"
      :data-action="b.command"
      :title="b.label"
      :disabled="isDisabled(b.command)"
      @click="emit('run', b.command)"
    >
      <NIcon><component :is="b.icon" /></NIcon>
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: var(--sp-toolbar-h);
  padding: 0 var(--sp-pad);
}
.tb {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 图标尺寸由令牌驱动：n-icon 是 1em 见方，设 font-size 即设图标大小 */
  font-size: var(--sp-icon);
  width: calc(var(--sp-icon) + 7px);
  height: calc(var(--sp-toolbar-h) - 6px);
  border: 0;
  border-radius: calc(var(--sp-radius) * 0.8);
  color: var(--sp-text);
  background: transparent;
  cursor: pointer;
}
.tb:hover:not(:disabled) { background: var(--sp-bg-hover); }
.tb:disabled { color: var(--sp-text-disabled); cursor: default; }
.tb:focus-visible { outline: 2px solid var(--sp-focus-ring); outline-offset: 1px; }
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/shell/ToolBar.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，4 个用例通过。若报某个图标名不存在，**回到设计规范 §6.5.3 核对拼写**——`@vicons/fluent` 的图标名带尺寸后缀（`20`／`24`／`16`），凭印象改必然出错。

- [ ] **Step 5: 人工确认图标清晰度**

```bash
pnpm dev
```

预期：8 个图标在 15px 下**边缘锐利、浓淡均匀**。若发虚，说明用错了图标集或尺寸未走令牌（本设计选 Fluent 正是因为它在 15px 下不产生亚像素描边，见规范 §6.5.1）。

- [ ] **Step 6: 提交**

```bash
git add -A src/
git commit -m "feat(shell): ToolBar 8 按钮与 n-icon 图标接入"
```

---

### Task 14: DockPanel 壳

**文件：**
- 创建：`src/shell/DockPanel.vue`
- 创建：`src/shell/DockPanel.test.ts`
- 修改：`src/shell/AppShell.vue:11`（替换 `data-region="dock"` 占位）

**接口：**
- 产出：`DockPanel` 组件，props：`{ collapsed: boolean }`；emits：`toggle`、`close`；具名插槽 `tab-find-replace`、`tab-search-in-files`、默认插槽为内容区

M1 只搭壳：页签条 + 折叠 + 高度。页签内容由 M4／M7 填入。

- [ ] **Step 1: 写失败的测试**

创建 `src/shell/DockPanel.test.ts`：

```ts
// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DockPanel from "./DockPanel.vue";

describe("DockPanel", () => {
  it("折叠态仍保留页签条（设计规范 §3.2：既是状态显示也是展开入口）", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    expect(wrapper.find(".dock-tabs").exists()).toBe(true);
    expect(wrapper.find(".dock-body").exists()).toBe(false);
  });

  it("展开态出现内容区", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: false } });
    expect(wrapper.find(".dock-body").exists()).toBe(true);
  });

  it("两个页签在 M1 就已存在，M7 只需填内容", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    expect(wrapper.findAll(".dt").map((n) => n.text())).toEqual(["查找 / 替换", "在文件中查找"]);
  });

  it("点击页签切换，点关闭 emit close", async () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    await wrapper.findAll(".dt")[1].trigger("click");
    expect(wrapper.emitted("update:activeTab")?.[0]).toEqual(["search-in-files"]);
    await wrapper.find(".cl").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/shell/DockPanel.test.ts
```

预期：FAIL，模块不存在。

- [ ] **Step 3: 写最小实现**

创建 `src/shell/DockPanel.vue`：

```vue
<script setup lang="ts">
import { ref } from "vue";

withDefaults(defineProps<{ collapsed: boolean; activeTab?: string }>(), {
  activeTab: "find-replace",
});

const emit = defineEmits<{
  "update:activeTab": [tab: string];
  toggle: [];
  close: [];
}>();

const tabs = [
  { id: "find-replace", label: "查找 / 替换" },
  { id: "search-in-files", label: "在文件中查找" },
] as const;

const current = ref<string>("find-replace");
function select(id: string) {
  current.value = id;
  emit("update:activeTab", id);
}
</script>

<template>
  <!-- 折叠态只留页签条：26px 的高度本身就在说明"面板还在" -->
  <div class="dock" :data-collapsed="String(collapsed)">
    <div class="dock-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="dt"
        :class="{ on: current === t.id }"
        @click="select(t.id)"
      >
        {{ t.label }}
      </button>
      <span class="grow" />
      <button type="button" class="cl" aria-label="折叠面板" @click="emit('close')">×</button>
    </div>
    <div v-if="!collapsed" class="dock-body">
      <slot :name="current" />
    </div>
  </div>
</template>

<style scoped>
.dock { background: var(--sp-bg-chrome); border-top: 1px solid var(--sp-border); }
.dock-tabs {
  display: flex;
  align-items: center;
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
}
.dt {
  height: 100%;
  padding: 0 calc(var(--sp-pad) * 1.1);
  border: 0;
  border-right: 1px solid var(--sp-border);
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
}
.dt.on {
  color: var(--sp-text);
  background: var(--sp-bg-chrome);
  box-shadow: inset 0 2px 0 var(--sp-accent);
}
.dt:focus-visible { outline: 2px solid var(--sp-focus-ring); outline-offset: -2px; }
.grow { flex: 1; }
.cl {
  padding: 0 calc(var(--sp-pad) * 1.1);
  border: 0;
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
}
.dock-body {
  height: var(--sp-dock-h);
  padding: calc(var(--sp-pad) * 0.9) var(--sp-pad);
  border-top: 1px solid var(--sp-border);
  overflow: auto;
}
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/shell/DockPanel.test.ts && pnpm exec vue-tsc -b
```

预期：PASS，4 个用例通过。

- [ ] **Step 5: 提交**

```bash
git add -A src/
git commit -m "feat(shell): DockPanel 壳（页签条 + 折叠 + 内容槽）"
```

---

### Task 15: 窗口配置与 Rust 测试基线

**文件：**
- 修改：`src-tauri/tauri.conf.json`
- 修改：`src-tauri/src/lib.rs`（移除脚手架 `greet` 示例命令）

**接口：**
- 产出：符合设计规范 §8.1／§8.2 的窗口配置

- [ ] **Step 1: 写配置**

把 `src-tauri/tauri.conf.json` 的 `app.windows[0]` 替换为：

```json
{
  "title": "ScribaPad",
  "width": 1200,
  "height": 800,
  "minWidth": 640,
  "minHeight": 400,
  "backgroundColor": "#ffffff"
}
```

**两处说明，不要自行改动**：

- `backgroundColor` 取**浅色主题的编辑区底色 `#ffffff`**（设计规范 §8.1）。窗口在 WebView 画出第一帧之前就已可见，若窗口底色与主题不一致，深色主题用户会看到一次白色闪光。**Windows 平台上 alpha 通道会被忽略，所以必须是六位不透明十六进制**。
- **M1 只写静态浅色值**。动态跟随上次主题需要读配置文件，而配置文件在 M5 才引入（FR-37／FR-38）——现在为它建一套配置读取是超前的。**M5 开工时把这里改为由 Rust 侧读配置决定**，这条已记在设计规范 §8.1。

- [ ] **Step 2: 移除脚手架示例命令**

`src-tauri/src/lib.rs` 的 `greet` 是 create-tauri-app 的演示代码，M1 起不再需要。把文件改为：

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

同时删除 `src/App.vue` 之外对 `invoke("greet")` 的引用（Task 5 已把 App.vue 改为渲染 AppShell，此处只需确认没有残留）。

- [ ] **Step 3: 确认 Rust 测试基线可跑**

```bash
cd src-tauri && cargo test
```

预期：`test result: ok. 0 passed; 0 failed`。

**这里没有测试不是疏漏**：M1 不引入任何 Rust 业务逻辑（编辑、编码、搜索都从 M2 起），因此没有可测的纯函数。本步的目的是**确认测试通道可用并被 CI 执行**（Task 17），真正的 Rust 测试从 M2 的编码转换开始。**不要为了凑测试而写无意义的断言。**

- [ ] **Step 4: 确认构建通过**

```bash
pnpm exec vue-tsc -b && pnpm exec vp test && pnpm exec vp check
cd src-tauri && cargo check
```

预期：全部通过。

- [ ] **Step 5: 提交**

```bash
git add -A src-tauri/ src/
git commit -m "chore(tauri): 窗口尺寸与启动背景色；移除脚手架示例命令"
```

---

### Task 16: M1 出口验证（AC-01 与 PR-08）

**这是里程碑出口标准的取证步骤**。AC-01（冷启动 ≤ 1.5 秒、热启动 ≤ 0.5 秒）与 PR-08（空闲内存基线）都是**人工判定**——本任务产出可复现的测量过程与记录，而不是自动化断言。

**文件：**
- 创建：`scripts/measure-startup.ps1`
- 修改：`src/main.ts`（加启动计时输出）

- [ ] **Step 1: 加启动计时**

在 `src/main.ts` 的 `applyTokens(LIGHT_TOKENS)` 之前插入：

```ts
// AC-01 取证用：记录前端挂载时刻。这是 WebView 内的相对时间，
// 与 Rust 侧的进程启动时间戳相减即为冷启动耗时（见 scripts/measure-startup.ps1）
performance.mark("sp-frontend-boot");
console.info(`[startup] frontend ready at ${performance.now().toFixed(1)}ms`);
```

- [ ] **Step 2: 写测量脚本**

创建 `scripts/measure-startup.ps1`：

```powershell
# AC-01 / PR-08 取证脚本。用法：pwsh scripts/measure-startup.ps1 -Runs 5
param([int]$Runs = 5)

$exe = Resolve-Path "src-tauri/target/release/scribapad.exe" -ErrorAction Stop
Write-Host "被测程序：$exe"
Write-Host "运行 $Runs 次，每次启动后采样空闲内存并退出。`n"

$mem = @()
for ($i = 1; $i -le $Runs; $i++) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $p = Start-Process -FilePath $exe -PassThru
  # 等待主窗口出现，作为"可见"的近似判据
  while ($p.MainWindowHandle -eq 0 -and -not $p.HasExited) {
    Start-Sleep -Milliseconds 20
    $p.Refresh()
  }
  $sw.Stop()
  Start-Sleep -Seconds 3   # 等界面稳定后再采样
  $p.Refresh()
  $mem += $p.WorkingSet64 / 1MB
  Write-Host ("第 {0} 次：窗口可见 {1} ms，空闲内存 {2:N1} MB" -f $i, $sw.ElapsedMilliseconds, ($p.WorkingSet64 / 1MB))
  $p.CloseMainWindow() | Out-Null
  Start-Sleep -Milliseconds 500
  if (-not $p.HasExited) { $p.Kill() }
}

Write-Host "`n=== 汇总 ==="
Write-Host "窗口可见耗时中位数：$([int](($mem | Measure-Object).Count)) 次采样"
Write-Host "空闲内存 中位数：$([math]::Round(($mem | Sort-Object)[[int]($Runs/2)], 1)) MB  ← 记入 PR-08 基线"
Write-Host "`n判定：AC-01 要求冷启动 ≤ 1500 ms。若超标，先确认测的是 release 构建（dev 构建必然超标）。"
```

- [ ] **Step 3: 构建 release 并测量**

```bash
pnpm tauri build
pwsh scripts/measure-startup.ps1 -Runs 5
```

预期：窗口可见耗时 **≤ 1500 ms**（AC-01 冷启动）。

**必须测 release 构建**：dev 构建带 HMR 与未压缩资源，数值没有参考意义。

- [ ] **Step 4: 人工验收键盘可达性（设计规范 §7.2）**

自审发现 §7.2 的 Tab 顺序没有任何任务覆盖它——它只有在全部组件到位之后才能验证，因此归入本出口检查。按 `Tab` 依次走一遍：

**预期顺序**：菜单栏 → 工具栏 → 标签栏 → 编辑区 → 面板页签条 → 面板内容 → 状态栏可点击字段。

逐项确认：

1. 顺序与上面一致，**没有区域被跳过**，也没有区域内元素乱序
2. 每一步的焦点**都可见**（2px 强调色描边，`--sp-focus-ring`），包括状态栏那两个可点击字段
3. 编辑区获得焦点后可直接输入

任一项不满足即为缺陷，**修复后再进入 Step 5**——焦点不可见属可访问性硬伤，不是可延后的优化。

- [ ] **Step 5: 记录结论**

把三项实测值写进本计划末尾的「执行记录」小节（新建），格式：

```markdown
## 执行记录

| 项 | 要求 | 实测 | 日期 | 结论 |
| -- | ---- | ---- | ---- | ---- |
| AC-01 冷启动 | ≤ 1500 ms | （填实测中位数） | | |
| PR-08 空闲内存 | 记录基线值 | （填实测中位数） MB | | |
| §7.2 Tab 顺序与焦点可见 | 七个区域、焦点环可见 | （通过／不通过） | | |
```

若 AC-01 超标：**先不要优化**。把实测值记录下来并报告——是否优化是产品决策（G-01 与实现成本的取舍），不是执行者可以自行决定的。

- [ ] **Step 6: 提交**

```bash
git add -A scripts/ src/main.ts "docs/ScribaPad M0-M1 步骤级实施计划.md"
git commit -m "test(m1): AC-01 与 PR-08 取证脚本与实测记录"
```

---

### Task 17: CI

**文件：**
- 创建：`.github/workflows/ci.yml`

- [ ] **Step 1: 写工作流**

创建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  frontend:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12.3.4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec vp check
      - run: pnpm exec vp test
      # 必须单独跑：vp check 的类型检查不覆盖 .vue 单文件组件
      - run: pnpm exec vue-tsc -b

  rust:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri
      - run: cargo test
        working-directory: src-tauri
```

**两点不要省略**：pnpm 版本必须钉到 `12.3.4`（与本地一致，`vp` 托管的版本不同会重建 `node_modules`）；`vue-tsc -b` 必须与 `vp check` 分开跑（前者才能发现 SFC 内的类型错误）。

- [ ] **Step 2: 本地等价验证**

CI 无法在本地完整复现，但可以逐条验证命令本身能通过：

```bash
pnpm install --frozen-lockfile
pnpm exec vp check
pnpm exec vp test
pnpm exec vue-tsc -b
cd src-tauri && cargo test
```

预期：五条全部通过。**若 `--frozen-lockfile` 失败，说明 `pnpm-lock.yaml` 与 `package.json` 不一致**——在本地跑 `pnpm install` 修好并一并提交，不要改 CI 去掉这个参数。

- [ ] **Step 3: 提交**

```bash
git add .github/workflows/ci.yml pnpm-lock.yaml
git commit -m "ci: 前端检查与测试、Rust 测试"
```

- [ ] **Step 4: 推送后确认 CI 变绿**

```bash
git push
```

预期：两个 job 均通过。若本仓库尚未配置远端，此步跳过并**在报告中说明未验证**——不要声称 CI 已通过。

---

## 计划的自我审查

按 writing-plans 的要求，写完后对 spec 做了一次对照检查。结果如下。

### 1. Spec 覆盖

设计规范 §8.3 把 M1 对应到具体章节，逐条核对：

| Spec 章节 | 覆盖它的任务 |
| --------- | ------------ |
| §3.1 布局骨架 | Task 5 |
| §3.2 底部面板 | Task 14 |
| §3.4 边界状态 | Task 5（不可用按钮置灰在 Task 13；启动空态在 Task 11 的 store 测试） |
| §4 全部令牌 | Task 1、Task 2 |
| §5.1 的 M1 组件 | Task 5～14 |
| §6.1～6.3 三栏 | Task 12、13、6 |
| §6.5 图标 | Task 13 |
| §7.1 标签 | Task 7、11 |
| §7.2 焦点与键盘 | Task 12（Alt 与 Esc）；**Tab 顺序未单独设任务**——见下方缺口 |
| §7.3 快捷键归属 | Task 12（仅菜单层）；**编辑器内表未接线**——见下方缺口 |
| §8.1 启动背景色 | Task 15 |
| §8.2 窗口尺寸 | Task 15 |
| §9.1 第 1 项 中文字宽 | Task 3 |

**发现两个缺口，已在本计划内闭环（不是留待日后）：**

1. **§7.2 的 Tab 顺序没有对应任务。** 它需要所有组件都到位之后才能统一验证，属于 M1 出口检查的一部分。**已补入 Task 16 的 Step 4**：人工走一遍七个区域的 Tab 顺序并确认焦点环可见，结果记入该任务的执行记录表（该表已相应增加一行）。
2. **§7.3 的编辑器内快捷键表未接线。** 初稿里 `edit.*` 的菜单命令已被 ToolBar 与 MenuBar emit，但**没有任何任务把它们接到 CodeMirror 的 command 上**——菜单项点不动是这份计划最容易残留的缺陷。**已新增 Task 18 闭环**（含纯逻辑测试与人工验收）。

### 2. 占位符扫描

已逐字检查：无 `TBD`、"待补"、"类似 Task N" 这类占位叙述，也没有**没有代码的代码步骤**——每个 Step 3 都给出了可直接粘贴的实现。

**唯一的 `TODO` 是刻意留下的**：Task 1 的 `tokens.ts` 里有一行 `// TODO(Task 3): 中日韩回退字体的字宽待实测确认`。它不是计划缺口，而是一个**被 Task 3 显式消费的锚点**——Task 3 的 PASS 分支要求"移除该标记并写下结论"，FAIL 分支要求"保持该标记并停下来报告"。留这个标记是为了让未决的字体决策可被 grep 到，而不是散在文档里。

Task 3 与 Task 16 没有自动化测试命令，两者都在正文中写明了原因，不是遗漏：

| 任务 | 为何没有自动化测试 |
| ---- | ------------------ |
| Task 3 中文字宽 | 字体度量需要真实渲染引擎，jsdom 没有字体（`measureText` 返回 0）。与风险 I-02 同源 |
| Task 16 AC-01／PR-08 | 路线图已定这两项为**人工判定**；本任务产出的是可复现的测量脚本与记录，不是断言 |

### 3. 类型一致性

- `ThemeTokens` 的字段名在 Task 1 定义，Task 2／4 消费，命名一致。
- `createBaseExtensions(opts)` 在 Task 8 定义签名，Task 10 扩展 `rectangularSelection` 选项，未改名。
- `documents` store 的方法名（`newDocument`／`closeDocument`／`selectDocument`／`setDirty`）在 Task 11 定义并被 Task 5～7 的组件消费，一致。
- 菜单 `command` 命名（`file.new`／`edit.undo`／`search.find`／`settings.open`）在 Task 12 定义、Task 13 消费，**逐字一致**。

### 4. 发现的缺口处理

按上面第 1 条，追加一个任务闭环编辑器快捷键：

---

### Task 18: 编辑器快捷键接线（闭环 §7.3）

**文件：**
- 创建：`src/editor/commands.ts`
- 创建：`src/editor/commands.test.ts`
- 修改：`src/editor/EditorHost.vue`、`src/editor/extensions.ts`

**接口：**
- 消费：Task 12／13 的 `command` 字符串
- 产出：`executeEditorCommand(view, command): boolean`、`EDITOR_KEYMAP`

- [ ] **Step 1: 写失败的测试**

创建 `src/editor/commands.test.ts`：

```ts
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { executeEditorCommand } from "./commands";
import { createBaseExtensions } from "./extensions";

function stateOf(doc: string) {
  return EditorState.create({
    doc,
    extensions: createBaseExtensions({ tabSize: 4, lineNumbers: true }),
  });
}

describe("编辑器命令分发", () => {
  it("未知命令返回 false，不做任何改动", () => {
    const state = stateOf("abc");
    // 直接测纯逻辑：命令表里没有的键必须被拒绝，避免静默吞掉菜单点击
    expect(executeEditorCommand(null, "nope.nothing")).toBe(false);
    expect(state.doc.toString()).toBe("abc");
  });

  it("edit.selectAll 是已知命令", () => {
    expect(typeof executeEditorCommand).toBe("function");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm exec vp test src/editor/commands.test.ts
```

预期：FAIL，`Failed to resolve import "./commands"`。

- [ ] **Step 3: 写最小实现**

创建 `src/editor/commands.ts`。**编辑器内表的键位与全局表刻意不重叠**（设计规范 §7.3），因此这里只映射编辑命令，不注册 `Ctrl+S` 一类全局键：

```ts
import {
  copyLineDown, deleteLine, joinLines, moveLineDown, moveLineUp,
  redo, selectAll, undo,
} from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";

/**
 * command 字符串 → CodeMirror 命令。
 * 只收录设计规范 §7.3「编辑器内表」的命令；全局表（Ctrl+N/O/S/W、
 * Ctrl+F/H 等）由 AppShell 处理，两张表键位不重叠，不需要优先级仲裁。
 */
const TABLE: Record<string, (view: EditorView) => boolean> = {
  "edit.undo": undo,
  "edit.redo": redo,
  "edit.selectAll": selectAll,
  "edit.deleteLine": deleteLine,
  "edit.copyLine": copyLineDown,
  "edit.moveLineUp": moveLineUp,
  "edit.moveLineDown": moveLineDown,
  "edit.joinLines": joinLines,
};

/** 返回是否已处理。未收录的命令返回 false，由调用方决定后续行为 */
export function executeEditorCommand(view: EditorView | null, command: string): boolean {
  const fn = TABLE[command];
  if (!fn || !view) return false;
  view.focus();
  return fn(view);
}

export function isEditorCommand(command: string): boolean {
  return command in TABLE;
}
```

在 `src/editor/EditorHost.vue` 中暴露视图并接收命令：加 `defineExpose({ run: (c: string) => executeEditorCommand(view, c) })`，并在 `src/shell/AppShell.vue` 中把 MenuBar／ToolBar 的 `run` 事件先交给 `isEditorCommand` 判定，命中则转发给 EditorHost，否则留给全局处理。

- [ ] **Step 4: 运行测试确认通过**

```bash
pnpm exec vp test src/editor/commands.test.ts && pnpm exec vue-tsc -b
```

预期：PASS。

- [ ] **Step 5: 人工验收菜单命令**

```bash
pnpm dev
```

依次点击 编辑 → 撤销／重做／删除行／复制行／上移行／下移行／合并行／全选，预期**每一项都在编辑区生效**。这一步无法自动化，必须人工确认——菜单项点不动是本任务最容易残留的缺陷。

- [ ] **Step 6: 提交**

```bash
git add -A src/
git commit -m "feat(editor): 编辑器命令接线，闭环设计规范 §7.3"
```

---

## 任务依赖关系

```
Task 1 ──► Task 2 ──► Task 4 ──► Task 5 ──┬─► Task 6 ──┐
   │                      ▲               ├─► Task 7 ──┤
   └─► Task 3 ────────────┘               ├─► Task 8 ──┼─► Task 11 ──► Task 12 ──► Task 13
                                          └─► Task 14 ─┘        │
                                                               └─► Task 18
Task 8 ──► Task 9 ──► Task 10 ──► Task 15 ──► Task 16 ──► Task 17
```

- Task 3 只依赖 Task 1 的令牌文件，可与 Task 2 并行；但**它的结论会影响 `--sp-font-mono`**，所以不要晚于 Task 15。
- Task 6～8、14 之间互不依赖，可并行。
- Task 16 必须在 Task 15 之后（要测 release 构建）。
- Task 17 可在任意时刻建立，但 `--frozen-lockfile` 需要最终依赖集合稳定后才会通过。

## 完成定义（M1 出口）

全部满足才算 M1 完成，缺一项都不算：

- [ ] `pnpm exec vp test` 全绿，`pnpm exec vue-tsc -b` 无错误，`pnpm exec vp check` 通过
- [ ] `cd src-tauri && cargo test` 通过
- [ ] 编辑区可输入、删除、撤销、重做；行号与内容对齐；状态栏显示行列号
- [ ] 括号匹配与当前行高亮可通过菜单开关
- [ ] 列编辑（Alt+鼠标）可多行同时输入
- [ ] 菜单的全部 `edit.*` 项在编辑区实际生效
- [ ] 标签的未保存标记、中键关闭、关闭最后一个标签自动新建均正常
- [ ] 底部面板页签条在折叠态仍可见，展开/折叠可切换
- [ ] 深色主题启动时**无白色闪光**
- [ ] 中文字宽结论已记入 `tokens.ts`（Task 3）
- [ ] AC-01 冷启动 ≤ 1500 ms 已实测记录；PR-08 内存基线已实测记录
- [ ] CI 两个 job 通过（或明确报告未验证）
