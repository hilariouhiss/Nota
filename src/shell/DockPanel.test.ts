// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import DockPanel from "./DockPanel.vue";

describe("DockPanel", () => {
  it("折叠态仍保留页签条（设计规范 §3.2：既是状态显示也是展开入口）", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    expect(wrapper.find(".dock-tabs").exists()).toBe(true);
    expect(wrapper.find(".dock-body").exists()).toBe(false);
  });

  it("展开态出现内容区", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: false } });
    expect(wrapper.find(".dock-body").exists()).toBe(true);
  });

  it("两个页签在 M1 就已存在，M7 只需填内容", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    expect(wrapper.findAll(".dt").map((n) => n.text())).toEqual(["查找 / 替换", "在文件中查找"]);
  });

  it("activeTab 初值决定高亮页签（R41：初值来自 prop，不是写死的 find-replace）", () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true, activeTab: "search-in-files" } });
    expect(wrapper.find(".dt.on").text()).toBe("在文件中查找");
  });

  it("点击页签切换，点关闭 emit close", async () => {
    const wrapper = mount(DockPanel, { props: { collapsed: true } });
    await wrapper.findAll(".dt")[1].trigger("click");
    expect(wrapper.emitted("update:activeTab")?.[0]).toEqual(["search-in-files"]);
    await wrapper.find(".cl").trigger("click");
    expect(wrapper.emitted("close")).toBeTruthy();
  });
});
