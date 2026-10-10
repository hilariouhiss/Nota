// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import AppShell from "./AppShell.vue";

describe("AppShell", () => {
  it("渲染六个区域，且顺序符合设计规范 §3.1", () => {
    const wrapper = mount(AppShell);
    const regions = wrapper.findAll("[data-region]").map((n) => n.attributes("data-region"));
    expect(regions).toEqual(["menu", "toolbar", "tabs", "editor", "dock", "status"]);
  });

  it("折叠态下面板只保留页签条（设计规范 §3.2）", () => {
    const wrapper = mount(AppShell);
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("true");
  });
});
