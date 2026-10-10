# Nota 架构与技术栈设计文档

## 修订历史

| 版本 | 日期       | 修订内容                                                              |
| ---- | ---------- | --------------------------------------------------------------------- |
| V0.1 | 2026-10-09 | 初稿，技术栈确认                                                      |
| V0.2 | 2026-10-09 | 与 SRS 对齐矛盾项；工具链更正为 Vite+；新增「1.6 实现现状」与规划标记 |
| V0.3 | 2026-10-09 | 回写 §12 需求归属；FR-16 确认留在 V1.1；与实施计划对齐                |
| V0.4 | 2026-10-10 | 按 UI 设计规范回写：§4.2.10 与 AD-11 收窄 Naive UI 适用范围至对话框与反馈层；§5.1 组件表改为 18 项；§4.1 与附录 A.4 补 `@vicons/fluent` 图标依赖并记录 vfonts 判断 |

---

## 目录

1. 引言  
2. 架构概览  
3. 架构设计决策  
4. 技术栈选型  
5. 组件设计  
6. 接口设计  
7. 数据设计  
8. 关键流程设计  
9. 非功能设计  
10. 部署与构建  
11. 风险与缓解  
12. 版本演进规划  
附录 A 依赖清单  
附录 B 参考文档  

---

## 1. 引言

### 1.1 目的

本文档定义 Nota 的系统架构、技术栈选型、组件职责、接口规范与关键设计决策，作为开发、测试、评审和后续演进的技术依据。

本文档面向技术负责人、架构师、开发人员、测试人员和项目管理人员。

### 1.2 范围

本文档覆盖 Nota 桌面端应用的整体架构设计，包括：

- 分层架构与模块划分
- 技术栈选型及依据
- 组件职责与交互关系
- IPC 通信协议设计
- 关键数据流与性能策略
- UI 组件库选型
- 部署、构建与版本演进规划

本文档不覆盖：

- 详细 UI 视觉设计
- 具体业务功能的需求定义（参见 SRS）
- 插件 API 的完整接口规范（另行编制）

### 1.3 设计目标

Nota 架构设计遵循以下目标：

| 编号 | 目标         | 说明                                              |
| ---- | ------------ | ------------------------------------------------- |
| G-01 | 轻量快速     | 冷启动 ≤ 1.5 秒，热启动 ≤ 0.5 秒，空闲内存占用低  |
| G-02 | 语法感知     | 基于 Tree-sitter 提供深度语法高亮、折叠与结构导航 |
| G-03 | 架构清晰     | 渲染、语法分析、文件 I/O 职责分离                 |
| G-04 | 可扩展       | 支持插件、主题、语言包和自定义语法                |
| G-05 | 跨平台可演进 | Windows 优先，预留 Linux/macOS 扩展能力           |
| G-06 | 可维护       | 模块化、可测试、依赖明确                          |
| G-07 | 安全         | 不自动上传用户数据，插件隔离，路径访问受控        |

### 1.4 术语与缩写

| 术语       | 说明                                    |
| ---------- | --------------------------------------- |
| SRS        | 软件需求规格说明书                      |
| SDD        | 软件设计文档                            |
| CST        | Concrete Syntax Tree，具体语法树        |
| IPC        | Inter-Process Communication，进程间通信 |
| Rope       | 一种适合大文本编辑的树状文本数据结构    |
| ViewPlugin | CodeMirror 6 的视图层扩展机制           |
| Decoration | CodeMirror 6 的装饰器，用于标记文本范围 |
| IME        | Input Method Editor，输入法             |
| WASM       | WebAssembly                             |
| UI         | User Interface，用户界面                |

### 1.5 参考文档

见「附录 B 参考文档」。配套需求文档为《Nota 软件需求规格说明书》（下称 SRS），两者共同构成 Nota 的设计基线。

### 1.6 实现现状

> **本节是全文唯一描述「已落地代码」的章节。** 第 2–12 章描述目标架构，除第 4 章技术栈总览中标记为「已落地」的条目外，其余均为**规划内容，尚未实现**。

截至 V0.2，仓库处于 **V0.1 原型起步阶段**：Tauri 2 + Vue 3 脚手架与前端工具链已落地并验证通过，产品功能尚未开始实现。

#### 1.6.1 已落地

| 项           | 实际状态                                                                      |
| ------------ | ----------------------------------------------------------------------------- |
| 桌面框架     | Tauri 2（CLI 2.12.1；`tauri` crate 2.12.2）                                   |
| 前端框架     | Vue 3.5.43 + TypeScript 6.0.3                                                 |
| 构建与工具链 | Vite+ 1.1.0；`vite` 是 `@voidzero-dev/vite-plus-core@1.1.0` 的别名            |
| 工具链命令   | `vp dev` / `vp build` / `vp preview`；`vp check` = oxfmt 格式化 + oxlint 检查 |
| Tauri 插件   | 仅 `tauri-plugin-opener`（Rust）与 `@tauri-apps/plugin-opener`（前端）        |
| Rust 侧命令  | 仅脚手架自带的 `greet` 演示命令                                               |
| 前端页面     | 仅脚手架默认页（`src/App.vue` 调用 `invoke("greet")`）                        |
| 窗口与标识   | 1200×800（最小 640×400）；`identifier = io.github.hilariouhiss.nota`；dev 端口 1420；产物目录 `../dist`      |
| 类型检查     | `vue-tsc -b`；tsconfig 为 solution 结构（app / node 两个子项目）              |
| 版本控制     | git 已初始化并接入远端 `git@github.com:hilariouhiss/Nota.git`（30+ 提交，已推送） |

#### 1.6.2 尚未落地

第 5–9 章描述的全部组件、接口、数据实体与流程**均未实现**；第 4 章中标「规划」的技术（CodeMirror 6、Naive UI、Pinia、Tree-sitter、ropey、encoding_rs 等）**均未安装**。功能需求的实现状态以 SRS 第 3 章为准。

---

## 2. 架构概览

### 2.1 架构风格

Nota 采用**分层架构（Layered Architecture）** 与 **前后端分离** 相结合的设计风格：

- **前端层（WebView）**：负责用户交互、文本渲染、输入处理。
- **通信层（IPC）**：负责前后端数据交换，区分请求-响应、事件与流式通道。
- **后端层（Rust）**：负责语法分析、文件 I/O、编码转换、搜索等 CPU/I/O 密集任务。

核心设计原则：

> **渲染归前端，语义归后端，数据以二进制帧高效传输。**

### 2.2 总体架构图

```text
┌───────────────────────────────────────────────────────────────────┐
│                        前端层（WebView）                            │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Vue 3 + TypeScript + Vite + Naive UI                        │  │
│  │  ├── 周边 UI：标签栏、菜单、设置、状态栏、搜索面板              │  │
│  │  └── 编辑渲染：CodeMirror 6                                   │  │
│  │       ├── 文本缓冲区、光标、选择、IME                          │  │
│  │       ├── 自定义 ViewPlugin（接收 Rust 高亮/折叠）              │  │
│  │       └── Decoration 应用与主题映射                            │  │
│  └─────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────┤
│                        通信层（IPC）                                │
│  ├── Command（请求-响应）：文件 I/O、编码转换、插件管理              │
│  ├── Event（事件通知）：文件变更、插件状态、错误提示                  │
│  └── Channel + 二进制帧：文本变更 → 语法结果（高频低延迟）            │
├───────────────────────────────────────────────────────────────────┤
│                        后端层（Rust）                               │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  ├── Tree-sitter 语法服务：增量解析、CST、查询执行            │  │
│  │  ├── 文本缓冲区（ropey）：影子 Rope，与前端字节级同步         │  │
│  │  ├── 文件系统服务（tauri-plugin-fs）                          │  │
│  │  ├── 编码转换服务（encoding_rs）                              │  │
│  │  ├── 搜索服务（regex + ignore + grep）                        │  │
│  │  └── 插件系统（libloading）                                   │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### 2.3 分层职责

| 层次   | 职责                                           | 不负责                       |
| ------ | ---------------------------------------------- | ---------------------------- |
| 前端层 | 文本渲染、光标、选择、IME、周边 UI、装饰器应用 | 语法分析、文件读写、编码转换 |
| 通信层 | 数据编解码、通道管理、背压控制、过期丢弃       | 业务逻辑                     |
| 后端层 | 语法解析、文件 I/O、编码、搜索、插件加载       | 文本渲染、用户交互           |

### 2.4 关键架构约束

| 编号   | 约束                             |
| ------ | -------------------------------- |
| ARC-01 | 前端不承担语法分析职责           |
| ARC-02 | 后端不承担文本渲染职责           |
| ARC-03 | 高频语法数据不得使用 JSON 序列化 |
| ARC-04 | 核心编辑功能不依赖网络           |
| ARC-05 | 插件异常不得导致主程序崩溃       |
| ARC-06 | 便携模式不得强制写入系统注册表   |

> 本表编号使用 `ARC-` 前缀，以避免与 SRS 附录 A 的验收标准编号 `AC-` 冲突。

---

## 3. 架构设计决策

本章记录关键技术决策及其依据。

### 3.1 决策清单

| 编号  | 决策项           | 选择                      | 依据                                         |
| ----- | ---------------- | ------------------------- | -------------------------------------------- |
| AD-01 | 桌面框架         | Tauri 2                   | 轻量、体积小、内存低、Rust 生态              |
| AD-02 | 前端框架         | Vue 3                     | 团队熟悉度优先；框架非性能瓶颈               |
| AD-03 | 编辑渲染         | CodeMirror 6              | 输入法/光标/滚动成熟，扩展机制灵活           |
| AD-04 | 语法引擎         | Tree-sitter（Rust 侧）    | 增量解析、语法感知、多语言统一               |
| AD-05 | Tree-sitter 绑定 | tree-house                | Helix 生产验证，内置 ropey 与 injection 处理 |
| AD-06 | 文本缓冲区       | ropey（Rust 侧影子 Rope） | Tree-sitter 需字节级编辑描述                 |
| AD-07 | 高频 IPC 编码    | 二进制帧（tauri-wire）    | 编解码速度提升 28–33 倍，体积减少 44%        |
| AD-08 | 文件 I/O         | tauri-plugin-fs           | 官方维护，权限模型完善                       |
| AD-09 | 编码转换         | encoding_rs               | Mozilla 维护，支持主流中文编码               |
| AD-10 | 插件机制         | libloading 动态库         | 性能接近原生，Rust 生态一致                  |
| AD-11 | UI 组件库        | Naive UI                  | 轻量、TypeScript 原生、主题定制能力强        |

### 3.2 关键决策说明

#### AD-01 桌面框架选择 Tauri 2

Tauri 2 使用系统 WebView 渲染界面，不打包 Chromium，安装包体积仅为 Electron 的 1/10 至 1/4，空闲内存占用约为 Electron 的 1/5。这与 Nota 的轻量定位直接契合。

#### AD-02 前端框架选择 Vue 3

候选框架在编辑场景下均能满足需求。编辑区渲染由 CodeMirror 6 独立承担，框架本身不处于性能关键路径，因此选型以团队熟悉度为优先依据——Vue 3 的 Composition API 与 TypeScript 支持成熟，可降低开发与长期维护成本。

#### AD-03 编辑渲染选择 CodeMirror 6

CodeMirror 6 的架构允许完全绕过其内置 Lezer 解析器，通过 `StateField` / `ViewPlugin` 与 `Decoration` 系统动态应用外部高亮结果。这是 Nota 将语法分析下沉到 Rust 侧的前提。

#### AD-04 语法引擎选择 Tree-sitter

Tree-sitter 提供增量解析、错误容忍和统一的语法查询机制（`.scm` 文件）。相比 Scintilla 的词法规则模式，Tree-sitter 能提供语法结构感知的高亮、折叠与导航能力，是 Nota 差异化的技术基础。

#### AD-05 Tree-sitter 绑定选择 tree-house

tree-house 在 Helix 编辑器中经过生产验证，内置 ropey 集成与 injection（嵌套语言）处理，可避免自行实现绑定层与文本缓冲同步逻辑。

#### AD-06 引入影子 Rope

CodeMirror 6 的文档模型基于字符位置，而 Tree-sitter 基于字节偏移。Rust 侧维护一份与前端字节级同步的影子 Rope，用于生成 Tree-sitter 所需的 `InputEdit` 描述，是增量解析正确性的保证。

#### AD-07 高频 IPC 使用二进制帧

语法结果数据在每次击键后可能包含数百个高亮范围。JSON 序列化与解析的开销会累积成可感知延迟。二进制帧协议显著降低编解码成本与传输体积。

#### AD-08 文件 I/O 选择 tauri-plugin-fs

官方维护的插件，权限模型完善（基于 base directory 的访问控制与路径遍历防护），与 Tauri 2 的能力（capability）体系直接集成，无需自行实现路径校验。

#### AD-09 编码转换选择 encoding_rs

由 Mozilla 维护，是 Firefox 使用的编码实现，覆盖 GBK、GB18030 等主流中文编码；配套 chardetng 提供编码检测，可满足中文环境的乱码防护要求。

#### AD-10 插件机制选择 libloading 动态库

以 Rust 动态库作为插件载体，性能接近原生实现，且与主程序共享同一套类型与内存模型，无需引入脚本引擎或跨语言桥接。

#### AD-11 UI 组件库选择 Naive UI

Nota 的 UI 组件库需要满足轻量、高性能、TypeScript 友好、主题定制能力强等要求。Naive UI 全量使用 TypeScript 编写，提供基于配置对象的声明式主题系统，支持 Tree Shaking，且内置虚拟滚动等性能优化。这些特性与 Nota 的轻量定位和深度定制需求高度契合。

Element Plus 生态最成熟，但设计风格偏传统中后台，深度定制成本较高；TDesign Vue Next 对桌面端交互优化较好，可作为备选方案。综合评估后，选择 Naive UI 作为首选 UI 组件库。

**适用范围**：AD-11 只决定选用哪个组件库，**不决定用多少**。Naive UI 在 Nota 中的实际使用边界已于 V0.4 收窄至对话框与反馈层（含 `n-icon`），见 §4.2.10 与《Nota UI 设计规范》§5.1。

---

## 4. 技术栈选型

### 4.1 技术栈总览

「已落地」表示该版本已在当前仓库中实际安装并可验证（见 §1.6）；「规划」表示仅完成选型，尚未安装。

| 层次               | 技术                         | 版本                        | 职责                       | 状态   |
| ------------------ | ---------------------------- | --------------------------- | -------------------------- | ------ |
| 桌面框架           | Tauri                        | 2.12                        | 窗口、IPC、插件、系统集成  | 已落地 |
| 后端语言           | Rust                         | edition 2021（实测 1.99.0） | 语法分析、I/O、编码、搜索  | 已落地 |
| 前端框架           | Vue                          | 3.5.43                      | 周边 UI 编排               | 已落地 |
| 前端语言           | TypeScript                   | 6.0.3                       | 类型安全                   | 已落地 |
| 构建与工具链       | Vite+                        | 1.1.0                       | 构建、热更新、格式化、检查 | 已落地 |
| SFC 编译与类型检查 | @vitejs/plugin-vue / vue-tsc | 6.0.9 / 3.3.12              | SFC 编译、模板类型检查     | 已落地 |
| 包管理器           | pnpm                         | 12.3.4                      | 依赖管理                   | 已落地 |
| 状态管理           | Pinia                        | 2.2+                        | 前端状态管理               | 规划   |
| UI 组件库          | Naive UI                     | 2.x                         | 对话框与反馈层（含 `n-icon`） | 规划   |
| 界面图标           | @vicons/fluent               | 0.13.0                      | 界面图标（Naive UI 推荐的 xicons 项目） | 规划   |
| 编辑渲染           | CodeMirror                   | 6.x                         | 文本渲染、光标、选择、IME  | 规划   |
| 语法引擎           | Tree-sitter                  | 0.25+                       | 增量解析、CST              | 规划   |
| Tree-sitter 绑定   | tree-house                   | 0.1+                        | 高亮器与 ropey 集成        | 规划   |
| 语法包管理         | skidder                      | 0.1+                        | grammar 包管理             | 规划   |
| 文本缓冲区         | ropey                        | 1.6+                        | 影子 Rope                  | 规划   |
| 编码转换           | encoding_rs                  | 0.8+                        | 编码检测与转换             | 规划   |
| 搜索               | regex / ignore / grep        | 最新稳定                    | 正则、遍历、搜索           | 规划   |
| 大文件             | memmap2                      | 0.9+                        | 内存映射                   | 规划   |
| IPC 编码           | tauri-wire                   | 0.1+                        | 二进制帧协议               | 规划   |
| 插件加载           | libloading                   | 0.8+                        | 动态库加载                 | 规划   |

### 4.2 各层选型说明

#### 4.2.1 桌面框架：Tauri 2

| 项目      | 说明                                                        |
| --------- | ----------------------------------------------------------- |
| 版本      | 2.x（当前实测：CLI 2.12.1、\`tauri\` crate 2.12.2）         |
| Rust 版本 | edition 2021；当前开发环境实测 1.99.0                       |
| 核心能力  | 多窗口、IPC 通道、插件系统、权限模型                        |
| 关键特性  | v2 权限模型、`ipc::Response` 返回 `Vec<u8>`、`Channel` 推流 |

#### 4.2.2 前端框架：Vue 3 + TypeScript + Vite

| 项目       | 说明                                                                    | 状态   |
| ---------- | ----------------------------------------------------------------------- | ------ |
| Vue 版本   | 3.5.43，使用 Composition API                                            | 已落地 |
| TypeScript | 6.0.3，严格模式                                                         | 已落地 |
| 构建工具   | Vite+ 1.1.0（`vite` 为 `@voidzero-dev/vite-plus-core@1.1.0` 别名）      | 已落地 |
| 类型检查   | `vue-tsc -b`；tsconfig 为 solution 结构（tsconfig.app / tsconfig.node） | 已落地 |
| 状态管理   | Pinia                                                                   | 规划   |
| 工具库     | VueUse                                                                  | 规划   |
| UI 组件    | Naive UI                                                                | 规划   |

Vue 在架构中承担编辑器周边 UI 的编排职责，编辑区本身由 CodeMirror 6 独立管理，Vue 通过事件与状态协调。

构建命令统一由 Vite+ 提供：`vp dev`（开发服务器）、`vp build`（生产构建）、`vp preview`（预览）、`vp check`（格式化 + 检查）。详见 §4.2.11。

#### 4.2.3 编辑渲染：CodeMirror 6

| 项目     | 说明                                                       |
| -------- | ---------------------------------------------------------- |
| 版本     | 6.x                                                        |
| 启用功能 | 文本渲染、光标、选择、滚动、IME、Decoration                |
| 禁用功能 | 内置 Lezer 语法高亮                                        |
| 扩展机制 | `StateField`、`ViewPlugin`、`Decoration`、`HighlightStyle` |

#### 4.2.4 语法引擎：Tree-sitter（Rust 侧）

| 项目       | 说明                                                    |
| ---------- | ------------------------------------------------------- |
| 核心 crate | `tree-sitter` 0.25+                                     |
| 绑定层     | `tree-house`（Helix 生产验证）                          |
| 语法包管理 | `skidder`                                               |
| 查询文件   | `highlights.scm`、`folds.scm`、`tags.scm`、`locals.scm` |
| 集成方式   | Rust 侧独立语法服务，不直接接触前端渲染                 |

#### 4.2.5 文本缓冲区：ropey

| 项目     | 说明                                        |
| -------- | ------------------------------------------- |
| crate    | `ropey` 1.6+                                |
| 职责     | 影子 Rope 存储、字节偏移转换、增量编辑记录  |
| 同步机制 | 前端文档变更经 IPC 后在 Rust 侧应用相同编辑 |

#### 4.2.6 文件 I/O：tauri-plugin-fs

| 项目       | 说明                                         |
| ---------- | -------------------------------------------- |
| Rust crate | `tauri-plugin-fs`                            |
| 前端包     | `@tauri-apps/plugin-fs`                      |
| 核心能力   | 文本/二进制文件读写、目录遍历                |
| 安全机制   | 阻止路径遍历，基于 base directory 的访问控制 |

#### 4.2.7 编码转换：encoding_rs

| 项目     | 说明                                               |
| -------- | -------------------------------------------------- |
| crate    | `encoding_rs`                                      |
| 支持编码 | UTF-8、UTF-8 BOM、GBK、GB18030、ANSI、UTF-16 LE/BE |
| 辅助检测 | `chardetng`                                        |

#### 4.2.8 搜索服务：regex + ignore + grep

| 功能           | crate                |
| -------------- | -------------------- |
| 单文件正则替换 | `regex`              |
| 跨文件搜索     | `ignore` + `grep`    |
| 大文件搜索     | `memmap2` + 流式匹配 |

#### 4.2.9 IPC 编码：tauri-wire

| 项目     | 说明                                                           |
| -------- | -------------------------------------------------------------- |
| 职责     | 二进制帧编解码                                                 |
| 性能收益 | 编码速度提升约 28 倍，解码速度提升约 33 倍，线路体积减少约 44% |
| 适用场景 | 高频语法数据传输                                               |

#### 4.2.10 UI 组件库：Naive UI

| 项目     | 说明                                         |
| -------- | -------------------------------------------- |
| 版本     | 2.x                                          |
| 语言     | TypeScript 全量编写                          |
| 核心能力 | 基础组件、主题系统、虚拟滚动、Tree Shaking   |
| 主题定制 | 基于配置对象的声明式主题，支持深度定制       |
| 适用场景 | 轻量桌面工具、SaaS、仪表盘、追求设计感的项目 |

Naive UI 在 Nota 中**仅用于对话框与反馈层**（V0.4 收窄，依据见《Nota UI 设计规范》§5.1 与原则 P1）：设置／关于／快捷键／确认对话框，以及通知宿主。

窗口骨架——菜单栏、工具栏、标签栏、状态栏、底部面板容器——**均为自定义组件**，只读设计令牌。收窄的理由：这些区域在候选组件库中都没有对应物（菜单栏是带下拉与助记符的横向栏；编辑器的标签栏要承载未保存标记与拖拽排序；状态栏完全定制），强行套用需覆盖组件库的尺寸体系；而 Naive UI 的价值集中在表单与反馈。

唯一的组件级例外是 `n-icon`：它是 1em 见方、`fill: currentColor` 的 `<i>` 容器，不携带尺寸体系，用于统一承载全部图标（见 UI 设计规范 §6.5）。

编辑区本身由 CodeMirror 6 独立管理，Naive UI 不介入文本渲染。查找替换与跨文件搜索**不再是并列的独立组件**，而是底部统一面板（DockPanel）的两个页签（见 UI 设计规范 §3.2）。

#### 4.2.11 构建与工具链：Vite+（已落地）

| 项目       | 说明                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| 版本       | Vite+ 1.1.0（`vite-plus`）                                                                                     |
| 组成       | 统一封装 Vite、Rolldown、Vitest、Oxlint、Oxfmt、tsdown                                                         |
| Vite 来源  | `vite` 依赖被别名到 `@voidzero-dev/vite-plus-core@1.1.0`，由 `pnpm-workspace.yaml` 的 catalog / overrides 固定 |
| 命令       | `vp dev`、`vp build`、`vp preview`、`vp check`、`vp test`                                                      |
| 检查       | `vp check` = Oxfmt 格式化 + Oxlint 检查（含 type-aware 规则）                                                  |
| 格式化范围 | `vite.config.ts` 的 `fmt.ignorePatterns` 排除 `src-tauri/**`、`docs/**`、`dist/**`                             |
| 类型检查   | 由 `vue-tsc -b` 负责，构建脚本中执行                                                                           |

两点实现约束值得记录：

1. **`vite` 是别名而非真实包。** `@vitejs/plugin-vue` 声明 peer 依赖 `vite ^5||^6||^7||^8`，与别名后的 `1.1.0` 版本号天然不符，因此 `pnpm-workspace.yaml` 中设置 `peerDependencyRules.allowAny: [vite]`。这是 Vite+ 的既定默认配置，新建 Vite+ 项目同样如此，并非本项目特有的兼容补丁。
2. **`vp check` 的类型检查不覆盖 `.vue` 单文件组件。** 实测在 `<script setup>` 中写入类型错误时 `vp check` 仍然通过，而 `vue-tsc -b` 能正确报错。因此类型安全以 `vue-tsc -b` 为准，`vp check` 不作为 SFC 类型检查的依据。

---

## 5. 组件设计

### 5.1 前端组件

| 组件                  | 职责                                                  | 里程碑 |
| --------------------- | ----------------------------------------------------- | ------ |
| AppShell              | 六区域网格编排、快捷键分发、令牌注入                  | M1     |
| MenuBar               | 顶层菜单 + 下拉 + 快捷键提示 + 键盘导航               | M1     |
| ToolBar               | 按钮组 + 尾部溢出菜单                                 | M1     |
| TabBar                | 标签显示／切换／关闭／未保存标记；拖拽排序（FR-11）   | M1→M3  |
| EditorHost            | CodeMirror 6 封装，管理编辑视图生命周期               | M1     |
| DockPanel             | 底部统一容器：页签条 + 内容区 + 拖拽调高 + 折叠       | M1/M4  |
| StatusBar             | 行列号、编码、换行符、语言模式；左侧只读、右侧可点击  | M1     |
| EditorThemeBridge     | 令牌 → CodeMirror 主题与高亮样式（不产生 DOM）        | M1     |
| NotificationHost      | 提示与通知宿主                                        | M2     |
| ConfirmDialog         | 关闭未保存文件的确认                                  | M3     |
| FindReplacePage       | DockPanel 页签内容之一                                | M4     |
| SettingsDialog        | 主题、字体、快捷键、自动保存、配置导入导出            | M5     |
| AboutDialog           | 版本号、许可、更新说明入口（OR-03）                   | M5     |
| ShortcutsDialog       | 快捷键说明（OR-01）                                   | M5     |
| SyntaxHighlightPlugin | 自定义 ViewPlugin，接收并应用 Rust 高亮结果           | M6     |
| CrossFileSearchPage   | DockPanel 页签内容之二                                | M7     |
| FoldsExtension        | 折叠扩展，接收 Rust 折叠区域                          | M7     |
| PluginManager         | 插件安装、启用、禁用、卸载                            | M9     |

> 表内 M1～M5 的 14 项为 **V1.0 范围**，M6 起按版本续列。完整视觉与交互定义见《Nota UI 设计规范》第 5 章。
>
> `SettingsDialog`／`AboutDialog`／`ShortcutsDialog`／`ConfirmDialog`／`NotificationHost` 是 **Naive UI 唯一出现的地方**；其余骨架组件与两个页签组件均自定义，只读设计令牌（§4.2.10）。图标统一经 `n-icon` 承载，不产生独立组件（UI 设计规范 §6.5）。

### 5.2 后端模块

| 模块               | 职责                       |
| ------------------ | -------------------------- |
| commands/file_ops  | 打开、保存、另存、最近文件 |
| commands/encoding  | 编码检测与转换             |
| commands/search    | 跨文件搜索                 |
| commands/session   | 会话恢复与备份             |
| syntax/service     | 语法服务主循环             |
| syntax/buffer      | 影子 Rope 管理             |
| syntax/highlighter | 高亮查询执行               |
| syntax/folds       | 折叠区域计算               |
| syntax/languages   | 语言注册与检测             |
| ipc/channels       | Channel 管理               |
| ipc/wire           | tauri-wire 消息类型定义    |
| plugins/loader     | 插件动态加载与隔离         |

### 5.3 组件交互关系

```text
前端 Editor ──► SyntaxHighlightPlugin ──► IPC Channel ──► 后端 syntax/service
                                                              │
                                                              ├── syntax/buffer
                                                              ├── syntax/highlighter
                                                              └── syntax/folds
                                                                     │
前端 Editor ◄── Decoration 应用 ◄── IPC Channel ◄────────────────────┘

前端周边 UI（Naive UI）──► Pinia Store ──► Tauri Command ──► 后端 commands/*
```

### 5.4 尚缺组件设计的需求

以下 SRS 功能需求在第 5 章尚无对应的组件或模块设计。它们已由第 12 章分配到具体版本，但设计工作需在进入对应版本前补齐：

| 需求         | 内容                 | 计划版本 | 需明确的问题                                              |
| ------------ | -------------------- | -------- | --------------------------------------------------------- |
| FR-31～FR-33 | 宏录制、回放与管理   | V2.0     | 宏录制器与宏文件存储模块；录制边界是否包含跨标签操作      |
| FR-47～FR-48 | 命令行打开与行号跳转 | V2.0     | 单实例/多实例语义；参数解析放在 Rust 侧启动流程的哪个阶段 |
| FR-49～FR-50 | 打印与导出           | V2.0     | 由 WebView 打印能力承担，还是由 Rust 侧生成 HTML/PDF      |
| FR-52        | 多语言界面           | V1.2     | 前端 i18n 方案；语言包格式与加载时机                      |

---

## 6. 接口设计

### 6.1 IPC 通道分类

| 通道类型  | Tauri 原语         | 用途                           | 数据量     | 频率 |
| --------- | ------------------ | ------------------------------ | ---------- | ---- |
| 请求-响应 | Command            | 打开、保存、编码转换、插件管理 | 单次，中量 | 低   |
| 事件      | Event              | 文件变更、插件状态、错误提示   | 小         | 低   |
| 流式通道  | Channel + 二进制帧 | 文本变更 → 语法结果            | 高频       | 高   |

### 6.2 Command 接口清单

| 接口名                | 输入                    | 输出                           | 说明       |
| --------------------- | ----------------------- | ------------------------------ | ---------- |
| `open_file`           | path                    | content, encoding, line_ending | 打开文件   |
| `save_file`           | path, content, encoding | success                        | 保存文件   |
| `detect_encoding`     | bytes                   | encoding                       | 编码检测   |
| `convert_encoding`    | content, from, to       | bytes                          | 编码转换   |
| `search_in_directory` | query, dir, options     | Channel\<SearchResult\>        | 跨文件搜索 |
| `load_session`        | —                       | session                        | 加载会话   |
| `save_session`        | session                 | success                        | 保存会话   |
| `load_plugin`         | plugin_path             | plugin_info                    | 加载插件   |
| `unload_plugin`       | plugin_id               | success                        | 卸载插件   |

### 6.3 二进制帧协议

#### 6.3.1 帧结构

```text
[帧头: 16 字节]
  magic: u32        (0x53435242 "SCRB")
  version: u16      (协议版本)
  msg_type: u16     (1=highlights, 2=folds, 3=tags)
  item_count: u32   (数据项数量)
  generation: u64   (文档版本号)

[数据体: 每项 12 字节]
  start_byte: u32
  end_byte: u32
  tag_id: u32       (语义标签 ID)
```

#### 6.3.2 消息类型

| msg_type | 说明     | 数据项                          |
| -------- | -------- | ------------------------------- |
| 1        | 高亮范围 | start_byte, end_byte, tag_id    |
| 2        | 折叠区域 | start_byte, end_byte, fold_kind |
| 3        | 符号标签 | start_byte, end_byte, symbol_id |

#### 6.3.3 语义标签映射

语义标签（tag_id）映射到标准化的高亮类别，前端通过 `HighlightStyle` 将其映射到实际颜色。标签集合与 Tree-sitter 社区约定对齐。

### 6.4 防抖与背压策略

| 策略     | 说明                                          |
| -------- | --------------------------------------------- |
| 输入防抖 | 连续输入 50–80ms 无新变更后才发送解析请求     |
| 过期丢弃 | 请求与结果均携带 generation，前端丢弃过期结果 |
| 解析取消 | 新编辑到达时取消进行中的 Tree-sitter 解析     |
| 流式限流 | Channel 流式数据在超过阈值时合并发送          |

---

## 7. 数据设计

### 7.1 持久化数据实体

| 实体     | 内容                         | 存储格式  | 位置               |
| -------- | ---------------------------- | --------- | ------------------ |
| 配置文件 | 字体、主题、快捷键、自动保存 | TOML/JSON | 用户目录或程序目录 |

> 配置格式统一为 **TOML/JSON**（TOML 承载用户手写配置，JSON 承载程序读写）。SRS 3.4 节与此保持一致，不再使用 XML/INI。
| 会话文件 | 打开文件、光标、标签顺序     | 专用格式  | 用户目录或程序目录 |
| 最近文件 | 路径、时间                   | JSON      | 配置目录           |
| 备份文件 | 未保存内容、崩溃恢复         | 专用格式  | 临时目录或程序目录 |
| 插件配置 | 启用状态、参数               | JSON      | 插件目录           |
| 主题文件 | 颜色、样式                   | 主题文件  | 主题目录           |
| 宏文件   | 录制操作                     | JSON      | 宏目录             |
| 日志文件 | 运行日志、错误               | 文本      | 日志目录           |

### 7.2 数据设计约束

| 编号  | 约束                             |
| ----- | -------------------------------- |
| DD-01 | 配置文件应可导入导出             |
| DD-02 | 便携模式下所有数据保存在程序目录 |
| DD-03 | 备份文件不得无限增长             |
| DD-04 | 不得在未授权情况下上传用户数据   |
| DD-05 | 会话文件应支持崩溃后恢复         |

---

## 8. 关键流程设计

### 8.1 打开文件流程

```text
用户选择文件
  → 前端调用 Command: open_file(path)
  → 后端 tauri-plugin-fs 读取字节
  → encoding_rs 检测并解码
  → 返回 content + encoding + line_ending
  → 前端 CodeMirror 设置文档
  → 前端通过 Channel 发送全量文本
  → 后端 Tree-sitter 首次解析
  → 返回高亮与折叠数据
  → 前端应用 Decoration
```

### 8.2 输入编辑流程

```text
用户击键
  → CodeMirror 更新文档
  → 前端计算变更范围（from/to + insertedText）
  → 防抖 50–80ms
  → Channel 发送变更描述（二进制帧）
  → 后端影子 Rope 应用编辑 → InputEdit
  → Tree-sitter 增量解析
  → 执行查询 → 高亮 + 折叠
  → 返回二进制帧
  → 前端 ViewPlugin 映射并应用 Decoration
```

### 8.3 跨文件搜索流程

```text
用户输入搜索条件
  → 前端调用 Command: search_in_directory
  → 后端 ignore::WalkBuilder 遍历目录
  → grep::Searcher 搜索
  → Channel 流式返回结果
  → 前端实时更新结果列表
```

### 8.4 保存文件流程

```text
用户保存
  → 前端调用 Command: save_file(path, content, encoding)
  → 后端 encoding_rs 编码
  → tauri-plugin-fs 写入
  → 返回成功
  → 前端更新状态栏
```

---

## 9. 非功能设计

### 9.1 性能设计

| 场景               | 策略                                                |
| ------------------ | --------------------------------------------------- |
| 首次解析           | 后台线程执行，UI 不阻塞                             |
| 增量解析           | Tree-sitter 原生增量，只重解析变更范围              |
| 高亮更新           | 防抖 50–80ms，过期丢弃                              |
| 大文件（>10MB）    | 关闭实时语法高亮，提供手动触发                      |
| 超大文件（>100MB） | memmap2 内存映射，仅加载可见区域                    |
| 跨文件搜索         | 多线程并行遍历，结果流式返回                        |
| 编码检测           | 前 64KB 启发式检测，全文件验证后台进行              |
| IPC 传输           | 二进制帧；文件内容用 `ipc::Response` 返回 `Vec<u8>` |
| 解析取消           | 新编辑到达时取消进行中的解析                        |
| UI 渲染            | Naive UI Tree Shaking 与虚拟滚动                    |

### 9.2 可靠性设计

| 编号   | 设计                             |
| ------ | -------------------------------- |
| REL-01 | 崩溃后自动恢复未保存内容         |
| REL-02 | 插件异常通过 `catch_unwind` 隔离 |
| REL-03 | 文件写入采用临时文件 + 原子替换  |
| REL-04 | 会话定期快照                     |

### 9.3 安全设计

| 编号   | 设计                                |
| ------ | ----------------------------------- |
| SEC-01 | 不自动上传用户文件内容              |
| SEC-02 | 检查更新与插件市场使用 HTTPS        |
| SEC-03 | 插件加载需用户确认                  |
| SEC-04 | 文件访问受 tauri-plugin-fs 路径约束 |
| SEC-05 | 不自动执行未知脚本                  |

### 9.4 可维护性设计

| 编号   | 设计                  |
| ------ | --------------------- |
| MNT-01 | 模块化分层，职责单一  |
| MNT-02 | 关键路径日志完整      |
| MNT-03 | 插件 API 稳定并有文档 |
| MNT-04 | 依赖版本集中管理      |

### 9.5 可扩展性设计

| 编号   | 设计                           |
| ------ | ------------------------------ |
| EXT-01 | Tree-sitter grammar 可动态安装 |
| EXT-02 | 插件动态库机制                 |
| EXT-03 | 主题与语言包可扩展             |
| EXT-04 | IPC 协议版本化，向后兼容       |

---

## 10. 部署与构建

### 10.1 构建环境

| 项目     | 要求                                                              |
| -------- | ----------------------------------------------------------------- |
| Rust     | edition 2021；当前开发环境实测 1.99.0                             |
| Node.js  | 22.18+ 或 24.11+（Vite+ 1.1.0 的 `engines` 约束）；实测 24.16.0   |
| 包管理器 | pnpm（实测 12.3.4；Vite+ 另托管 12.10.1，两者版本不一致时需留意） |
| 构建工具 | Vite+ 1.1.0（内含 Vite / Rolldown）、Tauri CLI 2                  |
| 目标平台 | Windows 10/11（优先），Linux/macOS（后续）                        |

### 10.2 构建产物

| 产物   | 说明             |
| ------ | ---------------- |
| 安装版 | MSI / NSIS       |
| 便携版 | 免安装目录       |
| 调试版 | 带日志与调试符号 |

### 10.3 构建流程

```text
安装依赖
  → 前端构建（Vite）
  → Rust 编译（Cargo）
  → Tauri 打包
  → 签名（可选）
  → 产物输出
```

### 10.4 部署模式

| 模式     | 配置位置            | 适用场景       |
| -------- | ------------------- | -------------- |
| 安装模式 | 用户目录            | 常规使用       |
| 便携模式 | 程序目录            | U 盘、离线环境 |
| 企业离线 | 程序目录 + 策略配置 | 企业部署       |

---

## 11. 风险与缓解

| 编号 | 风险                         | 影响       | 概率 | 缓解措施                                  |
| ---- | ---------------------------- | ---------- | ---- | ----------------------------------------- |
| R-01 | Rust 学习曲线高              | 开发进度   | 中   | 原型阶段先用前端编辑器验证，逐步下沉 Rust |
| R-02 | Tree-sitter 查询文件质量参差 | 高亮效果   | 中   | 优先选用社区成熟 grammar，必要时自行维护  |
| R-03 | 语法错误导致解析开销         | 性能       | 中   | 防抖、取消、版本号丢弃、错误状态降级      |
| R-04 | IPC 高频传输瓶颈             | 性能       | 低   | 二进制帧、防抖、合并发送                  |
| R-05 | WebView 跨平台差异           | 兼容性     | 中   | 逐平台测试，必要时降级渲染                |
| R-06 | 插件崩溃                     | 稳定性     | 中   | catch_unwind 隔离，插件沙箱               |
| R-07 | 大文件内存压力               | 稳定性     | 中   | memmap2、分块加载、功能降级               |
| R-08 | 依赖版本冲突                 | 构建       | 低   | 锁定版本，定期升级评审                    |
| R-09 | UI 组件库定制受限            | 设计一致性 | 低   | 选用 Naive UI，充分利用其主题系统         |

---

## 12. 版本演进规划

> **本节是版本计划的唯一权威来源。** SRS 的 2.6 节与附录 B 不再重复定义版本划分，只引用本节。
>
> 本节同时是**需求归属**（哪个需求落在哪个版本）的唯一来源。《Nota 应用实施计划》附录 A 按里程碑重新分组，但不改变需求所属的版本；两者已于 V0.3 逐条对齐。

| 版本                | 技术重点                                                                                       | 覆盖需求（SRS §3.2）                                                 | 语法支持                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| V0.1 原型（已完成） | Tauri 2 + Vue 3 脚手架跑通；Vite+ 工具链接入                                                   | —                                                                    | —                                         |
| V1.0                | CodeMirror 6 编辑区、Naive UI 周边 UI、Pinia；Rust 侧文件 I/O 与编码转换；查找替换；设置与主题 | FR-01～FR-02、FR-04～FR-15、FR-18～FR-23、FR-26～FR-30、FR-37～FR-44 | 无（纯文本编辑）                          |
| V1.1                | 接入 Tree-sitter（Rust 侧）、影子 Rope、二进制帧高亮与折叠通道                                 | FR-16～FR-17                                                         | Rust、Python、JS/TS、JSON、YAML、Markdown |
| V1.2                | 跨文件搜索、便携模式与多语言                                                                   | FR-03、FR-24～FR-25、FR-51～FR-53                                    | + C/C++、Java、Go、Shell、SQL、HTML/CSS   |
| V2.0                | 插件系统、宏、大文件模式、跨平台、语法包在线安装                                               | FR-31～FR-36、FR-45～FR-50 及 SRS 全部 C 级需求                      | + Vue、XML、TOML、INI；可在线安装 grammar |

需求归属的两点说明：

1. **FR-16（语法高亮）、FR-17（代码折叠）落在 V1.1**，因此 V1.0 是**纯文本编辑体验**，不含语法高亮。这不影响 V1.0 的验收：SRS 附录 A 的 AC-01～AC-12 均不依赖语法高亮。
2. **FR-18（括号匹配）、FR-19（当前行高亮）落在 V1.0**：二者由 CodeMirror 6 内置能力（`bracketMatching()`、`highlightActiveLine()`）提供，不依赖 Tree-sitter，提前交付不给 V1.1 增加返工。

---

## 附录 A 依赖清单

### A.1 Rust 依赖（已落地）

当前 `src-tauri/Cargo.toml` 的实际内容：

```text
[package]
name = "nota"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
codegen-units = 1
lto = true
opt-level = 3
panic = "abort"
strip = true
```

### A.2 Rust 依赖（规划）

```text
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-os = "2"

tree-sitter = "0.25"
tree-house = "0.1"
tree-house-bindings = "0.1"
skidder = "0.1"

ropey = "1.6"

encoding_rs = "0.8"
chardetng = "0.1"

regex = "1"
ignore = "0.4"
grep = "0.3"
memmap2 = "0.9"

tauri-wire = "0.1"

toml = "0.8"

libloading = "0.8"
anyhow = "1"
thiserror = "2"
log = "0.4"
env_logger = "0.11"
```

### A.3 前端依赖（已落地）

当前 `package.json` 的实际内容（`vite` 与 `vite-plus` 通过 catalog 锁定）：

```text
{
  "dependencies": {
    "vue": "^3.5.13",
    "@tauri-apps/api": "^2",
    "@tauri-apps/plugin-opener": "^2"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@types/node": "^24.19.1",
    "@vitejs/plugin-vue": "^6.0.7",
    "@vue/tsconfig": "^0.9.1",
    "typescript": "~6.0.3",
    "vite": "catalog:",
    "vite-plus": "catalog:",
    "vue-tsc": "^3.3.5"
  }
}
```

`pnpm-workspace.yaml` 的 catalog 将 `vite` 指向 `npm:@voidzero-dev/vite-plus-core@1.1.0`，`vite-plus` 指向 `1.1.0`。

### A.4 前端依赖（规划）

```text
{
  "dependencies": {
    "pinia": "^2.2",
    "@vueuse/core": "^11",
    "naive-ui": "^2",
    "@vicons/fluent": "^0.13.0",
    "codemirror": "^6",
    "@codemirror/state": "^6",
    "@codemirror/view": "^6",
    "@codemirror/commands": "^6",
    "@codemirror/search": "^6",
    "@tauri-apps/plugin-fs": "^2",
    "@tauri-apps/plugin-dialog": "^2"
  }
}
```

> **图标库选型**：`@vicons/fluent` 属 xicons 项目（Naive UI 官方 README 推荐的图标库），与本项目既有的 Naive UI 选型同源。选它而非 xicons 下其它图标集，依据是实测——紧凑密度把图标压到 15px，Fluent 的拟用图标全为填充型，缩放不产生亚像素描边；而 Naive UI 自身示例默认的 `@vicons/ionicons5` 在该尺寸下有效描边仅 0.94px。详见《Nota UI 设计规范》§6.5。
>
> **字体**：不引入内嵌字体包。`vfonts`（Naive UI 推荐的字体包）经实测不含中日韩字形（包内 9 个 TTF 字形数仅 851～1294），无法替代系统 CJK 字体，引入它只是在 Microsoft YaHei 之外再加一套拉丁字体。详见 UI 设计规范 §4.4.1。

---

## 附录 B 参考文档

> 术语表见 §1.4「术语与缩写」，此处不再重复。

1. 《Nota 软件需求规格说明书》（SRS）
2. IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications
3. [Tauri 2 Documentation](https://tauri.app)
4. [Vite+ Documentation](https://viteplus.dev)
5. [Oxc（Oxlint / Oxfmt）Documentation](https://oxc.rs)
6. [CodeMirror 6 Documentation](https://codemirror.net)
7. [Tree-sitter Documentation](https://tree-sitter.github.io)
8. [Helix Editor Architecture](https://helix-editor.com)
9. [Naive UI Documentation](https://www.naiveui.com)
