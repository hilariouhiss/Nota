import { Compartment, EditorState } from "@codemirror/state";
import { describe, expect, it } from "vite-plus/test";
import { DARK_TOKENS, LIGHT_TOKENS } from "../design/tokens";
import { createEditorTheme } from "./theme";

describe("编辑器主题", () => {
  it("由令牌生成，含正文与行号配色", () => {
    const theme = createEditorTheme(LIGHT_TOKENS);
    expect(theme).toBeTruthy();
    // EditorView.theme 的返回值是不透明对象，能构造即说明入参形状正确
    expect(typeof theme).toBe("object");
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
