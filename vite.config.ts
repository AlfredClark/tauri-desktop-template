import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";

// TAURI_DEV_HOST：远程/移动端调试时传入目标主机地址
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [
    sveltekit(),
    // 国际化：编译 messages 生成 paraglide 运行时（src/lib/i18n/paraglide）
    paraglideVitePlugin({
      project: "./src/lib/i18n/project.inlang",
      outdir: "./src/lib/i18n/paraglide",
      emitTsDeclarations: true,
      // 纯内存策略：locale 真相源为 Rust config.json，禁止 paraglide 自行持久化（cookie/localStorage 等）
      strategy: ["globalVariable", "baseLocale"],
    }),
  ],

  clearScreen: false,
  server: {
    // dev 端口固定 1420，与 tauri.conf.json 的 devUrl 及 CSP 保持一致
    port: 1420,
    strictPort: true,
    host: host || false,
    // 通过 TAURI_DEV_HOST 访问时，HMR websocket 单独使用 1421 端口
    ws: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 避免监听 Rust 后端目录引发无谓的重启
      ignored: ["**/src-tauri/**"],
    },
  },
}));
