<script setup lang="ts">
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTokens } from "../design/apply";
import { createBaseExtensions, positionOf } from "./extensions";

const props = withDefaults(defineProps<{ doc?: string; lineNumbers?: boolean }>(), {
  doc: "",
  lineNumbers: true,
});

const emit = defineEmits<{ position: [{ line: number; column: number }] }>();

const host = ref<HTMLDivElement | null>(null);
const { tokens } = useTokens();
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
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) emit("position", positionOf(update.state));
        }),
      ],
    }),
  });
  // 初始位置：不交互时状态栏也应显示「行 1，列 1」
  emit("position", positionOf(view.state));
});

// 行数/状态由 ViewPlugin 上报，此处只处理显式传入的文档替换
watch(
  () => props.doc,
  (next) => {
    if (!view || view.state.doc.toString() === next) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } });
  },
);

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
</style>
