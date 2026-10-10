// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import TabBar from "./TabBar.vue";

const tabs = [
  { id: "a", title: "app.log", dirty: false },
  { id: "b", title: "config.toml", dirty: true },
];

describe("TabBar", () => {
  it("活动标签带强调色指示条", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    expect(wrapper.findAll(".tab")[0].classes()).toContain("active");
  });

  it("未保存标签显示圆点而不是关闭按钮（设计规范 §7.1：● 不需要悬停即可见）", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    const dirty = wrapper.findAll(".tab")[1];
    expect(dirty.find(".dot").exists()).toBe(true);
  });

  it("已保存标签常显关闭按钮", () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    expect(wrapper.findAll(".tab")[0].find(".close").exists()).toBe(true);
  });

  it("点击标签触发 select，点击关闭触发 close", async () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    await wrapper.findAll(".tab")[1].trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["b"]);
    await wrapper.findAll(".tab")[0].find(".close").trigger("click");
    expect(wrapper.emitted("close")?.[0]).toEqual(["a"]);
  });

  it("中键点击关闭标签（Windows 惯例）", async () => {
    const wrapper = mount(TabBar, { props: { tabs, activeId: "a" } });
    await wrapper.findAll(".tab")[1].trigger("auxclick", { button: 1 });
    expect(wrapper.emitted("close")?.[0]).toEqual(["b"]);
  });
});
