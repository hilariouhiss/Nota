import { describe, expect, it } from "vite-plus/test";
import { tokensToCssVars } from "./derive";
import { LIGHT_TOKENS } from "./tokens";

/**
 * `var(--sp-*)` 写错变量名不会报错，也不会回退到某个默认值——那段声明直接失效，
 * 界面只是悄悄少一层背景色。历史缺陷 `--sp-bg-tab-strip`（kebab 派生的结果）vs `--sp-bg-tabstrip`
 * （规范 §4.2 的文档名）当时只在派生侧（derive.test.ts）被钉住，SFC 里的拼写没人管。这里补上
 * 「引用存在性」这一半：骨架里出现的每个 --sp-* 都必须由 tokensToCssVars 定义。
 *
 * 用 glob 取源码文本而不是逐个 import：新增的 SFC 自动纳入扫描，不会像手写清单那样漏掉。
 * 只扫 src/shell/*.vue——全仓库的 var(--sp-*) 引用都在这一层（骨架只读 var，不自己定义令牌）。
 */
const SHELL_SOURCES = import.meta.glob("../shell/*.vue", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("CSS 变量引用（--sp-*）", () => {
  it("src/shell/*.vue 里引用的每个变量都在令牌表里有定义", () => {
    const defined = new Set(Object.keys(tokensToCssVars(LIGHT_TOKENS)));
    const refs: string[] = [];
    for (const source of Object.values(SHELL_SOURCES)) {
      for (const m of source.matchAll(/var\(\s*(--sp-[a-z0-9-]+)/gi)) refs.push(m[1]);
    }

    // 先证明正则真的抓到了东西：正则失效（或 glob 没取到文件）时下面的断言会恒真通过
    expect(refs.length).toBeGreaterThan(0);
    expect([...new Set(refs)].filter((r) => !defined.has(r))).toEqual([]);
  });
});
