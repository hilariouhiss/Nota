// @vitest-environment jsdom
import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { nextTick } from "vue";
import MenuBar from "./MenuBar.vue";

// MenuBar 的 keydown 挂在 window 上：不卸载的话，上一个用例的实例会继续响应按键并抢焦点
enableAutoUnmount(afterEach);

/** jsdom 下 .focus() 与 document.activeElement 只在元素属于文档时才生效（§7.2 全键盘可达） */
function mountBar() {
  return mount(MenuBar, { attachTo: document.body });
}

/** 按键走的是真实的 window 监听，等 Vue 把 tabindex／下拉 DOM 更新完再断言 */
function press(key: string, init: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, ...init }));
  return nextTick();
}

/** 不等渲染，用于断言这一下有没有被菜单栏吞掉（preventDefault） */
function pressRaw(key: string, init: KeyboardEventInit = {}) {
  const e = new KeyboardEvent("keydown", { key, cancelable: true, ...init });
  window.dispatchEvent(e);
  return e;
}

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

  it("菜单栏是一个 Tab 站：漫游 tabindex 只落在一项上（§7.2）", async () => {
    const wrapper = mountBar();
    const tops = wrapper.findAll(".top");
    expect(wrapper.find(".menubar").attributes("role")).toBe("menubar");
    expect(tops.map((n) => [n.attributes("role"), n.attributes("aria-haspopup")])).toEqual(
      Array(7).fill(["menuitem", "menu"]),
    );
    expect(tops.map((n) => n.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);

    await press("ArrowRight"); // 焦点不在菜单栏、也没有菜单打开：方向键不该被菜单栏吞掉
    expect(tops.map((n) => n.attributes("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);

    await press("Alt", { altKey: true });
    await press("ArrowRight");
    expect(tops.map((n) => n.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
      "-1",
      "-1",
      "-1",
      "-1",
    ]);
  });

  it("单独的 Alt 聚焦菜单栏，←/→ 在顶层之间循环移动焦点（§7.2）", async () => {
    const wrapper = mountBar();
    const tops = wrapper.findAll(".top");

    await press("Alt", { altKey: true });
    expect(document.activeElement).toBe(tops[0].element);

    await press("ArrowRight");
    expect(document.activeElement).toBe(tops[1].element);
    await press("ArrowLeft");
    expect(document.activeElement).toBe(tops[0].element);
    await press("ArrowLeft"); // 首项左移环绕到末项
    expect(document.activeElement).toBe(tops[6].element);
  });

  it("Alt+助记符 直接打开对应菜单（§6.1 助记符）", async () => {
    const wrapper = mountBar();
    await press("s", { altKey: true });
    const search = wrapper.findAll(".top")[2];
    expect(search.attributes("aria-expanded")).toBe("true");
    expect(search.find(".dropdown").text()).toContain("查找…");
  });

  it("Alt+C 打开编码菜单：助记符优先于「列选择模式」的同名快捷键（R39 裁定）", async () => {
    const wrapper = mountBar();
    await press("c", { altKey: true });
    expect(wrapper.findAll(".top")[4].attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".dropdown").text()).toContain("重新加载为…");
  });

  it("Enter 在顶层上打开并关闭菜单（§7.2 Enter 执行）", async () => {
    const wrapper = mountBar();
    const file = wrapper.findAll(".top")[0];
    await press("Alt", { altKey: true });

    await press("Enter");
    expect(file.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".dropdown").exists()).toBe(true);

    await press("Enter");
    expect(file.attributes("aria-expanded")).toBe("false");
    expect(wrapper.find(".dropdown").exists()).toBe(false);
  });

  it("Enter 在下拉项上 emit run 并带该项的 command", async () => {
    const wrapper = mountBar();
    await press("v", { altKey: true }); // 视图
    await press("ArrowDown"); // 主题
    await press("ArrowDown"); // 字体…
    await press("Enter");

    expect(wrapper.emitted("run")).toEqual([["view.font"]]);
    expect(wrapper.find(".dropdown").exists()).toBe(false); // 执行后收起
  });

  it("空格与 Enter 等价：顶层开合、下拉项执行", async () => {
    const wrapper = mountBar();
    await press("Alt", { altKey: true });

    await press(" ");
    expect(wrapper.find(".dropdown").exists()).toBe(true);

    await press("ArrowDown"); // 新建
    await press(" ");
    expect(wrapper.emitted("run")).toEqual([["file.new"]]);
  });

  it("↓/↑ 在下拉项之间移动焦点：跳过分隔线、首末环绕（§7.2 ↑/↓ 选项）", async () => {
    const wrapper = mountBar();
    await press("f", { altKey: true }); // 文件
    const items = wrapper.findAll(".item");

    await press("ArrowDown");
    expect(document.activeElement).toBe(items[0].element); // 新建
    await press("ArrowUp"); // 首项 ↑ 环绕到末项
    expect(document.activeElement).toBe(items.at(-1)?.element);
    expect(items.at(-1)?.text()).toBe("退出Alt+F4");
    await press("ArrowDown"); // 末项 ↓ 回首项
    expect(document.activeElement).toBe(items[0].element);

    await press("ArrowDown");
    await press("ArrowDown");
    await press("ArrowDown"); // 越过「最近文件」之后的分隔线
    expect(document.activeElement).toBe(items[3].element);
    expect(items[3].text()).toBe("保存Ctrl+S");
  });

  it("菜单开着时 ←/→ 直接换菜单（Windows 惯例，§7.2 切顶层）", async () => {
    const wrapper = mountBar();
    const tops = wrapper.findAll(".top");
    await press("f", { altKey: true }); // 文件
    expect(wrapper.find(".dropdown").text()).toContain("新建");

    await press("ArrowRight");
    expect(document.activeElement).toBe(tops[1].element);
    expect(tops[1].attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".dropdown").text()).toContain("撤销");

    await press("ArrowLeft");
    expect(tops[0].attributes("aria-expanded")).toBe("true");
    expect(wrapper.find(".dropdown").text()).toContain("新建");
  });

  it("没有菜单打开时 ↑/↓ 不接管：焦点留在顶层，按键也不被吞（§7.3 Alt+↑/↓ 归编辑区）", async () => {
    const wrapper = mountBar();
    await press("Alt", { altKey: true });
    expect(pressRaw("ArrowDown").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(wrapper.findAll(".top")[0].element);
    expect(wrapper.find(".dropdown").exists()).toBe(false);
  });

  it("焦点不在菜单栏、也没有菜单打开时 ←→ 不被吞（§7.3 编辑区方向键）", () => {
    mountBar();
    expect(pressRaw("ArrowRight").defaultPrevented).toBe(false);
    expect(pressRaw("ArrowLeft").defaultPrevented).toBe(false);
  });

  it("Esc 关闭下拉，并 emit dismiss 把还焦编辑区交给 AppShell（§7.2）", async () => {
    const wrapper = mountBar();
    await press("f", { altKey: true });
    expect(wrapper.find(".dropdown").exists()).toBe(true);

    await press("Escape");
    expect(wrapper.find(".dropdown").exists()).toBe(false);
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });

  it("没有菜单打开时 Esc 不 emit dismiss（别处按 Esc 不该被抢焦点）", async () => {
    const wrapper = mountBar();
    await press("Escape");
    expect(wrapper.emitted("dismiss")).toBeUndefined();
  });

  it("点击分隔线不会关掉下拉（复审 Minor）", async () => {
    const wrapper = mountBar();
    await wrapper.findAll(".top")[0].trigger("click"); // 文件
    expect(wrapper.find(".dropdown").exists()).toBe(true);

    await wrapper.find(".sep").trigger("click");
    expect(wrapper.find(".dropdown").exists()).toBe(true);
  });
});
