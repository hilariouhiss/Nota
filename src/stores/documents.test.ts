import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { useDocumentsStore } from "./documents";

describe("documents store", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("初始为空的文档集合没有活动标签", () => {
    const s = useDocumentsStore();
    expect(s.tabs).toEqual([]);
    expect(s.activeTab).toBeUndefined();
  });

  it("新建文档后自动成为活动标签", () => {
    const s = useDocumentsStore();
    s.newDocument("未命名 1");
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(s.tabs[0].id);
    expect(s.activeTab?.title).toBe("未命名 1");
  });

  it("关闭活动标签后焦点落到相邻标签", () => {
    const s = useDocumentsStore();
    s.newDocument("a");
    s.newDocument("b");
    const firstId = s.tabs[0].id;
    s.selectDocument(firstId);
    s.closeDocument(firstId);
    expect(s.tabs).toHaveLength(1);
    expect(s.activeId).toBe(s.tabs[0].id);
  });

  it("关闭最后一个标签时自动新建一个未命名文档（设计规范 §7.1：不存在无标签空态）", () => {
    const s = useDocumentsStore();
    s.newDocument("only");
    s.closeDocument(s.tabs[0].id);
    expect(s.tabs).toHaveLength(1);
    expect(s.tabs[0].title).toMatch(/^未命名 \d+$/);
  });

  it("编辑后标记为未保存", () => {
    const s = useDocumentsStore();
    s.newDocument("a");
    s.setDirty(s.tabs[0].id, true);
    expect(s.activeTab?.dirty).toBe(true);
  });
});
