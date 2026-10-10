import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  EditorView,
  crosshairCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { bracketMatching } from "@codemirror/language";

export interface BaseExtensionOptions {
  tabSize: number;
  lineNumbers: boolean;
  activeLine?: boolean;
  bracketMatching?: boolean;
  rectangularSelection?: boolean;
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
  if (opts.rectangularSelection !== false) exts.push(rectangularSelection(), crosshairCursor());
  return exts;
}

/** 光标位置：行号从 1 起、列号从 1 起（UI-06 的「行 3，列 42」） */
export function positionOf(state: EditorState): { line: number; column: number } {
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  return { line: line.number, column: head - line.from + 1 };
}
