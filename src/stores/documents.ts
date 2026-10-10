import { defineStore } from "pinia";
import { computed, ref } from "vue";

export interface DocumentTab {
  id: string;
  title: string;
  dirty: boolean;
  /** 已保存文件的绝对路径；未命名文档为 null */
  path: string | null;
  /** 编辑区内容。M1 只存在内存里，文件 I/O 属 M2 */
  content: string;
}

let counter = 0;
const nextId = () => `doc-${++counter}`;

export const useDocumentsStore = defineStore("documents", () => {
  const tabs = ref<DocumentTab[]>([]);
  const activeId = ref<string | null>(null);

  const activeTab = computed(() => tabs.value.find((t) => t.id === activeId.value));

  function newDocument(title?: string): DocumentTab {
    const tab: DocumentTab = {
      id: nextId(),
      title: title ?? `未命名 ${tabs.value.length + 1}`,
      dirty: false,
      path: null,
      content: "",
    };
    tabs.value.push(tab);
    activeId.value = tab.id;
    return tab;
  }

  function selectDocument(id: string) {
    activeId.value = id;
  }

  function closeDocument(id: string) {
    const index = tabs.value.findIndex((t) => t.id === id);
    if (index < 0) return;
    tabs.value.splice(index, 1);

    // 关闭最后一个标签时不留空态：直接新建一个，少一个需要实现的界面状态
    if (tabs.value.length === 0) {
      newDocument();
      return;
    }
    if (activeId.value === id) {
      const neighbour = tabs.value[Math.min(index, tabs.value.length - 1)];
      activeId.value = neighbour.id;
    }
  }

  function setDirty(id: string, dirty: boolean) {
    const tab = tabs.value.find((t) => t.id === id);
    if (tab) tab.dirty = dirty;
  }

  return { tabs, activeId, activeTab, newDocument, selectDocument, closeDocument, setDirty };
});
