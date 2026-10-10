<script setup lang="ts">
import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTokens } from "../design/apply";
import { executeEditorCommand } from "./commands";
import { createBaseExtensions, positionOf } from "./extensions";
import { createEditorTheme } from "./theme";

const props = withDefaults(defineProps<{ doc?: string; docId?: string; lineNumbers?: boolean }>(), {
  doc: "",
  /** R36：文档身份。内容可能恰好相同（两个空标签），只有它也参与 watch 才认得出「换了一篇」 */
  docId: "",
  lineNumbers: true,
});

const emit = defineEmits<{
  position: [{ line: number; column: number }];
  /** 用户编辑了正文（程序化的文档替换不算，见 updateListener） */
  change: [];
}>();

const host = ref<HTMLDivElement | null>(null);
const { tokens } = useTokens();
const themeCompartment = new Compartment();
let view: EditorView | null = null;

onMounted(() => {
  if (!host.value) return;
  view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.doc,
      extensions: [
        ...createBaseExtensions({
          tabSize: tokens.value.typography.tabSize,
          lineNumbers: props.lineNumbers,
        }),
        themeCompartment.of(createEditorTheme(tokens.value)),
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) emit("position", positionOf(update.state));
          // R34：只有用户编辑才算「未保存」。程序化的文档替换（切标签）带 addToHistory=false，
          // 若不排除它，刚切到的标签会被立刻标成未保存——而用户什么都没改
          if (
            update.docChanged &&
            !update.transactions.some((tr) => tr.annotation(Transaction.addToHistory) === false)
          ) {
            emit("change");
          }
        }),
      ],
    }),
  });
  // 初始位置：不交互时状态栏也应显示「行 1，列 1」
  emit("position", positionOf(view.state));
});

// 主题变化时热替换，不重建 view：重建会丢失撤销历史与滚动位置（§4.1）
watch(
  () => tokens.value.name,
  () => view?.dispatch({ effects: themeCompartment.reconfigure(createEditorTheme(tokens.value)) }),
);

// 行数/状态由 ViewPlugin 上报，此处只处理显式传入的文档替换。
// R36：切标签改的是文档身份，内容字符串可能不变（两篇都空，或编辑区里的文本还没写回），
// 只比较 doc 会漏掉刷新，编辑区就会留下上一个标签的文本
watch([() => props.docId, () => props.doc], ([, next]) => {
  if (!view || view.state.doc.toString() === next) return;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: next },
    // R35：替换不进撤销历史，否则切到 B 标签后 Ctrl+Z 会撤出 A 标签的内容
    annotations: Transaction.addToHistory.of(false),
  });
});

// R36：切标签前由 AppShell 拉取当前编辑区内容写回活动标签（不用每击键 emit 全文）
// R38：focus 供菜单栏 Esc 后把焦点还给编辑区（§7.2）
// §7.3：run 是「编辑器内表」命令的唯一入口，AppShell 判定命中后转发到这里
defineExpose({
  getDoc: () => view?.state.doc.toString() ?? "",
  focus: () => view?.focus(),
  run: (command: string) => executeEditorCommand(view, command),
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});
</script>

<template>
  <div ref="host" class="editor-host" />
</template>

<style scoped>
.editor-host {
  height: 100%;
  overflow: hidden;
}

/* CodeMirror 基座主题不给 .cm-editor 高度，宿主必须把它撑满，
   否则长文档被 overflow:hidden 裁掉且不可滚动 */
.editor-host :deep(.cm-editor) {
  height: 100%;
}
</style>
