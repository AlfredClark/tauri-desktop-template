//! 更新模块统一出口：封装 tauri-plugin-updater 的检查、下载安装与重启流程。
//!
//! 复用 npm 包类型（Update），无自有类型契约，故省略 types.ts。

export { checkForUpdate, installUpdate } from "./utils";
export type { Update } from "@tauri-apps/plugin-updater";
