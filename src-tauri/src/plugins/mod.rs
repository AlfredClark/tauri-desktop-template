//! 插件初始化层：每个 Tauri 插件一个文件，只暴露 `init()` 供 `lib.rs` 注册。

pub mod log;
pub mod opener;
pub mod store;
pub mod updater;
