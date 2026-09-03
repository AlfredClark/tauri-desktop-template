import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import svelte from "eslint-plugin-svelte";
import prettier from "eslint-config-prettier";
import svelteParser from "svelte-eslint-parser";
import svelteConfig from "./svelte.config.js";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores, includeIgnoreFile } from "eslint/config";

const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default defineConfig(
  // 包含 .gitignore
  includeIgnoreFile(gitignorePath),
  // 全局忽略配置
  globalIgnores(["node_modules/**"]),
  // 规则集扩展
  {
    extends: [
      js.configs.recommended,
      ...ts.configs.recommended,
      ...svelte.configs["flat/recommended"],
      prettier,
      ...svelte.configs["flat/prettier"],
    ],
  },
  // 全局默认运行环境
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // 前端 TS 源码配置
  {
    files: ["src/**/*.ts", "src/**/*.svelte.ts"],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Svelte 模板组件专有配置
  {
    files: ["src/**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: [".svelte"],
        svelteConfig,
      },
      globals: { ...globals.browser },
    },
  },

  // Node 脚本与配置文件
  {
    files: ["*.config.ts", "eslint.config.ts", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
);
