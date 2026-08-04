//! 日志插件装配：统一配置前后端共用的 tauri-plugin-log。
//!
//! 前后端共用同一套日志：Rust 侧用 `log` crate 宏（log::info! 等），
//! 前端经 `@tauri-apps/plugin-log`（封装于 src/lib/log/）写入同一链路。

use tauri::{Runtime, plugin::TauriPlugin};

/// 构建日志插件。
///
/// - 级别：dev 全量 Trace（调试信息完整），release Info（生产减噪）
/// - 目标：stdout（终端）+ LogDir（应用日志目录，文件名默认应用名）+ Webview（devtools 控制台）
/// - 轮转：1MB/文件，KeepAll 保留全部历史
/// - 时区：本地时区（阅读友好）
pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_log::Builder::new()
        .level(if cfg!(debug_assertions) {
            log::LevelFilter::Trace
        } else {
            log::LevelFilter::Info
        })
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
        .max_file_size(1_000_000)
        .timezone_strategy(tauri_plugin_log::TimezoneStrategy::UseLocal)
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ])
        .build()
}
