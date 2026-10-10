<script setup lang="ts">
withDefaults(
  defineProps<{
    line: number;
    column: number;
    language: string;
    encoding?: string;
    eol?: string;
    /** 窄窗降级：语言模式最先隐藏，行列号永不隐藏（设计规范 §6.3） */
    compact?: "none" | "hideLanguage" | "hideLanguageAndEol";
  }>(),
  { compact: "none" },
);

const emit = defineEmits<{ pickEncoding: []; pickEol: [] }>();
</script>

<template>
  <div class="status">
    <span data-field="position">行 {{ line }}，列 {{ column }}</span>
    <span v-if="compact === 'none'" data-field="language">{{ language }}</span>
    <span class="spacer" />
    <button
      v-if="compact !== 'hideLanguageAndEol'"
      data-field="eol"
      type="button"
      role="button"
      class="field"
      @click="emit('pickEol')"
    >
      {{ eol }} ▾
    </button>
    <button
      data-field="encoding"
      type="button"
      role="button"
      class="field"
      @click="emit('pickEncoding')"
    >
      {{ encoding }} ▾
    </button>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: calc(var(--sp-pad) * 1.1);
  /* 填满区域内容盒即可（R22）：外层 .status 区域已按令牌给出 22px 并自带 1px 边框，
     此处再声明令牌高度会让子盒溢出内容盒 1px，并盖住相邻区域的 border-bottom 分隔线 */
  height: 100%;
  padding: 0 var(--sp-pad);
  color: var(--sp-text-dim);
  font-size: var(--sp-font-size-status);
  background: var(--sp-bg-status);
}
.spacer {
  flex: 1;
}
.field {
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  background: none;
  cursor: pointer;
  border-radius: calc(var(--sp-radius) * 0.7);
}
.field:hover {
  color: var(--sp-text);
  background: var(--sp-bg-hover);
}
.field:focus-visible {
  outline: 2px solid var(--sp-focus-ring);
  outline-offset: 1px;
}
</style>
