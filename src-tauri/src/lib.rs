//! Tauri 应用核心库。
//!
//! 模块拆分：`cores/` 为核心逻辑（含初始化 setup），`commands/` 为 IPC 命令薄层；
//! 本文件仅声明模块、组装 Builder 与注册命令。
//! `src/main.rs` 仅作为二进制入口委托调用 `run()`。

mod commands;
mod cores;

use commands::invoke_handlers;

// 初始化 rust-i18n：加载 src-tauri/locales 下的消息源，缺失翻译回退 en
rust_i18n::i18n!("locales", fallback = "en");

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
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(cores::setup_cores)
        .invoke_handler(invoke_handlers!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
