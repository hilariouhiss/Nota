// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import MenuBar from "./MenuBar.vue";

describe("MenuBar", () => {
  it("渲染七个顶层菜单", () => {
    expect(
      mount(MenuBar)
        .findAll(".top")
        .map((n) => n.text()),
    ).toEqual(["文件", "编辑", "搜索", "视图", "编码", "设置", "帮助"]);
  });

  it("V1.1/V1.2/V2.0 的预留项不出现在 V1.0 界面里", async () => {
    const wrapper = mount(MenuBar);
    await wrapper.findAll(".top")[2].trigger("click"); // 搜索
    expect(wrapper.text()).not.toContain("在文件中查找");
  });
});
