<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(defineProps<{ collapsed: boolean; activeTab?: string }>(), {
  activeTab: "find-replace",
});

const emit = defineEmits<{
  "update:activeTab": [tab: string];
  toggle: [];
  close: [];
}>();

const tabs = [
  { id: "find-replace", label: "查找 / 替换" },
  { id: "search-in-files", label: "在文件中查找" },
] as const;

const current = ref<string>(props.activeTab);
function select(id: string) {
  current.value = id;
  emit("update:activeTab", id);
}
</script>

<template>
  <!-- 折叠态只留页签条：26px 的高度本身就在说明"面板还在" -->
  <div class="dock" :data-collapsed="String(collapsed)">
    <div class="dock-tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="dt"
        :class="{ on: current === t.id }"
        @click="select(t.id)"
      >
        {{ t.label }}
      </button>
      <span class="grow" />
      <button type="button" class="cl" aria-label="折叠面板" @click="emit('close')">×</button>
    </div>
    <div v-if="!collapsed" class="dock-body">
      <slot :name="current" />
    </div>
  </div>
</template>

<style scoped>
/* 不画 border-top：区域 div 已有那条分隔线，这里再画就是重复的一条
   高度也由区域 div 给（折叠 --sp-tab-h／展开 + --sp-dock-h），本组件只在其中分配 */
.dock {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--sp-bg-chrome);
}
.dock-tabs {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-height: 0;
  background: var(--sp-bg-tabstrip);
}
.dt {
  height: 100%;
  padding: 0 calc(var(--sp-pad) * 1.1);
  border: 0;
  border-right: 1px solid var(--sp-border);
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
}
.dt.on {
  color: var(--sp-text);
  background: var(--sp-bg-chrome);
  box-shadow: inset 0 2px 0 var(--sp-accent);
}
.dt:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: -2px;
}
.grow {
  flex: 1;
}
.cl {
  padding: 0 calc(var(--sp-pad) * 1.1);
  border: 0;
  font: inherit;
  color: var(--sp-text-dim);
  background: transparent;
  cursor: pointer;
}
.dock-body {
  flex: 0 0 var(--sp-dock-h);
  padding: calc(var(--sp-pad) * 0.9) var(--sp-pad);
  border-top: 1px solid var(--sp-border);
  overflow: auto;
}
</style>
