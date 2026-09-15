use crate::cores::types::{CommandError, CommandResult};
use crate::features::demo;

/// 演示命令：把入参转交给 `features::demo::greet` 处理。
///
/// `name` 为 `"123"` 时故意返回错误，用于演示前端 `.failed()` 分支与自动失败上报。
#[tauri::command]
#[specta::specta]
pub fn greet(name: &str) -> CommandResult<String> {
    if name == "123" {
        return Err(CommandError::Internal("Invalid argument".to_string()));
    }
    Ok(demo::greet(name))
}
