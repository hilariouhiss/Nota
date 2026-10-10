<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { MENU_MODEL, type MenuItem, type TopLevelMenu } from "../menu/model";

const openIndex = ref<number | null>(null);

/** V1.0 只渲染本期菜单，预留项不在界面上出现 */
const menus = computed(() => MENU_MODEL.filter((m) => m.version === "V1.0"));

/** 下拉同样只渲染本期项：设计规范 §6.6 要求新增菜单项在既有容器内完成，V1.0 不预先显示它们 */
const itemsOf = (menu: TopLevelMenu) => menu.items.filter((i) => i.version === "V1.0");

const emit = defineEmits<{ run: [command: string] }>();

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i;
}
/** Windows 惯例：已有菜单打开时，悬停另一个顶层直接切换 */
function hover(i: number) {
  if (openIndex.value !== null) openIndex.value = i;
}
function run(item: MenuItem) {
  if (item.separator || !item.command) return;
  emit("run", item.command);
  openIndex.value = null;
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") openIndex.value = null;
  // Alt 聚焦菜单栏；Alt+助记符直接打开对应菜单
  if (e.altKey && !e.ctrlKey) {
    const i = menus.value.findIndex((m) => m.mnemonic === e.key.toLowerCase());
    if (i >= 0) {
      e.preventDefault();
      openIndex.value = i;
    }
  }
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div class="menubar">
    <div
      v-for="(menu, i) in menus"
      :key="menu.label"
      class="top"
      :class="{ open: openIndex === i }"
      @click="toggle(i)"
      @mouseenter="hover(i)"
    >
      {{ menu.label }}
      <ul v-if="openIndex === i" class="dropdown">
        <template v-for="(item, j) in itemsOf(menu)" :key="j">
          <li v-if="item.separator" class="sep" />
          <li v-else class="item" @click.stop="run(item)">
            <span>{{ item.label }}</span>
            <span v-if="item.accelerator" class="accel">{{ item.accelerator }}</span>
          </li>
        </template>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.menubar {
  display: flex;
  align-items: center;
  /* 区域 div 已按 --sp-menu-h 给出 border-box 高度（含 1px 分隔线），这里再声明 24px 会溢出 1px 并盖住分隔线 */
  height: 100%;
  padding: 0 var(--sp-pad);
  gap: calc(var(--sp-pad) * 1.15);
}
.top {
  position: relative;
  cursor: default;
  user-select: none;
}
.top.open {
  color: var(--sp-accent);
}
.top:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: 1px;
}
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 20;
  min-width: 180px;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--sp-bg-chrome);
  border: 1px solid var(--sp-border);
  border-radius: var(--sp-radius);
  box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
}
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 3px calc(var(--sp-pad) * 1.2);
  white-space: nowrap;
}
.item:hover {
  background: var(--sp-bg-hover);
}
.accel {
  color: var(--sp-text-dim);
  font-size: var(--sp-font-size-status);
}
.sep {
  height: 1px;
  margin: 4px 0;
  background: var(--sp-border);
}
</style>
