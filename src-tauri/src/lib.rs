//! Tauri 应用核心库。
//!
//! 所有 `#[tauri::command]` 命令与 Builder 配置集中在此文件；
//! `src/main.rs` 仅作为二进制入口委托调用 `run()`。

/// IPC 命令示例：前端通过 `invoke("greet", { name })` 调用。
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Linux Wayland 环境下 webkit2gtk 的 DMABUF 渲染器会导致白屏/崩溃，
    // 此 workaround 为必要处理，请勿删除。
    #[cfg(target_os = "linux")]
    {
        let is_wayland_session = std::env::var("XDG_SESSION_TYPE")
            .is_ok_and(|session_type| session_type.eq_ignore_ascii_case("wayland"))
            || std::env::var_os("WAYLAND_DISPLAY").is_some();

        if is_wayland_session {
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // 新增命令后必须在此注册，否则前端 invoke 会调用失败
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
