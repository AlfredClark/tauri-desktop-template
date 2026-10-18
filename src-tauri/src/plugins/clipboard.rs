//! 剪贴板插件初始化：about 页经 `copy_system_info` 命令复制系统信息（纯文本）。

use tauri::{Runtime, plugin::Plugin};

/// 剪贴板插件：capability 显式放行 `allow-write-text`（默认集为空），
/// 后端命令只传纯文本，不碰图片与 HTML。
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_clipboard_manager::init()
}
