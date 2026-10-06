//! 文件对话框插件初始化：演示页经命令弹出系统选文件 / 存文件 / 选目录框。

use tauri::{Runtime, plugin::Plugin};

/// 文件对话框插件：只经后端命令调用，前端不直调 JS API，保持调用链收敛于 `libs/commands`。
///
/// 只用异步回调版（`pick_file`、`save_file`、`pick_folder` 配 `spawn_blocking` 转回异步）：
/// 同步命令跑在主线程，`blocking_*` 会与 `run_on_main_thread` 排队的弹窗任务死锁，
/// 此处禁止使用阻塞版，详见 `cores/demo.rs`。
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_dialog::init()
}
