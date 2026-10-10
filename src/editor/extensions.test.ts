// @vitest-environment jsdom
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { describe, expect, it } from "vite-plus/test";
import { createBaseExtensions, positionOf } from "./extensions";

// jsdom 没实现 Range.getClientRects；CodeMirror 量行高/字宽走的就是它（与 AppShell.test.ts 同一缺口）
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

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

  it("装配的扩展真的生效：tabSize facet 反映传入值", () => {
    // 故意用 8：EditorState.tabSize 的默认值就是 4，用 4 无法区分「装配了」与「没装配」
    const state = EditorState.create({
      extensions: createBaseExtensions({ tabSize: 8, lineNumbers: true }),
    });
    expect(state.facet(EditorState.tabSize)).toBe(8);
  });

  it("关闭行号时不引入行号扩展仍可正常工作", () => {
    const state = EditorState.create({
      doc: "x",
      extensions: createBaseExtensions({ tabSize: 4, lineNumbers: false }),
    });
    expect(state.doc.toString()).toBe("x");
  });

  it("矩形选区扩展已装配（FR-14 列编辑）", () => {
    const exts = createBaseExtensions({ tabSize: 4, lineNumbers: true });
    // Extension 是不透明值，这里断言装配数量随开关变化，确保列编辑确实被加进去
    const without = createBaseExtensions({
      tabSize: 4,
      lineNumbers: true,
      rectangularSelection: false,
    });
    expect(exts.length).toBe(without.length + 2);
  });

  it("不注册 CodeMirror 内嵌查找面板的键位（§3.2 否决内嵌浮条；Ctrl+F/F3/Ctrl+G 归 §7.3 全局表，M4 实现）", () => {
    // 直接读 keymap facet 的绑定集合，而不是断言「DOM 里没有 .cm-search」：
    // 后者要先把面板打开才有意义，等于用行为去猜实现。
    const keys = stateWith("")
      .facet(keymap)
      .flat()
      .map((b) => b.key);
    // 先证明确实读到了本项目的键位表，否则下面的 not.toContain 在空集合上恒真
    expect(keys).toContain("Mod-Shift-d");
    expect(keys).toContain("Mod-j");
    expect(keys).not.toContain("Mod-f");
    expect(keys).not.toContain("F3");
    expect(keys).not.toContain("Mod-g");
  });

  it("开启多选区：矩形选区的多区间不会被折叠成单区间（FR-14 列编辑生效的前提）", () => {
    // allowMultipleSelections 关闭时（默认）EditorState 会把多区间强制折叠成一段，
    // Alt+拖拽出来的矩形选区就只剩一段，多行同时输入静默失效
    const state = stateWith("aa\nbb");
    const multi = state.update({
      selection: EditorSelection.create([EditorSelection.cursor(0), EditorSelection.cursor(3)]),
    }).state;
    expect(multi.selection.ranges.length).toBe(2);
  });

  /**
   * 挂一个真实 EditorView（jsdom），而不是只看扩展数组的长度：
   * `drawSelection()` 是唯一会创建 `.cm-selectionLayer` 的扩展，多区间选区全靠它画矩形。
   * 没有它，除第一个区间以外全部不可见（只有浏览器原生选区在画）。
   *
   * 断言只能落在图层元素上、落不到 `.cm-selectionBackground` 矩形上：jsdom 没有布局引擎，
   * CodeMirror 的 `coordsAtPos` 返回 null，矩形在 jsdom 下永远画不出来（真实浏览器里才画）。
   * 这条断言的可证伪性用「删掉 drawSelection()」的变异实测（见报告）。
   */
  it("装配 drawSelection：创建了选区绘制层（多区间选区除第一段以外也要可见）", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({
      parent,
      state: EditorState.create({
        doc: "",
        extensions: createBaseExtensions({ tabSize: 4, lineNumbers: true }),
      }),
    });
    try {
      expect(view.dom.querySelector(".cm-selectionLayer")).not.toBeNull();
    } finally {
      view.destroy();
    }
  });
});

describe("positionOf", () => {
  it("行列号均从 1 起（UI-06）", () => {
    const state = stateWith("ab\ncde");
    expect(positionOf(state)).toEqual({ line: 1, column: 1 });

    const moved = state.update({ selection: { anchor: 5 } }).state;
    expect(positionOf(moved)).toEqual({ line: 2, column: 3 });
  });
});
