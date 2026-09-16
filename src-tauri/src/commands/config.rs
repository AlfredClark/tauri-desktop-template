use crate::cores::config::{self, Config};
use crate::cores::locale::Locale;
use crate::cores::types::CommandResult;

/// 读取完整应用配置；各字段缺失或无法识别时逐项回落默认值
#[tauri::command]
#[specta::specta]
#[allow(clippy::needless_pass_by_value)]
pub fn get_config(app: tauri::AppHandle) -> CommandResult<Config> {
    Ok(config::load_config(&app))
}

/// 读取当前界面语言；持久化值缺失或无法识别时回落 `Locale` 的默认值
#[tauri::command]
#[specta::specta]
#[allow(clippy::needless_pass_by_value)]
pub fn get_locale(app: tauri::AppHandle) -> CommandResult<Locale> {
    Ok(config::load_locale(&app).unwrap_or_default())
}

/// 切换界面语言：先落盘再改内存，写盘失败时运行时语言与磁盘保持一致
#[tauri::command]
#[specta::specta]
#[allow(clippy::needless_pass_by_value)]
pub fn set_locale(app: tauri::AppHandle, locale: Locale) -> CommandResult<Locale> {
    config::save_locale(&app, locale)?;
    rust_i18n::set_locale(locale.as_str());
    Ok(locale)
}
