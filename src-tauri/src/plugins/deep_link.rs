//! 深链协议插件初始化（仅桌面端）。

use tauri::{Runtime, plugin::Plugin};

/// 深链插件（仅桌面端）：协议在 `tauri.conf.json` 的 `plugins.deep-link` 注册；
/// Win/Linux 的运行时注册在 `lib.rs` 的 `setup` 内完成，冷启动与运行中 URL
/// 经 `onOpenUrl` / `getCurrent` 到达前端，次实例的参数走单实例插件转发。
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_deep_link::init()
}
