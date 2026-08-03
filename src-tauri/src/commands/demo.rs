//! 演示命令：IPC 调用示例。

use crate::cores::response::Response;

/// IPC 命令示例：前端通过 `invokeCommand("greet", { name })` 调用。
/// @param name 用户输入的名称
/// @returns 问候语
#[tauri::command]
pub fn greet(name: &str) -> Response<String> {
    Response::ok(format!("Hello, {}! You've been greeted from Rust!", name))
}
