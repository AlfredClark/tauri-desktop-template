//! 示例命令：问候语薄封装，业务逻辑在 `features::demo`。

use crate::cores::types::CommandResult;
use crate::features::demo;

/// 演示命令：把入参转交给 `features::demo::greet` 处理。
///
/// `anyhow` 错误经 `From` 自动转为 `CommandError::Internal`。
#[tauri::command]
#[specta::specta]
pub fn greet(name: &str) -> CommandResult<String> {
    Ok(demo::greet(name)?)
}
