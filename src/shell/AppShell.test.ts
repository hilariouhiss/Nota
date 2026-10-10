// @vitest-environment jsdom
import { undoDepth } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vite-plus/test";
import { nextTick } from "vue";
import { useDocumentsStore } from "../stores/documents";
import AppShell from "./AppShell.vue";

/** Pinia 必须在 mount 之前激活：AppShell 在 setup 里就取 store */
async function mountShell() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useDocumentsStore();
  const wrapper = mount(AppShell, { global: { plugins: [pinia] } });
  // 挂载时的 newDocument() 会触发一次重渲染，等 DOM 跟上再断言标签
  await nextTick();
  return { wrapper, store };
}

/** 从 DOM 反查 CodeMirror 视图：测试里模拟真实输入（切标签走的是同一条 dispatch 路径） */
function editorView(wrapper: VueWrapper) {
  const view = EditorView.findFromDOM(wrapper.find(".cm-editor").element as HTMLElement);
  if (!view) throw new Error("编辑区没有挂载 CodeMirror 视图");
  return view;
}

describe("AppShell", () => {
  it("渲染六个区域，且顺序符合设计规范 §3.1", async () => {
    const { wrapper } = await mountShell();
    const regions = wrapper.findAll("[data-region]").map((n) => n.attributes("data-region"));
    expect(regions).toEqual(["menu", "toolbar", "tabs", "editor", "dock", "status"]);
  });

  it("折叠态下面板只保留页签条（设计规范 §3.2）", async () => {
    const { wrapper } = await mountShell();
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("true");
  });

  it("挂载即创建「未命名 1」并选中（设计规范 §3.4：不做欢迎页）", async () => {
    const { wrapper, store } = await mountShell();
    expect(store.tabs.map((t) => t.title)).toEqual(["未命名 1"]);
    expect(store.activeId).toBe(store.tabs[0].id);
    expect(wrapper.findAll(".tab")[0].classes()).toContain("active");
  });

  it("编辑后活动标签点亮未保存标记（M1 出口：§7.1 的 ●）", async () => {
    const { wrapper, store } = await mountShell();
    editorView(wrapper).dispatch({ changes: { from: 0, insert: "x" } });
    await nextTick();
    expect(store.activeTab?.dirty).toBe(true);
    expect(wrapper.findAll(".tab")[0].find(".dot").exists()).toBe(true);
  });

  it("输入后状态栏显示编辑区上报的行列号（R21 闭环）", async () => {
    const { wrapper } = await mountShell();
    const view = editorView(wrapper);
    view.dispatch({ changes: { from: 0, insert: "a\nb" } });
    // 光标显式移到第 2 行行尾：插入时 CodeMirror 把光标留在插入点之前
    view.dispatch({ selection: { anchor: 3 } });
    await nextTick();
    expect(wrapper.find("[data-field='position']").text()).toBe("行 2，列 2");
  });

  it("切标签显示目标文档的内容，且不把刚切到的标签标成未保存（R34）", async () => {
    const { wrapper, store } = await mountShell();
    const first = store.tabs[0];
    store.newDocument();
    first.content = "hello";
    await nextTick();
    await wrapper.findAll(".tab")[0].trigger("click");
    await nextTick();
    expect(editorView(wrapper).state.doc.toString()).toBe("hello");
    expect(store.activeTab?.dirty).toBe(false);
  });

  it("切换文档的替换不进撤销历史（R35：Ctrl+Z 不会撤出上一个文档的内容）", async () => {
    const { wrapper, store } = await mountShell();
    const first = store.tabs[0];
    store.newDocument();
    first.content = "hello";
    await nextTick();
    await wrapper.findAll(".tab")[0].trigger("click");
    await nextTick();
    const view = editorView(wrapper);
    expect(view.state.doc.toString()).toBe("hello");
    expect(undoDepth(view.state)).toBe(0);
  });
});
