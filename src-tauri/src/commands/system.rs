use crate::cores::system::{self, SystemInfo};
use crate::cores::types::CommandResult;

/// 采集运行平台信息；单项缺失时回落 `"unknown"`，绝不抛错
#[tauri::command]
#[specta::specta]
pub fn get_system_info() -> CommandResult<SystemInfo> {
    Ok(system::gather_system_info())
}

/// 真退出应用进程；调用后进程结束，结果体永不可达（按 `CommandResult<()>` 保持命令类型统一）
#[tauri::command]
#[specta::specta]
#[allow(clippy::needless_pass_by_value)]
pub fn quit_app(app: tauri::AppHandle) -> CommandResult<()> {
    system::quit_app(&app);
    Ok(())
}
