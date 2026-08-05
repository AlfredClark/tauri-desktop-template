import type { Config } from "@sveltejs/kit";
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

const config: Config = {
  // 使用vite的预处理器
  preprocess: vitePreprocess(),
  kit: {
    // 静态适配 + fallback = SPA 模式：所有路由回退到 index.html，
    // 由前端路由接管，适配 Tauri 本地文件加载场景
    adapter: adapter({
      fallback: "index.html",
    }),
    // 自定义别名：$libs 指向 src/libs
    alias: {
      $libs: "./src/libs",
      $components: "./src/components",
      $widgets: "./src/widgets",
    },
  },
};

export default config;
