//! Tauri 应用后端入口：串联插件注册、命令处理器与核心初始化。
//!
//! 模块分层：`commands`（命令封装）/ `cores`（通用能力与跨层共享类型）/ `features`（业务逻辑）/
//! `plugins`（插件初始化）。新增命令的流程见 `commands/mod.rs`。

mod commands;
mod cores;
mod features;
mod plugins;

use crate::cores::{setup_cores, specta};
use crate::plugins::BuilderExt;

rust_i18n::i18n!("locales", fallback = "en");

/// 运行 Tauri 应用程序
///
/// # Panics
///
/// 如果应用程序无法初始化或运行，则会出现 panics
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    cores::system::init_system();

    let specta_builder = specta::init_builder();

    tauri::Builder::default()
        .plugin(plugins::log::init())
        .plugin(plugins::store::init())
        .plugin(plugins::opener::init())
        .plugin(plugins::os::init())
        .with_autostart()
        .with_updater()
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app| {
            setup_cores(app, &specta_builder);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
