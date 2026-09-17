//! 通用能力与跨层共享类型：`types`（命令错误 / 结果）、`locale`（语言枚举）、
//! `config`（应用配置持久化）、`specta`（绑定构建与导出）、`system`（panic 钩子与环境兼容）、
//! `updater`（更新检查与安装，需 `Tauri` 运行时故放 `cores` 而非 `features`）。

use tauri_specta::Builder;

pub mod config;
pub mod locale;
pub mod specta;
pub mod system;
pub mod types;
pub mod updater;

/// 应用启动时的核心初始化：挂载事件系统并装配应用配置（含界面语言）
pub fn setup_cores(app: &tauri::App, builder: &Builder<tauri::Wry>) {
    specta::setup(app, builder);
    config::setup(app);
}
