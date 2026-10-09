import { defineConfig, lazyPlugins } from "vite-plus";
import vue from "@vitejs/plugin-vue";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: lazyPlugins(() => [vue()]),

  // Oxfmt scope. `src-tauri` is Rust/Cargo territory (Cargo.toml, tauri.conf.json),
  // `docs` holds hand-written design docs, and `dist` is build output.
  fmt: {
    ignorePatterns: ["src-tauri/**", "docs/**", "dist/**"],
  },

  // `vp check` also runs oxlint's type-aware pass. Note it only covers .ts/.tsx —
  // type errors inside `.vue` SFCs are caught by `vue-tsc` in the build script, not here.
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
