// @vitest-environment jsdom
import { undoDepth } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";
import { mount, type VueWrapper } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vite-plus/test";
import { nextTick } from "vue";
import EditorHost from "../editor/EditorHost.vue";
import { V1_0_TOP_LEVEL } from "../menu/model";
import { useDocumentsStore } from "../stores/documents";
import AppShell from "./AppShell.vue";
import MenuBar from "./MenuBar.vue";

// jsdom 没实现 Range.getClientRects。文档为空时 CodeMirror 量不出行宽，会塞一个 dummy 行量文字宽度，
// 走的正是这个方法——抛出的未捕获异常会让测试进程以非 0 退出（真实浏览器里不存在这个缺口）。
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

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

/**
 * jsdom 没实现 `document.execCommand`，编辑器的剪切/复制正是走它触发 CodeMirror 的剪贴板路径。
 * 装一个只记参数的探针（够用，不引 mock 框架）：不装的话「命令没接线」与「接了线但环境不支持」
 * 在测试里完全同形，删掉实现也能通过。`enabled` 为 false 时保持 jsdom 原样（方法不存在）。
 */
function stubExecCommand(enabled: boolean) {
  const calls: string[] = [];
  if (!enabled) return { calls, restore: () => {} };
  (document as unknown as { execCommand: unknown }).execCommand = (commandId: string) => {
    calls.push(commandId);
    return true;
  };
  return {
    calls,
    restore: () => delete (document as unknown as { execCommand?: unknown }).execCommand,
  };
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
    expect(wrapper.find(".dock-tabs").exists()).toBe(true);
    expect(wrapper.find(".dock-body").exists()).toBe(false);
  });

  it("点页签条展开面板，点 × 回到折叠（设计规范 §3.2）", async () => {
    const { wrapper } = await mountShell();
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("true");

    await wrapper.findAll(".dt")[1].trigger("click");
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("false");
    expect(wrapper.find(".dock-body").exists()).toBe(true);

    await wrapper.find(".cl").trigger("click");
    expect(wrapper.find("[data-region='dock']").attributes("data-collapsed")).toBe("true");
    expect(wrapper.find(".dock-body").exists()).toBe(false);
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

  it("切换标签时把编辑区内容写回上一个标签（R36）", async () => {
    const { wrapper, store } = await mountShell();
    // 此刻只有编辑区里有文本，store 的 content 仍是 ""——写回之前这就是「未落盘」状态
    editorView(wrapper).dispatch({ changes: { from: 0, insert: "第一个标签的内容" } });
    await nextTick();

    store.newDocument(); // 直接建新标签，不经 TabBar：切换点不能只挂在 TabBar 的 select/close 上
    await nextTick();
    expect(editorView(wrapper).state.doc.toString()).toBe("");

    await wrapper.findAll(".tab")[0].trigger("click"); // 切回第一个标签
    await nextTick();
    expect(store.tabs[0].content).toBe("第一个标签的内容");
    expect(editorView(wrapper).state.doc.toString()).toBe("第一个标签的内容");
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

  // M1 出口清单：「菜单的全部 edit.* 项在编辑区实际生效」。逐项跑一遍，防止某个 command 接到了
  // 别的命令上（例如复制行接成 copyLineUp）——这种错位光读代码几乎看不出来。
  //
  // 剪贴板三条（cut/copy/paste）在 jsdom 里验不了真：`document.execCommand` 与 `navigator.clipboard`
  // 都不存在。这里只能装桩观察「命令确实走了 CodeMirror 的剪贴板路径」——桩不模拟浏览器的 copy/cut
  // 事件，所以文档不变；真的进出系统剪贴板（复制选区文本、剪切删掉选区、粘贴系统剪贴板文本）
  // 由控制器在真实浏览器验收。
  const editCases: Array<{
    command: string;
    text: string;
    cursor?: number;
    /** 先执行的命令（redo 得先有 undo） */
    before?: string[];
    /** 命令执行后的文档文本 */
    expected: string;
    /** 装 document.execCommand 探针，并断言收到的参数（cut/copy） */
    execCommand?: string;
    /** 装 navigator.clipboard.readText 桩，返回这段文本（paste） */
    clipboard?: string;
    /** 文档看不出差异的命令（selectAll 只改选区、columnMode 只翻模式）另加断言 */
    check?: (ctx: { wrapper: VueWrapper; view: EditorView }) => void;
  }> = [
    { command: "edit.undo", text: "abc", expected: "" },
    { command: "edit.redo", text: "abc", before: ["edit.undo"], expected: "abc" },
    { command: "edit.cut", text: "abc", execCommand: "cut", expected: "abc" },
    { command: "edit.copy", text: "abc", execCommand: "copy", expected: "abc" },
    {
      command: "edit.paste",
      text: "abc",
      cursor: 3, // 程序化插入后光标停在插入点之前，这里显式放到行尾，粘贴结果才可预期
      clipboard: "ZZ",
      expected: "abcZZ",
      check: ({ view }) => expect(view.state.selection.main.head).toBe(5), // 光标跟到插入文本之后
    },
    { command: "edit.deleteLine", text: "a\nb", cursor: 0, expected: "b" },
    { command: "edit.copyLine", text: "a", cursor: 0, expected: "a\na" },
    { command: "edit.moveLineUp", text: "a\nb", cursor: 2, expected: "b\na" },
    { command: "edit.moveLineDown", text: "a\nb", cursor: 0, expected: "b\na" },
    { command: "edit.joinLines", text: "a\n  b", cursor: 0, expected: "a b" },
    {
      command: "edit.columnMode",
      text: "abc",
      expected: "abc",
      check: ({ wrapper }) =>
        expect(wrapper.findComponent(EditorHost).props("columnMode")).toBe(true),
    },
    {
      command: "edit.selectAll",
      text: "abc",
      expected: "abc",
      check: ({ view }) =>
        expect([view.state.selection.main.from, view.state.selection.main.to]).toEqual([0, 3]),
    },
  ];

  it("edit.* 用例覆盖 model 里的全部命令（漏一个就失败，防止覆盖面缩水）", () => {
    const inMenu = V1_0_TOP_LEVEL.flatMap((m) => m.items)
      .map((i) => i.command)
      .filter((c): c is string => !!c?.startsWith("edit."));
    expect(inMenu).toHaveLength(12);
    expect(editCases.map((c) => c.command).sort()).toEqual([...inMenu].sort());
  });

  for (const c of editCases) {
    it(`${c.command} 在编辑区生效（M1 出口：全部 edit.* 项）`, async () => {
      const { wrapper } = await mountShell();
      const view = editorView(wrapper);
      view.dispatch({ changes: { from: 0, insert: c.text } });
      if (c.cursor !== undefined) view.dispatch({ selection: { anchor: c.cursor } });
      await nextTick();

      const exec = stubExecCommand(c.execCommand !== undefined);
      if (c.clipboard !== undefined) {
        Object.defineProperty(navigator, "clipboard", {
          value: { readText: () => Promise.resolve(c.clipboard) },
          configurable: true,
        });
      }
      try {
        for (const command of c.before ?? []) {
          wrapper.findComponent(MenuBar).vm.$emit("run", command);
          await nextTick();
        }
        wrapper.findComponent(MenuBar).vm.$emit("run", c.command); // 不抛错即「命令被消费」
        await nextTick();
      } finally {
        exec.restore();
        delete (navigator as unknown as { clipboard?: unknown }).clipboard;
      }

      expect(editorView(wrapper).state.doc.toString()).toBe(c.expected);
      if (c.execCommand !== undefined) expect(exec.calls).toEqual([c.execCommand]);
      c.check?.({ wrapper, view: editorView(wrapper) });
    });
  }

  it("工具栏按钮走同一条分发路径（file.new 新建标签）", async () => {
    const { wrapper, store } = await mountShell();
    await wrapper.find("[data-action='file.new']").trigger("click");
    await nextTick();
    expect(store.tabs).toHaveLength(2);
    expect(store.activeTab?.title).toBe("未命名 2");
  });

  it("全局键 Ctrl+N 新建、Ctrl+W 关闭当前标签（§7.3 全局表）", async () => {
    const { store } = await mountShell();

    const ctrlN = new KeyboardEvent("keydown", { key: "n", ctrlKey: true, cancelable: true });
    window.dispatchEvent(ctrlN);
    await nextTick();
    expect(ctrlN.defaultPrevented).toBe(true);
    expect(store.tabs).toHaveLength(2);

    const ctrlW = new KeyboardEvent("keydown", { key: "w", ctrlKey: true, cancelable: true });
    window.dispatchEvent(ctrlW);
    await nextTick();
    expect(ctrlW.defaultPrevented).toBe(true);
    expect(store.tabs).toHaveLength(1);
    expect(store.activeTab?.title).toBe("未命名 1");
  });

  it("按住不放的重复按键不再触发（Ctrl+N 连开一串标签）", async () => {
    const { store } = await mountShell();
    const repeat = new KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
      repeat: true,
      cancelable: true,
    });
    window.dispatchEvent(repeat);
    await nextTick();
    expect(store.tabs).toHaveLength(1);
    expect(repeat.defaultPrevented).toBe(false);
  });

  it("没有 M1 实现的全局键不被吞掉（Ctrl+O 留给 M2）", async () => {
    const { store } = await mountShell();
    const ctrlO = new KeyboardEvent("keydown", { key: "o", ctrlKey: true, cancelable: true });
    window.dispatchEvent(ctrlO);
    await nextTick();
    expect(ctrlO.defaultPrevented).toBe(false);
    expect(store.tabs).toHaveLength(1);
  });

  it("tab.closeAll 关掉全部标签，只剩自动新建的那一个（不会无休止地关下去）", async () => {
    const { wrapper, store } = await mountShell();
    store.newDocument();
    store.newDocument();
    await nextTick();

    wrapper.findComponent(MenuBar).vm.$emit("run", "tab.closeAll");
    await nextTick();

    expect(store.tabs).toHaveLength(1);
    expect(store.tabs[0].content).toBe("");
  });

  it("M1 未实现的命令静默跳过，不报错也不改状态（file.save 归 M2）", async () => {
    const { wrapper, store } = await mountShell();
    editorView(wrapper).dispatch({ changes: { from: 0, insert: "abc" } });
    await nextTick();

    wrapper.findComponent(MenuBar).vm.$emit("run", "file.save");
    await nextTick();

    expect(store.tabs).toHaveLength(1);
    expect(editorView(wrapper).state.doc.toString()).toBe("abc");
  });
});
