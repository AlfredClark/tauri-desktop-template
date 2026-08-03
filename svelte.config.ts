import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

import type { Config } from "@sveltejs/kit";

const config: Config = {
  preprocess: vitePreprocess(),
  kit: {
    // 静态适配 + fallback = SPA 模式：所有路由回退到 index.html，
    // 由前端路由接管，适配 Tauri 本地文件加载场景
    adapter: adapter({
      fallback: "index.html",
    }),
  },
};

export default config;
