import {
  copyLineDown,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
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
import { joinLines } from "./join-lines";

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
    // 不开这个 facet，EditorState 会把多区间折叠成一段：Alt+拖拽出来的矩形选区就只剩一段，
    // FR-14 的「列编辑多行同时输入」静默失效
    EditorState.allowMultipleSelections.of(true),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      // 刻意不注册 @codemirror/search 的 searchKeymap：它把 Ctrl+F/F3/Ctrl+G 接到 CodeMirror
      // 自带的英文内嵌浮条上，而规范 §3.2 明确不采用「编辑区内嵌浮条」，Ctrl+F 属 §7.3 全局表
      // （打开底部面板的查找框，归 M4）。依赖保留，M4 直接用它的命令函数，只是不走这套键位。
      indentWithTab,
      // §7.3 编辑器内表里，defaultKeymap/historyKeymap 没有的两条（Mod = Windows 的 Ctrl）：
      // 复制行、合并行。放数组末尾：前面的标准键位优先，冲突时仍按 CodeMirror 的默认行为走
      { key: "Mod-Shift-d", run: copyLineDown },
      { key: "Mod-j", run: joinLines },
    ]),
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
