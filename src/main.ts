import { createPinia } from "pinia";
import { createApp } from "vue";
import App from "./App.vue";
import { applyTokens } from "./design/apply";
import { LIGHT_TOKENS } from "./design/tokens";

// 窗口背景色由 Rust 侧按上次主题设置（见 Task 15），
// 这里注入的是同一套令牌，因此首帧不会出现异色
applyTokens(LIGHT_TOKENS);

createApp(App).use(createPinia()).mount("#app");
