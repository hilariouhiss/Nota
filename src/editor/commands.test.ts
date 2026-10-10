import { EditorSelection, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
import { executeEditorCommand, isEditorCommand } from "./commands";
import { createBaseExtensions } from "./extensions";
import { joinLineChanges } from "./join-lines";

function stateOf(doc: string) {
  return EditorState.create({
    doc,
    extensions: createBaseExtensions({ tabSize: 4, lineNumbers: true }),
  });
}

/** 多个光标（矩形选区的等价物）：只有开了 allowMultipleSelections 才留得下来 */
function multiCursor(doc: string, positions: number[]) {
  return stateOf(doc).update({
    selection: EditorSelection.create(positions.map((p) => EditorSelection.cursor(p))),
  }).state;
}

describe("编辑器命令分发", () => {
  it("未知命令返回 false，不做任何改动", () => {
    const state = stateOf("abc");
    // 直接测纯逻辑：命令表里没有的键必须被拒绝，避免静默吞掉菜单点击
    expect(executeEditorCommand(null, "nope.nothing")).toBe(false);
    expect(state.doc.toString()).toBe("abc");
  });

  it("只认命令表里的键，不认原型链上的键（toString/constructor 不是命令）", () => {
    // 用 `command in TABLE` 判定会让原型链上的键混进来：返回 true 吞掉命令却不执行
    expect(isEditorCommand("edit.undo")).toBe(true);
    expect(isEditorCommand("toString")).toBe(false);
    expect(isEditorCommand("constructor")).toBe(false);
  });
});

describe("joinLines 的多区间行为", () => {
  it("相邻区间的合并窗口重叠时只合并一次，不写坏文档", () => {
    // "aa\nbb\ncc" 上三个光标：各自的合并窗口是 [0,5) 与 [3,8)，天然重叠。
    // 把重叠的 change 一起交给 ChangeSet.of 会 flush+compose 出一份被污染的文本
    // （实测 "aa bbbb cc"）；正确结果是每行最多被合并一次：aa+bb，cc 是末行无行可合
    const state = multiCursor("aa\nbb\ncc", [0, 3, 6]);
    expect(state.selection.ranges.length).toBe(3);

    const next = state.update({ changes: joinLineChanges(state) }).state;
    expect(next.doc.toString()).toBe("aa bb\ncc");
  });

  it("不重叠的多区间各合并一次", () => {
    // 中间隔一行，两个窗口 [0,5) 与 [9,14) 不相交，都要生效
    const state = multiCursor("aa\nbb\ncc\ndd\nee", [0, 9]);
    const next = state.update({ changes: joinLineChanges(state) }).state;
    expect(next.doc.toString()).toBe("aa bb\ncc\ndd ee");
  });

  it("末行光标没有下一行可合并，返回空（不吞按键）", () => {
    const state = multiCursor("aa\nbb", [3]);
    expect(joinLineChanges(state)).toEqual([]);
  });
});
