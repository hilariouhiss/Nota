<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import EditorHost from "../editor/EditorHost.vue";
import { useDocumentsStore } from "../stores/documents";
import StatusBar from "./StatusBar.vue";
import TabBar from "./TabBar.vue";

const store = useDocumentsStore();
const dockCollapsed = ref(true);
const line = ref(1);
const column = ref(1);

// §3.4：启动无可恢复文件时直接创建「未命名 1」空标签，不做欢迎页
onMounted(() => {
  if (store.tabs.length === 0) store.newDocument();
});

const editorRef = ref<InstanceType<typeof EditorHost> | null>(null);

/** 切走之前把编辑区内容写回即将离开的标签（R36）：否则切回来后看到的还是上一个标签的文本 */
function persistTab(id: string | null) {
  const tab = store.tabs.find((t) => t.id === id);
  if (tab) tab.content = editorRef.value?.getDoc() ?? tab.content;
}

// 挂在 activeId 这个唯一的切换点上，而不是 TabBar 的 select/close：新建标签、关闭最后一个标签
// 后的自动新建、将来的菜单入口/会话恢复都会改 activeId，漏掉任何一条都会丢掉那篇文档的编辑。
// flush: "sync" 让写回发生在切换的那一刻（编辑区此刻还显示着要离开的那篇），而不是等下一帧：
// 同一 tick 里若有别的写入路径改了 content（M2 读文件/还原），等一帧就会把它盖掉
watch(
  () => store.activeId,
  (_next, prev) => persistTab(prev),
  { flush: "sync" },
);

function onPosition(position: { line: number; column: number }) {
  line.value = position.line;
  column.value = position.column;
}

function onChange() {
  if (store.activeId) store.setDirty(store.activeId, true);
}
</script>

<template>
  <div class="shell">
    <div class="region" data-region="menu" />
    <div class="region" data-region="toolbar" />
    <div class="region" data-region="tabs">
      <TabBar
        :tabs="store.tabs"
        :active-id="store.activeId ?? ''"
        @select="store.selectDocument"
        @close="store.closeDocument"
      />
    </div>
    <div class="region" data-region="editor">
      <EditorHost
        ref="editorRef"
        :doc="store.activeTab?.content ?? ''"
        :doc-id="store.activeId ?? ''"
        @position="onPosition"
        @change="onChange"
      />
    </div>
    <div class="region" data-region="dock" :data-collapsed="String(dockCollapsed)" />
    <div class="region" data-region="status">
      <StatusBar :line="line" :column="column" language="纯文本" encoding="UTF-8" eol="CRLF" />
    </div>
  </div>
</template>

<style scoped>
/* 区域样式一律用 [data-region="..."] 属性选择器，不用类选择器：
   Vue 的 scoped CSS 会把父组件的 scope 属性也加到子组件根元素上，
   若父组件用类选择器（如 .status）而子组件根元素恰好同名（StatusBar 根就是 .status），
   两条规则特异性相同且父组件的样式后注入 → 父组件的 height/border 会悄悄覆盖子组件自己的样式。
   子组件根元素不带 data-region，属性选择器天然不会泄漏。 */
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  font-family: var(--sp-font-ui);
  font-size: var(--sp-font-size-ui);
  color: var(--sp-text);
  background: var(--sp-bg-chrome);
}
.region {
  flex-shrink: 0;
}
[data-region="menu"] {
  height: var(--sp-menu-h);
  border-bottom: 1px solid var(--sp-border);
}
[data-region="toolbar"] {
  height: var(--sp-toolbar-h);
  border-bottom: 1px solid var(--sp-border);
}
[data-region="tabs"] {
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
  border-bottom: 1px solid var(--sp-border);
}
/* 编辑区必须能收缩：min-height 0 是 flex 子项可收缩的前提，
   否则 CodeMirror 长内容会把骨架撑破 */
[data-region="editor"] {
  flex: 1;
  min-height: 0;
  background: var(--sp-bg-surface);
}
[data-region="dock"] {
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
  border-top: 1px solid var(--sp-border);
}
[data-region="dock"][data-collapsed="false"] {
  height: calc(var(--sp-tab-h) + var(--sp-dock-h));
}
[data-region="status"] {
  height: var(--sp-status-h);
  background: var(--sp-bg-status);
  border-top: 1px solid var(--sp-border);
}
</style>
