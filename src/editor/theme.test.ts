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

describe("编辑器主题", () => {
  it("注入的样式含浅色令牌的正文色；热替换到深色后含深色令牌的正文色", () => {
    const compartment = new Compartment();
    const view = mountView(compartment);
    try {
      // 正文色用 --sp-editor-text：浅深两套取值不同（#1f1f1f / #e6e6e6），能区分「注入的是哪一套」
      expect(injectedCss()).toContain(LIGHT_TOKENS.color.editorText);
      expect(LIGHT_TOKENS.color.editorText).not.toBe(DARK_TOKENS.color.editorText);

      view.dispatch({ effects: compartment.reconfigure(createEditorTheme(DARK_TOKENS)) });
      expect(injectedCss()).toContain(DARK_TOKENS.color.editorText);
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
});
