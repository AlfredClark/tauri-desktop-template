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
    // 必须在 Builder 创建前调用：WebKit 环境 workaround
    cores::env::init_env();
    tauri::Builder::default()
        // 单实例插件置于链首：尽早注册单例锁，避免窗口建好后回调竞态
        .plugin(cores::instance::plugin())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(cores::autostart::plugin())
        .plugin(cores::logger::plugin())
        .plugin(tauri_plugin_notification::init())
        .setup(cores::setup_cores)
        .invoke_handler(invoke_handlers!())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
