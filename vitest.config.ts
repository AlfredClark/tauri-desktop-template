import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

// 单元测试配置：复用 SvelteKit 插件以继承 svelte.config.ts 的路径别名与 Svelte 编译能力，
// 因此这里不需要再抄一份 resolve.alias。
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
