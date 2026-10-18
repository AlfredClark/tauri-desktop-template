//! 结构化存储插件初始化：仅注册插件，模板不含业务表。
//!
//! 需要建表时在 `init()` 内用 `add_migrations` 追加版本化迁移；
//! 已发布迁移的 SQL 不得修改（老用户库已执行过，不会重跑）。
//! 前端经 `@tauri-apps/plugin-sql` 直连数据库，Rust 侧不设薄封装。

use tauri::{Runtime, plugin::Plugin};
use tauri_plugin_sql::Builder;

/// 结构化存储插件：桌面 / 移动通用，故在 `lib.rs` 直接注册，无需 `BuilderExt` 空实现。
pub fn init<R: Runtime>() -> impl Plugin<R> {
    Builder::default().build()
}
