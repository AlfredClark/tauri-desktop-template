//! 工具模块统一出口。
//!
//! 目前仅含 updater（应用自动更新）；无自有类型契约（复用 npm 包类型），
//! 故省略 types.ts。

export { checkForUpdate, installUpdate } from "./updater";
