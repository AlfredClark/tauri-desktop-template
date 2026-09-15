use tauri_plugin_store::StoreExt;

use crate::cores::locale::Locale;

/// 应用配置在 `tauri-plugin-store` 里的文件名（落在系统应用数据目录）
pub const STORE_FILE: &str = "config.json";
/// 界面语言在配置文件中的键名
const KEY_LOCALE: &str = "locale";

/// 启动装配：确定运行时语言（持久化值优先，否则探测系统语言并落库）
pub fn setup(app: &tauri::App) {
    let handle = app.handle();
    let locale = load_locale(handle).unwrap_or_else(|| {
        let detected = detect_locale();
        if let Err(err) = save_locale(handle, detected) {
            log::warn!("failed to persist detected locale: {err:#}");
        }
        detected
    });
    rust_i18n::set_locale(locale.as_str());
}

/// 读取持久化的界面语言；未设置、类型不符或无法识别时返回 `None`
pub fn load_locale(app: &tauri::AppHandle) -> Option<Locale> {
    let store = match app.store(STORE_FILE) {
        Ok(store) => store,
        Err(err) => {
            log::warn!("failed to open {STORE_FILE}: {err:#}");
            return None;
        }
    };
    store.get(KEY_LOCALE)?.as_str().map(Locale::parse)
}

/// 写入界面语言并立即落盘
pub fn save_locale(app: &tauri::AppHandle, locale: Locale) -> anyhow::Result<()> {
    let store = app.store(STORE_FILE)?;
    store.set(KEY_LOCALE, locale.as_str());
    store.save()?;
    Ok(())
}

/// 探测操作系统语言（BCP-47），失败或无法识别时回落默认语言
fn detect_locale() -> Locale {
    tauri_plugin_os::locale().map_or_else(Locale::default, |raw| Locale::parse(&raw))
}
