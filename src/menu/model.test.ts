import { describe, expect, it } from "vite-plus/test";
import { MENU_MODEL, V1_0_TOP_LEVEL } from "./model";

describe("菜单模型", () => {
  it("V1.0 恰好七个顶层菜单，顺序固定（设计规范 §6.1）", () => {
    expect(MENU_MODEL.filter((m) => m.version === "V1.0").map((m) => m.label)).toEqual([
      "文件",
      "编辑",
      "搜索",
      "视图",
      "编码",
      "设置",
      "帮助",
    ]);
    expect(V1_0_TOP_LEVEL).toHaveLength(7);
  });

  it("不含任何候选功能——设计规范 §9.3 已明确排除", () => {
    const all = MENU_MODEL.flatMap((m) => m.items.map((i) => i.label));
    expect(all).not.toContain("转到行…");
    expect(all).not.toContain("工具栏");
    expect(all).not.toContain("跟随系统主题");
  });

  it("每一项都标注归属版本", () => {
    for (const menu of MENU_MODEL) {
      for (const item of menu.items) {
        expect(item.version, `${menu.label} → ${item.label} 缺版本`).toBeTruthy();
      }
    }
  });
});
