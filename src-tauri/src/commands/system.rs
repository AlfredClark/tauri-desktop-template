use crate::cores::system::{self, SystemInfo};
use crate::cores::types::CommandResult;

/// 采集运行平台信息；单项缺失时回落 `"unknown"`，绝不抛错
#[tauri::command]
#[specta::specta]
pub fn get_system_info() -> CommandResult<SystemInfo> {
    Ok(system::gather_system_info())
}
