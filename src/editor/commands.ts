import {
  copyLineDown,
  deleteLine,
  moveLineDown,
  moveLineUp,
  redo,
  selectAll,
  undo,
} from "@codemirror/commands";
import type { ChangeSpec } from "@codemirror/state";
import type { Command, EditorView } from "@codemirror/view";

/**
 * 合并行（FR-13，Ctrl+J）。@codemirror/commands 没有现成的对应命令，只能自己写：
 * 换行连同后续行的缩进一起换成一个空格——Notepad++ 的 Ctrl+J 与 VS Code 的 Join Lines
 * 都是这个行为（npp-user-manual.org/docs/editing）。无选中时合并当前行与下一行，
 * 选中多行时把它们合并成一行。
 */
const joinLines: Command = (view) => {
  const { state } = view;
  const changes: ChangeSpec[] = [];
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from);
    let lastNo = state.doc.lineAt(range.to).number;
    // 选中范围的终点正好落在某行行首时，那一行其实没被选中，别把它的内容也合进来
    if (lastNo > first.number && state.doc.line(lastNo).from === range.to) lastNo--;
    if (lastNo === first.number) lastNo++; // 光标或单行选中：连同下一行一起合并
    if (lastNo > state.doc.lines) continue; // 末行后面没有行可合并

    const last = state.doc.line(lastNo);
    changes.push({
      from: first.from,
      to: last.to,
      insert: state.sliceDoc(first.from, last.to).replace(/\n\s*/g, " ").trimEnd(),
    });
  }
  if (!changes.length) return false;
  view.dispatch({ changes });
  return true;
};

/**
 * command 字符串 → CodeMirror 命令。
 * 只收录设计规范 §7.3「编辑器内表」的命令；全局表（Ctrl+N/O/S/W、
 * Ctrl+F/H 等）由 AppShell 处理，两张表键位不重叠，不需要优先级仲裁。
 */
const TABLE: Record<string, (view: EditorView) => boolean> = {
  "edit.undo": undo,
  "edit.redo": redo,
  "edit.selectAll": selectAll,
  "edit.deleteLine": deleteLine,
  "edit.copyLine": copyLineDown,
  "edit.moveLineUp": moveLineUp,
  "edit.moveLineDown": moveLineDown,
  "edit.joinLines": joinLines,
};

/** 返回是否已处理。未收录的命令返回 false，由调用方决定后续行为 */
export function executeEditorCommand(view: EditorView | null, command: string): boolean {
  const fn = TABLE[command];
  if (!fn || !view) return false;
  view.focus();
  return fn(view);
}

export function isEditorCommand(command: string): boolean {
  return command in TABLE;
}
