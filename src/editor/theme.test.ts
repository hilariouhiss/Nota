// @vitest-environment jsdom
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { describe, expect, it } from "vite-plus/test";
import { DARK_TOKENS, LIGHT_TOKENS } from "../design/tokens";
import { createEditorTheme } from "./theme";

// jsdom 没实现 Range.getClientRects。文档为空时 CodeMirror 量不出行宽，会塞一个 dummy 行量文字宽度，
// 走的正是这个方法——抛出的未捕获异常会让测试进程以非 0 退出（与 AppShell.test.ts 同一处 polyfill）。
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

/** style-mod 把主题样式注入 <head> 的 <style> 里；读回全部文本，断言的就是真正生效的那份 CSS */
const injectedCss = () =>
  [...document.head.querySelectorAll("style")].map((s) => s.textContent ?? "").join("\n");

/**
 * 只认「正文色声明本身」：声明名左边必须是行首/`{`/`;`/空白，右边必须是 `;`/`}`/结尾。
 * 单纯的子串匹配证明不了什么——正文色与光标色按设计同值（editorCaret === editorText），
 * 子串会被 caret-color / border-left-color 蒙对（把 derive.ts 的 color 改成常量也照样绿）。
 */
const hasDecl = (css: string, value: string) =>
  new RegExp(`(^|[;{\\s])color:\\s*${value}\\s*(;|}|$)`, "i").test(css);

/** 真挂一个 EditorView：主题模块只在被某个视图用到时才由 style-mod 注入，光调 createEditorTheme 什么也证明不了 */
function mountView(compartment: Compartment, theme = createEditorTheme(LIGHT_TOKENS)) {
  const parent = document.createElement("div");
  document.body.append(parent);
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: "abc",
      extensions: [compartment.of(theme)],
    }),
  });
  return view;
}

/** 注入的样式文本是一串平铺规则；按 `}` 切开、再按第一个 `{` 分成选择器与声明 */
const cssRules = (css: string) =>
  css
    .split("}")
    .map((chunk) => {
      const at = chunk.indexOf("{");
      return at < 0 ? null : { sel: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) };
    })
    .filter((r) => r !== null);

const FOCUSED_TAIL = "> .cm-scroller > .cm-selectionLayer .cm-selectionBackground";
const ACTIVE_GUTTER = ".cm-activeLineGutter";

describe("编辑器主题", () => {
  it("注入的样式含浅色令牌的正文色声明；热替换到深色后含深色令牌的正文色声明", () => {
    const compartment = new Compartment();
    const view = mountView(compartment);
    try {
      // 正文色用 --sp-editor-text：浅深两套取值不同（#1f1f1f / #e6e6e6），能区分「注入的是哪一套」
      expect(hasDecl(injectedCss(), LIGHT_TOKENS.color.editorText)).toBe(true);
      expect(LIGHT_TOKENS.color.editorText).not.toBe(DARK_TOKENS.color.editorText);

      view.dispatch({ effects: compartment.reconfigure(createEditorTheme(DARK_TOKENS)) });
      expect(hasDecl(injectedCss(), DARK_TOKENS.color.editorText)).toBe(true);
    } finally {
      view.destroy();
    }
  });

  it("Compartment 能在两套主题间热替换而不重建状态", () => {
    const compartment = new Compartment();
    const state = EditorState.create({
      doc: "abc",
      extensions: [compartment.of(createEditorTheme(LIGHT_TOKENS))],
    });
    const next = state.update({
      effects: compartment.reconfigure(createEditorTheme(DARK_TOKENS)),
    }).state;
    expect(next.doc.toString()).toBe("abc");
  });

  /**
   * 顺序守卫。压过基座靠的是「选择器与基座同特异性 + 注入的 CSS 里排得更后」：
   * 基座聚焦态选区是 `.<基座浅色ID>.cm-focused > .cm-scroller > .cm-selectionLayer
   * .cm-selectionBackground`（浅 #d7d4f0／深 #233），行号槽是 `.<基座浅色ID> .cm-activeLineGutter`
   * （浅 #e2f2ff／深 #222227）——两条都是模块级注入，先于任何 `EditorView.theme` 的模块。
   * 只断言主题对象（derive.test.ts）证明不了这件事：把聚焦那条写成 `&.cm-selectionBackground`
   * （丢掉 `> .cm-scroller > .cm-selectionLayer`）会让聚焦态静默退回基座的 #d7d4f0，
   * 而对象断言照样全绿。这里读回真正注入的 CSS，按文档顺序确认项目那两条都在基座之后。
   */
  it.each([
    ["浅色", LIGHT_TOKENS, "#d7d4f0", "#2f6fd0", "22%", "#e2f2ff"],
    ["深色", DARK_TOKENS, "#233", "#6ea8fe", "28%", "#222227"],
  ] as const)(
    "%s主题：聚焦态选区与行号槽的项目规则都排在基座之后",
    (_name, tokens, baseSelection, accent, pct, baseGutter) => {
      const view = mountView(new Compartment(), createEditorTheme(tokens));
      try {
        const rules = cssRules(injectedCss());

        // 先证明基座那两条确实在，否则「排在之后」没有意义
        const baseSelectionAt = rules.findIndex(
          (r) => r.sel.endsWith(FOCUSED_TAIL) && r.body.includes(baseSelection),
        );
        const baseGutterAt = rules.findIndex(
          (r) => r.sel.endsWith(ACTIVE_GUTTER) && r.body.includes(baseGutter),
        );
        expect(
          baseSelectionAt,
          `注入的 CSS 里找不到基座的 ${baseSelection}`,
        ).toBeGreaterThanOrEqual(0);
        expect(baseGutterAt, `注入的 CSS 里找不到基座的 ${baseGutter}`).toBeGreaterThanOrEqual(0);

        // 项目那条聚焦态选区规则：同选择器形状（因此同特异性）、由 accent 派生、排在基座之后
        const selectionAt = rules.findIndex(
          (r) =>
            r.sel.endsWith(FOCUSED_TAIL) &&
            r.body.includes(accent) &&
            r.body.includes(`${pct}, transparent`),
        );
        expect(selectionAt, "项目主题缺少那条聚焦态选区规则").toBeGreaterThan(baseSelectionAt);

        // 行号槽同理由同一条性质保护：基座那格不给令牌留口子，只能靠顺序压过
        const gutterAt = rules.findIndex(
          (r) =>
            r.sel.endsWith(ACTIVE_GUTTER) && r.body.includes("color-mix") && r.body.includes("45%"),
        );
        expect(gutterAt, "项目主题缺少行号槽当前行底色规则").toBeGreaterThan(baseGutterAt);
      } finally {
        view.destroy();
      }
    },
  );
});
