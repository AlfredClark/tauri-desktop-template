import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

// TAURI_DEV_HOST：远程/移动端调试时传入目标主机地址
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(() => ({
  plugins: [
    // Tailwind CSS v4：Vite 插件编译（无需 postcss 配置）
    tailwindcss(),
    sveltekit(),
    // 国际化：编译 messages 生成 paraglide 运行时（src/libs/i18n/paraglide）
    paraglideVitePlugin({
      project: "./src/libs/i18n/project.inlang",
      outdir: "./src/libs/i18n/paraglide",
      emitTsDeclarations: true,
      // locale 经 localStorage 跨 reload 存活（首帧渲染前即可解析正确语言）；
      // config.json 为持久真相源，changeLocale 双写保持两者一致，
      // 外部改动 config 导致失同步时 syncLocale 以 config 为准自愈（reload 一次）
      strategy: ["localStorage", "baseLocale"],
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
