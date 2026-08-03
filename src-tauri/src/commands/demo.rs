//! 演示命令：IPC 调用示例。

use rust_i18n::t;

use crate::cores::response::Response;

/// IPC 命令示例：前端通过 `invokeCommand("greet", { name })` 调用。
/// 问候语经 rust-i18n 本地化（locale 由 config.json 驱动，见 cores/config.rs）。
/// @param name 用户输入的名称
/// @returns 问候语
#[tauri::command]
pub fn greet(name: &str) -> Response<String> {
    Response::ok(t!("greet", name = name).to_string())
}
