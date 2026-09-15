use tauri::Runtime;
use tauri::plugin::Plugin;

/// 存储插件：为 `cores::config` 的 `config.json` 读写提供后端能力
pub fn init<R: Runtime>() -> impl Plugin<R> {
    tauri_plugin_store::Builder::default().build()
}
