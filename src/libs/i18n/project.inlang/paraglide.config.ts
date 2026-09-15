import { defineConfig } from "@inlang/paraglide-js";

// Paraglide 编译器选项的唯一来源：CLI（pnpm i18n:compile）与 vite 插件都读取本文件。
// 不要再把 outdir/strategy 等参数重复写进 package.json 或 vite.config.ts——两处各写一份必然漂移。
export default defineConfig({
  outdir: "./src/libs/i18n/paraglide",
  strategy: ["localStorage", "baseLocale"],
  emitTsDeclarations: true,
  cleanOutdir: true,
});
