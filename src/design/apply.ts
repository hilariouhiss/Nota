import { readonly, ref, type Ref } from "vue";
import { tokensToCssVars } from "./derive";
import { LIGHT_TOKENS, type ThemeTokens } from "./tokens";

const current = ref<ThemeTokens>(LIGHT_TOKENS);

/**
 * 把令牌写到根元素。切换主题时只替换令牌对象，不重挂组件——
 * CodeMirror 的主题经 Compartment 热替换（见 src/editor/theme.ts）。
 */
export function applyTokens(tokens: ThemeTokens): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(tokensToCssVars(tokens))) {
    root.style.setProperty(name, value);
  }
  root.dataset.spTheme = tokens.name;
  current.value = tokens;
}

/** 供组件读取当前令牌（只读，改写一律经 applyTokens） */
export function useTokens(): {
  tokens: Readonly<Ref<ThemeTokens>>;
  setTheme: (t: ThemeTokens) => void;
} {
  return { tokens: readonly(current) as Readonly<Ref<ThemeTokens>>, setTheme: applyTokens };
}
