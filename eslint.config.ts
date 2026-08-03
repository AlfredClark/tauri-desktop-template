import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.ts";

export default defineConfig([
  {
    // 基础规则集：JS 推荐 + TS 推荐 + Svelte 推荐 + 与 prettier 兼容
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...svelte.configs.recommended,
      ...svelte.configs.prettier,
    ],
  },
  // 全局忽略：生成目录、构建产物与 Rust 后端
  globalIgnores([
    "build/",
    ".svelte-kit/",
    "package/",
    "node_modules/",
    "src-tauri/",
    "target/",
    "src/lib/i18n/paraglide/",
    "src/lib/i18n/project.inlang/",
    "**/.*",
  ]),
  {
    // 浏览器环境下的 TS 文件
    files: ["src/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    // Svelte 组件：使用 TS 解析器 + 浏览器 globals
    files: ["src/**/*.svelte"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
    },
  },
  {
    // Node 环境下的构建配置文件
    files: ["*.config.ts", "eslint.config.ts"],
    languageOptions: { globals: globals.node },
  },
  // 置于最后，关闭与 prettier 冲突的规则
  prettier,
]);
