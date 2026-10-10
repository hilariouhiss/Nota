// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import ToolBar from "./ToolBar.vue";

describe("ToolBar", () => {
  it("恰好 8 个按钮，顺序符合设计规范 §6.2", () => {
    const wrapper = mount(ToolBar);
    expect(wrapper.findAll("[data-action]").map((n) => n.attributes("data-action"))).toEqual([
      "file.new",
      "file.open",
      "file.save",
      "edit.undo",
      "edit.redo",
      "search.find",
      "search.replace",
      "settings.open",
    ]);
  });

  it("不包含编码与换行符按钮——它们已在状态栏，工具栏不重复（设计规范 §6.2）", () => {
    const actions = mount(ToolBar)
      .findAll("[data-action]")
      .map((n) => n.attributes("data-action"));
    expect(actions.some((a) => a?.startsWith("encoding."))).toBe(false);
  });

  it("点击按钮 emit 对应 command", async () => {
    const wrapper = mount(ToolBar);
    await wrapper.find("[data-action='file.save']").trigger("click");
    expect(wrapper.emitted("run")?.[0]).toEqual(["file.save"]);
  });

  it("不可用的按钮置灰而非隐藏（设计规范 §3.4：避免按钮位置跳动）", () => {
    const wrapper = mount(ToolBar, { props: { disabled: ["file.save", "edit.undo"] } });
    const save = wrapper.find("[data-action='file.save']");
    expect(save.exists()).toBe(true);
    expect(save.attributes("disabled")).toBeDefined();
  });
});
