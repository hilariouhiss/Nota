<script setup lang="ts">
defineProps<{
  tabs: { id: string; title: string; dirty: boolean }[];
  activeId: string;
}>();

const emit = defineEmits<{ select: [id: string]; close: [id: string] }>();

/** 中键关闭：Windows 惯例，无需精确点到关闭按钮 */
function onAuxClick(e: MouseEvent, id: string) {
  if (e.button === 1) {
    e.preventDefault();
    emit("close", id);
  }
}
</script>

<template>
  <div class="tabbar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="tab"
      :class="{ active: tab.id === activeId }"
      @click="emit('select', tab.id)"
      @auxclick="onAuxClick($event, tab.id)"
    >
      <span class="title">{{ tab.title }}</span>
      <!-- 未保存时用圆点：状态可见优先于界面简洁 -->
      <span v-if="tab.dirty" class="dot" aria-label="未保存" />
      <span v-else class="close" aria-label="关闭" @click.stop="emit('close', tab.id)">×</span>
    </button>
  </div>
</template>

<style scoped>
.tabbar {
  display: flex;
  /* 填满区域内容盒即可（R22）：外层 [data-region="tabs"] 已按令牌给出 26px border-box
     高度（含 1px 底部分隔线，内容盒 25px），此处再声明 --sp-tab-h 会溢出 1px 并盖住分隔线 */
  height: 100%;
  background: var(--sp-bg-tabstrip);
  overflow-x: auto;
  scrollbar-width: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  max-width: 180px;
  padding: 0 calc(var(--sp-pad) * 0.9);
  border: 0;
  border-right: 1px solid var(--sp-border);
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
}
.tab:hover {
  background: var(--sp-bg-hover);
}
.tab.active {
  color: var(--sp-text);
  background: var(--sp-bg-surface);
  box-shadow: inset 0 2px 0 var(--sp-accent);
}
.tab:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: -2px;
}
.title {
  overflow: hidden;
  text-overflow: ellipsis;
}
.dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--sp-accent);
}
.close {
  opacity: 0.8;
}
</style>
