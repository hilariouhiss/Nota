import type { ChangeSpec, EditorState } from "@codemirror/state";
import type { Command } from "@codemirror/view";

/**
 * 合并行的 change 计算（FR-13，Ctrl+J）。@codemirror/commands 没有现成的对应命令，只能自己写：
 * 换行连同后续行的缩进一起换成一个空格——Notepad++ 的 Ctrl+J 与 VS Code 的 Join Lines
 * 都是这个行为（npp-user-manual.org/docs/editing）。无选中时合并当前行与下一行，
 * 选中多行时把它们合并成一行。
 */
export function joinLineChanges(state: EditorState): ChangeSpec[] {
  const changes: ChangeSpec[] = [];
  // 上一个已采纳区间的终点。多选区下相邻两段的合并窗口必然重叠（"aa\nbb\ncc" 三个光标 →
  // [0,5) 与 [3,8)），重叠的 change 交给 ChangeSet.of 会被 flush+compose 成一份被污染的文本
  // （实测 "aa bbbb cc"）。按文档序只采纳前一段、跳过与它重叠的后一段：每行最多被合并一次
  let prevTo = -1;
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from);
    let lastNo = state.doc.lineAt(range.to).number;
    // 选中范围的终点正好落在某行行首时，那一行其实没被选中，别把它的内容也合进来
    if (lastNo > first.number && state.doc.line(lastNo).from === range.to) lastNo--;
    if (lastNo === first.number) lastNo++; // 光标或单行选中：连同下一行一起合并
    if (lastNo > state.doc.lines) continue; // 末行后面没有行可合并

    const last = state.doc.line(lastNo);
    if (first.from <= prevTo) continue; // 与上一段重叠：这一段不再合并，也不推进 prevTo
    prevTo = last.to;
    changes.push({
      from: first.from,
      to: last.to,
      insert: state.sliceDoc(first.from, last.to).replace(/\n\s*/g, " ").trimEnd(),
    });
  }
  return changes;
}

/**
 * 合并行命令：§7.3 编辑器内表的两个入口共用它——`commands.ts`（菜单 `edit.joinLines`）
 * 与 `extensions.ts`（Ctrl+J 键位）。单独成文件就是为了这条共用线：放在 commands.ts 里
 * 会让 extensions.ts 反向依赖命令表。
 */
export const joinLines: Command = (view) => {
  const changes = joinLineChanges(view.state);
  if (!changes.length) return false;
  view.dispatch({ changes });
  return true;
};
