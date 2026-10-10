export type MenuVersion = "V1.0" | "V1.1" | "V1.2" | "V2.0";

export interface MenuItem {
  label: string;
  /** 快捷键提示，仅用于显示；绑定在 Task 14 之后统一接线 */
  accelerator?: string;
  /** 对应的 FR／OR 编号，便于追溯 */
  requirement?: string;
  version: MenuVersion;
  /** 分隔线（label 为空） */
  separator?: boolean;
  command?: string;
}

export interface TopLevelMenu {
  label: string;
  /** 助记符，Alt+ 该键可直接打开 */
  mnemonic: string;
  version: MenuVersion;
  items: MenuItem[];
}

export const MENU_MODEL: TopLevelMenu[] = [
  {
    label: "文件",
    mnemonic: "f",
    version: "V1.0",
    items: [
      {
        label: "新建",
        accelerator: "Ctrl+N",
        requirement: "FR-04",
        version: "V1.0",
        command: "file.new",
      },
      {
        label: "打开…",
        accelerator: "Ctrl+O",
        requirement: "FR-05",
        version: "V1.0",
        command: "file.open",
      },
      { label: "最近文件", requirement: "FR-07", version: "V1.0", command: "file.recent" },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "保存",
        accelerator: "Ctrl+S",
        requirement: "FR-06",
        version: "V1.0",
        command: "file.save",
      },
      {
        label: "另存为…",
        accelerator: "Ctrl+Shift+S",
        requirement: "FR-06",
        version: "V1.0",
        command: "file.saveAs",
      },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "关闭标签",
        accelerator: "Ctrl+W",
        requirement: "FR-10",
        version: "V1.0",
        command: "tab.close",
      },
      { label: "全部关闭", requirement: "FR-10", version: "V1.0", command: "tab.closeAll" },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "退出",
        accelerator: "Alt+F4",
        requirement: "FR-02",
        version: "V1.0",
        command: "app.exit",
      },
    ],
  },
  {
    label: "编辑",
    mnemonic: "e",
    version: "V1.0",
    items: [
      {
        label: "撤销",
        accelerator: "Ctrl+Z",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.undo",
      },
      {
        label: "重做",
        accelerator: "Ctrl+Y",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.redo",
      },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "剪切",
        accelerator: "Ctrl+X",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.cut",
      },
      {
        label: "复制",
        accelerator: "Ctrl+C",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.copy",
      },
      {
        label: "粘贴",
        accelerator: "Ctrl+V",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.paste",
      },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "删除行",
        accelerator: "Ctrl+Shift+K",
        requirement: "FR-13",
        version: "V1.0",
        command: "edit.deleteLine",
      },
      {
        label: "复制行",
        accelerator: "Ctrl+Shift+D",
        requirement: "FR-13",
        version: "V1.0",
        command: "edit.copyLine",
      },
      {
        label: "上移行",
        accelerator: "Alt+↑",
        requirement: "FR-13",
        version: "V1.0",
        command: "edit.moveLineUp",
      },
      {
        label: "下移行",
        accelerator: "Alt+↓",
        requirement: "FR-13",
        version: "V1.0",
        command: "edit.moveLineDown",
      },
      {
        label: "合并行",
        accelerator: "Ctrl+J",
        requirement: "FR-13",
        version: "V1.0",
        command: "edit.joinLines",
      },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "列选择模式",
        accelerator: "Alt+C",
        requirement: "FR-14",
        version: "V1.0",
        command: "edit.columnMode",
      },
      {
        label: "全选",
        accelerator: "Ctrl+A",
        requirement: "FR-12",
        version: "V1.0",
        command: "edit.selectAll",
      },
    ],
  },
  {
    label: "搜索",
    mnemonic: "s",
    version: "V1.0",
    items: [
      {
        label: "查找…",
        accelerator: "Ctrl+F",
        requirement: "FR-21",
        version: "V1.0",
        command: "search.find",
      },
      {
        label: "替换…",
        accelerator: "Ctrl+H",
        requirement: "FR-23",
        version: "V1.0",
        command: "search.replace",
      },
      { label: "", separator: true, version: "V1.0" },
      {
        label: "查找下一个",
        accelerator: "F3",
        requirement: "FR-21",
        version: "V1.0",
        command: "search.next",
      },
      {
        label: "查找上一个",
        accelerator: "Shift+F3",
        requirement: "FR-21",
        version: "V1.0",
        command: "search.prev",
      },
      {
        label: "在文件中查找…",
        accelerator: "Ctrl+Shift+F",
        requirement: "FR-24",
        version: "V1.2",
        command: "search.inFiles",
      },
    ],
  },
  {
    label: "视图",
    mnemonic: "v",
    version: "V1.0",
    items: [
      { label: "主题", requirement: "FR-37", version: "V1.0", command: "view.theme" },
      { label: "字体…", requirement: "FR-38", version: "V1.0", command: "view.font" },
      { label: "", separator: true, version: "V1.0" },
      { label: "行号", requirement: "FR-20", version: "V1.0", command: "view.lineNumbers" },
      { label: "当前行高亮", requirement: "FR-19", version: "V1.0", command: "view.activeLine" },
      { label: "括号匹配", requirement: "FR-18", version: "V1.0", command: "view.bracketMatching" },
      { label: "自动缩进", requirement: "FR-15", version: "V1.0", command: "view.autoIndent" },
      { label: "代码折叠", requirement: "FR-17", version: "V1.1", command: "view.fold" },
    ],
  },
  {
    label: "编码",
    mnemonic: "c",
    version: "V1.0",
    items: [
      { label: "重新加载为…", requirement: "FR-26", version: "V1.0", command: "encoding.reloadAs" },
      { label: "转换为…", requirement: "FR-27", version: "V1.0", command: "encoding.convertTo" },
      { label: "换行符", requirement: "FR-29/FR-30", version: "V1.0", command: "encoding.eol" },
      { label: "", separator: true, version: "V1.0" },
      { label: "带 BOM 保存", requirement: "FR-28", version: "V1.0", command: "encoding.bom" },
    ],
  },
  {
    label: "设置",
    mnemonic: "t",
    version: "V1.0",
    items: [
      {
        label: "首选项…",
        accelerator: "Ctrl+,",
        requirement: "FR-37/FR-38/FR-43",
        version: "V1.0",
        command: "settings.open",
      },
      { label: "快捷键…", requirement: "FR-39", version: "V1.0", command: "settings.shortcuts" },
      { label: "", separator: true, version: "V1.0" },
      { label: "导入配置…", requirement: "FR-40", version: "V1.0", command: "settings.import" },
      { label: "导出配置…", requirement: "FR-40", version: "V1.0", command: "settings.export" },
    ],
  },
  {
    label: "帮助",
    mnemonic: "h",
    version: "V1.0",
    items: [
      {
        label: "快捷键说明",
        accelerator: "F1",
        requirement: "OR-01",
        version: "V1.0",
        command: "help.shortcuts",
      },
      { label: "", separator: true, version: "V1.0" },
      { label: "关于 Nota", requirement: "OR-03", version: "V1.0", command: "help.about" },
    ],
  },
];

export const V1_0_TOP_LEVEL = MENU_MODEL.filter((m) => m.version === "V1.0");
