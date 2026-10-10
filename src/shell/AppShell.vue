<script setup lang="ts">
import { ref } from "vue";
import StatusBar from "./StatusBar.vue";

const dockCollapsed = ref(true);
</script>

<template>
  <div class="shell">
    <div class="region menu" data-region="menu" />
    <div class="region toolbar" data-region="toolbar" />
    <div class="region tabs" data-region="tabs" />
    <div class="region editor" data-region="editor"><slot /></div>
    <div class="region dock" data-region="dock" :data-collapsed="String(dockCollapsed)" />
    <div class="region status" data-region="status">
      <!-- 占位值：真实行列号由 Task 8（EditorHost 上报）/ Task 11（AppShell 接线）补上。
           line/column 必须用绑定（数字字面量），静态属性是字符串，vue-tsc 会报 TS2322 -->
      <StatusBar :line="1" :column="1" language="纯文本" encoding="UTF-8" eol="CRLF" />
    </div>
  </div>
</template>

<style scoped>
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
.menu {
  height: var(--sp-menu-h);
  border-bottom: 1px solid var(--sp-border);
}
.toolbar {
  height: var(--sp-toolbar-h);
  border-bottom: 1px solid var(--sp-border);
}
.tabs {
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
  border-bottom: 1px solid var(--sp-border);
}
/* 编辑区必须能收缩：min-height 0 是 flex 子项可收缩的前提，
   否则 CodeMirror 长内容会把骨架撑破 */
.editor {
  flex: 1;
  min-height: 0;
  background: var(--sp-bg-surface);
}
.dock {
  height: var(--sp-tab-h);
  background: var(--sp-bg-tabstrip);
  border-top: 1px solid var(--sp-border);
}
.dock[data-collapsed="false"] {
  height: calc(var(--sp-tab-h) + var(--sp-dock-h));
}
.status {
  height: var(--sp-status-h);
  background: var(--sp-bg-status);
  border-top: 1px solid var(--sp-border);
}
</style>
