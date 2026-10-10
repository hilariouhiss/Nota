// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { applyTokens } from "./apply";
import { DARK_TOKENS, LIGHT_TOKENS } from "./tokens";

describe("applyTokens", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style");
    document.documentElement.removeAttribute("data-sp-theme");
  });

  it("把令牌写到根元素的 CSS 变量上", () => {
    applyTokens(LIGHT_TOKENS);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--sp-text")).toBe("#1f1f1f");
    expect(style.getPropertyValue("--sp-menu-h")).toBe("24px");
  });

  it("切换主题时替换变量值而不残留旧值", () => {
    applyTokens(LIGHT_TOKENS);
    applyTokens(DARK_TOKENS);
    const style = document.documentElement.style;
    expect(style.getPropertyValue("--sp-text")).toBe("#e6e6e6");
    expect(document.documentElement.dataset.spTheme).toBe("dark");
  });
});
