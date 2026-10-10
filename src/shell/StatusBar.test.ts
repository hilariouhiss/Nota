// @vitest-environment jsdom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vite-plus/test";
import StatusBar from "./StatusBar.vue";

const base = { line: 3, column: 42, language: "纯文本", encoding: "UTF-8", eol: "CRLF" };

describe("StatusBar", () => {
  it("显示行列号、语言模式、编码、换行符（UI-06）", () => {
    const text = mount(StatusBar, { props: base }).text();
    expect(text).toContain("行 3，列 42");
    expect(text).toContain("纯文本");
    expect(text).toContain("UTF-8");
    expect(text).toContain("CRLF");
  });

  it("编码与换行符字段可点击，行列号不可点击", () => {
    const wrapper = mount(StatusBar, { props: base });
    expect(wrapper.find("[data-field='encoding']").attributes("role")).toBe("button");
    expect(wrapper.find("[data-field='eol']").attributes("role")).toBe("button");
    expect(wrapper.find("[data-field='position']").attributes("role")).toBeUndefined();
  });

  it("窄窗时按优先级隐藏：先语言模式，最后才编码/换行符（设计规范 §6.3）", () => {
    const wrapper = mount(StatusBar, { props: { ...base, compact: "hideLanguage" } });
    expect(wrapper.find("[data-field='language']").exists()).toBe(false);
    expect(wrapper.find("[data-field='encoding']").exists()).toBe(true);
    expect(wrapper.find("[data-field='position']").exists()).toBe(true);
  });
});
