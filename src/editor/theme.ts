import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { tokensToEditorTheme } from "../design/derive";
import type { ThemeTokens } from "../design/tokens";

/** 令牌 → CodeMirror 主题扩展 */
export function createEditorTheme(tokens: ThemeTokens): Extension {
  return EditorView.theme(
    {
      ...tokensToEditorTheme(tokens),
      // §7.2：覆盖 CodeMirror 基座的 1px 点状轮廓；偏移 -2px 让描边画在编辑区内部
      "&.cm-focused": {
        outline: `2px solid ${tokens.color.focusRing}`,
        outlineOffset: "-2px",
      },
    },
    { dark: tokens.name === "dark" },
  );
}
