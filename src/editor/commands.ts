import {
  copyLineDown,
  deleteLine,
  moveLineDown,
  moveLineUp,
  redo,
  selectAll,
  undo,
} from "@codemirror/commands";
import type { Command, EditorView } from "@codemirror/view";
import { joinLines } from "./join-lines";

/**
 * 剪切/复制（FR-12）：走 CodeMirror 自己的剪贴板路径。`document.execCommand("copy"/"cut")` 会触发
 * CM 注册在编辑区上的 copy/cut 事件处理器，选区文本与多区间都由它正确处理（自己拼剪贴板文本会漏掉
 * 行尾样式与多光标）。jsdom 里没有 execCommand，返回 false 表示环境不支持——不抛错、也不改文档。
 */
function clipboard(kind: "copy" | "cut"): Command {
  return (view) => {
    view.focus();
    if (typeof document.execCommand !== "function") return false;
    // 返回值不可靠（部分浏览器恒为 false）：命令已被消费，只要没抛错就算处理了
    document.execCommand(kind);
    return true;
  };
}

/**
 * 粘贴（FR-12）：异步读系统剪贴板，插入到当前选区并移动光标。
 * jsdom 里没有 `navigator.clipboard`，返回 false 安全降级（不得抛错）。
 */
const paste: Command = (view) => {
  if (typeof navigator.clipboard?.readText !== "function") return false;
  view.focus();
  navigator.clipboard
    .readText()
    .then((text) => {
      // 读到之后才用当时的选区：用户可能已经挪了光标
      if (text) view.dispatch(view.state.replaceSelection(text));
    })
    .catch(() => {
      // 剪贴板权限被拒（NotAllowedError）时静默：读不到剪贴板不该炸掉界面
    });
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
  "edit.cut": clipboard("cut"),
  "edit.copy": clipboard("copy"),
  "edit.paste": paste,
  "edit.deleteLine": deleteLine,
  "edit.copyLine": copyLineDown,
  "edit.moveLineUp": moveLineUp,
  "edit.moveLineDown": moveLineDown,
  "edit.joinLines": joinLines,
  "edit.selectAll": selectAll,
};

/**
 * 命令表查询。不能用 `command in TABLE`，也不能只判断 `typeof TABLE[command] === "function"`：
 * 原型链上的键（"toString"、"constructor"）两种写法都会放行——isEditorCommand 于是返回 true
 * 把菜单命令吞掉，executeEditorCommand 却拿到 Object.prototype 上的函数、调用结果毫无意义。
 * 只有 `Object.hasOwn` 才是「这张表里真有这条命令」。
 */
function lookup(command: string): ((view: EditorView) => boolean) | undefined {
  return Object.hasOwn(TABLE, command) ? TABLE[command] : undefined;
}

/** 返回是否已处理。未收录的命令返回 false，由调用方决定后续行为 */
export function executeEditorCommand(view: EditorView | null, command: string): boolean {
  const fn = lookup(command);
  if (!fn || !view) return false;
  view.focus();
  return fn(view);
}

export function isEditorCommand(command: string): boolean {
  return !!lookup(command);
}
