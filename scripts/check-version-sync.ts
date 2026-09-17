#!/usr/bin/env node
// 版本对齐检查：`.prettierrc` 的 `importOrderTypeScriptVersion` 必须与
// `package.json` 的 `typescript` 版本一致（见 AGENTS.md §10.4 成对维护表）。
// 由 `pnpm check` 自动执行，失配即红灯，避免 `pnpm update` 后的静默漂移。
// 本脚本只读文件、不写文件；退出码非零即失败。
// 注意：仅使用可擦除的类型语法，Node 24 可直接运行，无需编译。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root: string = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message: string): never {
  console.error(`[check:sync] ${message}`);
  process.exit(1);
}

const prettierrc: { importOrderTypeScriptVersion?: unknown } = JSON.parse(
  readFileSync(join(root, ".prettierrc"), "utf8"),
);
const pkg: { devDependencies?: Record<string, string> } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);

const prettierTs = prettierrc.importOrderTypeScriptVersion;
if (typeof prettierTs !== "string" || prettierTs.length === 0) {
  fail("在 .prettierrc 中找不到 importOrderTypeScriptVersion 字段");
}
const pkgTs = pkg.devDependencies?.typescript?.replace(/^[~^>=< ]+/, "");
if (typeof pkgTs !== "string" || pkgTs.length === 0) {
  fail("在 package.json 的 devDependencies 中找不到 typescript 字段");
}
if (prettierTs !== pkgTs) {
  fail(
    `版本漂移：.prettierrc 为 ${String(prettierTs)}，package.json 为 ${String(pkgTs)}，请同步两者`,
  );
}
console.log(`[check:sync] typescript 对齐通过：${String(prettierTs)}`);
