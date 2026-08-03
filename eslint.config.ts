import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import svelte from "eslint-plugin-svelte";
import tseslint from "typescript-eslint";
import svelteConfig from "./svelte.config.ts";

export default defineConfig([
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...svelte.configs.recommended,
      ...svelte.configs.prettier,
    ],
  },
  globalIgnores(["build/", ".svelte-kit/", "package/", "node_modules/", "src-tauri/", "target/", "**/.*"]),
  {
    files: ["src/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
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
    files: ["*.config.ts", "eslint.config.ts"],
    languageOptions: { globals: globals.node },
  },
  prettier,
]);
