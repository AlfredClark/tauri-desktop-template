import path from "path";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// 获取 TAURI_DEV_HOST
const host = process.env.TAURI_DEV_HOST;

// 参考：https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [tailwindcss(), await sveltekit()],
  // 防止 Vite 清空终端屏幕，保留 Rust 编译输出日志
  clearScreen: false,

  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    ws: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },

  resolve: {
    alias: {
      $assets: path.resolve("./src/assets"),
      $components: path.resolve("./src/components"),
      $hooks: path.resolve("./src/hooks"),
      $libs: path.resolve("./src/libs"),
    },
  },
}));
