<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { type MenuItem, type TopLevelMenu, V1_0_TOP_LEVEL } from "../menu/model";

/** V1.0 只渲染本期菜单，预留项不在界面上出现 */
const menus = V1_0_TOP_LEVEL;

const bar = ref<HTMLElement | null>(null);
const openIndex = ref<number | null>(null);
/** 漫游 tabindex：菜单栏整条只是一个 Tab 站，落点是哪一项由它决定（设计规范 §7.2） */
const focusIndex = ref(0);

/** 下拉同样只渲染本期项：设计规范 §6.6 要求新增菜单项在既有容器内完成，V1.0 不预先显示它们 */
const itemsOf = (menu: TopLevelMenu) => menu.items.filter((i) => i.version === "V1.0");

const emit = defineEmits<{ run: [command: string]; dismiss: [] }>();

const topEls = () => [...(bar.value?.querySelectorAll<HTMLElement>(".top") ?? [])];
/** 同时只有一个下拉在 DOM 里；分隔线不是 .item，所以这样取到的正好是可聚焦项 */
const itemEls = () => [...(bar.value?.querySelectorAll<HTMLElement>(".item") ?? [])];
const focused = () => document.activeElement as HTMLElement | null;
const inBar = (el: HTMLElement | null) => !!el && !!bar.value?.contains(el);

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i;
}
/** Windows 惯例：已有菜单打开时，悬停另一个顶层直接切换 */
function hover(i: number) {
  if (openIndex.value !== null) openIndex.value = i;
}
function run(item?: MenuItem) {
  if (!item || item.separator || !item.command) return;
  emit("run", item.command);
  openIndex.value = null;
  // 下拉项随菜单一起消失，焦点不收回来就会掉到 body，漫游 tabindex 的 Tab 站跟着丢
  topEls()[focusIndex.value]?.focus();
}
function onKeydown(e: KeyboardEvent) {
  const key = e.key;
  const at = focused();

  if (key === "Escape") {
    // 只有菜单真的开着才收焦点：Esc 在别处按下时不该被菜单栏抢走
    if (openIndex.value === null) return;
    openIndex.value = null;
    // 还焦编辑区由 AppShell 负责，MenuBar 不碰编辑区的 DOM
    emit("dismiss");
    return;
  }

  if (!e.ctrlKey && !e.shiftKey && !e.metaKey) {
    if (key === "Alt") {
      e.preventDefault();
      topEls()[focusIndex.value]?.focus();
      return;
    }
    // Alt+助记符直接开对应菜单
    if (e.altKey) {
      const i = menus.findIndex((m) => m.mnemonic === key.toLowerCase());
      if (i >= 0) {
        e.preventDefault();
        openIndex.value = i;
        focusIndex.value = i;
        // 只开下拉不挪焦点＝半开态：接下来 Enter/↓ 落回编辑区，Alt+F 后按 Enter 不会执行「新建」（§7.2）
        topEls()[focusIndex.value]?.focus();
      }
      return;
    }
  }

  // 组合键留给编辑器（§7.3：两张表键位不重叠）——Shift/Ctrl/Meta+方向键不归菜单
  if (e.ctrlKey || e.shiftKey || e.metaKey) return;

  const open = openIndex.value;
  // ←/→ 只在菜单栏有焦点或有菜单开着时接管，否则会吞掉编辑区的方向键
  if ((key === "ArrowLeft" || key === "ArrowRight") && (open !== null || inBar(at))) {
    e.preventDefault();
    const step = key === "ArrowRight" ? 1 : -1;
    focusIndex.value = (focusIndex.value + step + menus.length) % menus.length;
    topEls()[focusIndex.value]?.focus();
    // Windows 惯例：菜单开着时切顶层直接换菜单
    if (open !== null) openIndex.value = focusIndex.value;
    return;
  }

  if (key === "ArrowDown" || key === "ArrowUp") {
    if (open === null) return;
    e.preventDefault();
    const els = itemEls();
    const down = key === "ArrowDown";
    const from = at ? els.indexOf(at) : -1;
    const to =
      from < 0 ? (down ? 0 : els.length - 1) : (from + (down ? 1 : -1) + els.length) % els.length;
    els[to]?.focus();
    return;
  }

  if (key === "Enter" || key === " ") {
    const ti = at ? topEls().indexOf(at) : -1;
    if (ti >= 0) {
      e.preventDefault();
      toggle(ti);
      return;
    }
    const k = at ? itemEls().indexOf(at) : -1;
    if (k >= 0 && open !== null) {
      e.preventDefault();
      run(itemsOf(menus[open]).filter((i) => !i.separator)[k]);
    }
  }
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div ref="bar" class="menubar" role="menubar">
    <div
      v-for="(menu, i) in menus"
      :key="menu.label"
      class="top"
      role="menuitem"
      aria-haspopup="menu"
      :aria-expanded="openIndex === i"
      :tabindex="focusIndex === i ? 0 : -1"
      :class="{ open: openIndex === i }"
      @click="toggle(i)"
      @focus="focusIndex = i"
      @mouseenter="hover(i)"
    >
      {{ menu.label }}
      <ul v-if="openIndex === i" class="dropdown" role="menu">
        <template v-for="(item, j) in itemsOf(menu)" :key="j">
          <li v-if="item.separator" class="sep" role="separator" @click.stop />
          <li v-else class="item" role="menuitem" tabindex="-1" @click.stop="run(item)">
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
/* ↑/↓ 走到哪一项必须看得见（§7.2 焦点环）；描边内收，免得被下拉边框裁掉 */
.item:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: -2px;
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
