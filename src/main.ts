import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { applyTokens } from "./design/apply";
import { LIGHT_TOKENS } from "./design/tokens";

// AC-01 取证用：记录前端挂载时刻。这是 WebView 内的相对时间，
// 与 Rust 侧的进程启动时间戳相减即为冷启动耗时（见 scripts/measure-startup.ps1）
performance.mark("sp-frontend-boot");
console.info(`[startup] frontend ready at ${performance.now().toFixed(1)}ms`);

// 窗口背景色由 Rust 侧按上次主题设置（见 Task 15），
// 这里注入的是同一套令牌，因此首帧不会出现异色
applyTokens(LIGHT_TOKENS);

createApp(App).use(createPinia()).mount("#app");
