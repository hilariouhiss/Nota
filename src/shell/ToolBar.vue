<script setup lang="ts">
import {
  ArrowRedo20Regular,
  ArrowSwap20Regular,
  ArrowUndo20Regular,
  DocumentAdd20Regular,
  FolderOpen20Regular,
  Save20Regular,
  Search20Regular,
  Settings20Regular,
} from "@vicons/fluent";
import { NIcon } from "naive-ui";

const props = withDefaults(defineProps<{ disabled?: string[] }>(), { disabled: () => [] });

const emit = defineEmits<{ run: [command: string] }>();

/** 图标名取自设计规范 §6.5.3；Regular 为默认，Filled 留给激活态 */
const buttons = [
  { command: "file.new", label: "新建", icon: DocumentAdd20Regular },
  { command: "file.open", label: "打开", icon: FolderOpen20Regular },
  { command: "file.save", label: "保存", icon: Save20Regular },
  { command: "edit.undo", label: "撤销", icon: ArrowUndo20Regular },
  { command: "edit.redo", label: "重做", icon: ArrowRedo20Regular },
  { command: "search.find", label: "查找", icon: Search20Regular },
  { command: "search.replace", label: "替换", icon: ArrowSwap20Regular },
  { command: "settings.open", label: "设置", icon: Settings20Regular },
] as const;

const isDisabled = (command: string) => props.disabled.includes(command);
</script>

<template>
  <div class="toolbar">
    <button
      v-for="b in buttons"
      :key="b.command"
      type="button"
      class="tb"
      :data-action="b.command"
      :title="b.label"
      :disabled="isDisabled(b.command)"
      @click="emit('run', b.command)"
    >
      <NIcon><component :is="b.icon" /></NIcon>
    </button>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  /* 区域 div 已按令牌给出 border-box 高度（含 1px 分隔线），这里只填满它（R22） */
  height: 100%;
  padding: 0 var(--sp-pad);
}
.tb {
  display: flex;
  align-items: center;
  justify-content: center;
  /* 图标尺寸由令牌驱动：n-icon 是 1em 见方，设 font-size 即设图标大小 */
  font-size: var(--sp-icon);
  width: calc(var(--sp-icon) + 7px);
  height: calc(var(--sp-toolbar-h) - 6px);
  border: 0;
  border-radius: calc(var(--sp-radius) * 0.8);
  color: var(--sp-text);
  background: transparent;
  cursor: pointer;
}
.tb:hover:not(:disabled) {
  background: var(--sp-bg-hover);
}
.tb:disabled {
  color: var(--sp-text-disabled);
  cursor: default;
}
.tb:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: 1px;
}
</style>
