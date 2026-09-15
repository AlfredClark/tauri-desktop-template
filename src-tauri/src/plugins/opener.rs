use tauri::Runtime;
use tauri::plugin::Plugin;

/// 外部打开插件：让前端用系统默认程序打开链接或文件
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_opener::Builder::default().build()
}
