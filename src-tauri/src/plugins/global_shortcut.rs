//! 全局快捷键插件初始化（仅桌面端）：演示页经命令注册 / 注销一条固定快捷键。

use tauri::{Runtime, plugin::Plugin};

/// 全局快捷键插件（仅桌面端）：演示只注册固定键（见 `features::demo::DEMO_SHORTCUT`），
/// 不开放任意注册入口，避免派生项目误留快捷键劫持面；触发时以前端事件通知演示页。
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_global_shortcut::Builder::default().build()
}
