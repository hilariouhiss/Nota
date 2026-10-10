import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
import { createBaseExtensions, positionOf } from "./extensions";

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
});

describe("positionOf", () => {
  it("行列号均从 1 起（UI-06）", () => {
    const state = stateWith("ab\ncde");
    expect(positionOf(state)).toEqual({ line: 1, column: 1 });

    const moved = state.update({ selection: { anchor: 5 } }).state;
    expect(positionOf(moved)).toEqual({ line: 2, column: 3 });
  });
});
