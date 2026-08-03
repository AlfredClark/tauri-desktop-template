pub mod config;

/// 整合 cores 下所有模块的初始化 setup，供 lib.rs 统一调用。
/// @param app Tauri 应用实例
/// @returns 任一模块初始化失败时返回错误
pub fn setup_cores(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    config::setup(app)?;
    Ok(())
}
