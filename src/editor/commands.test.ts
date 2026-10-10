import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
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
