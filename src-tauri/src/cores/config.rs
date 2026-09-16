use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;
use tauri_plugin_store::StoreExt;

use crate::cores::locale::Locale;

/// 应用配置在 `tauri-plugin-store` 里的文件名（落在系统应用数据目录）
pub const STORE_FILE: &str = "config.json";
/// 界面语言在配置文件中的键名
const KEY_LOCALE: &str = "locale";

/// 应用完整配置：各持久化项聚合于此，`store` 内仍按扁平键（`KEY_*`）逐项存储。
/// 新增字段必须能 `Default`（否则旧文件缺键会解析失败）；写路径保持逐键写入，
/// 后续整包写必须先读再改再存，禁止用陈旧的 `Config` 直接覆盖。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(default)]
pub struct Config {
    /// 界面语言：缺失、类型不符或无法识别时回落默认值，绝不让整包解析失败
    #[serde(deserialize_with = "de_locale")]
    #[specta(type = Locale)]
    pub locale: Locale,
}

/// 容错解析界面语言：经 `serde_json::Value` 中转，非字符串或未知标签一律回落默认值
fn de_locale<'de, D>(deserializer: D) -> Result<Locale, D::Error>
where
    D: Deserializer<'de>,
{
    let value = serde_json::Value::deserialize(deserializer)?;
    Ok(value.as_str().map(Locale::parse).unwrap_or_default())
}

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

/// 读取完整应用配置；各字段缺失或无法识别时逐项回落默认值（无落盘副作用）
pub fn load_config(app: &tauri::AppHandle) -> Config {
    Config {
        locale: load_locale(app).unwrap_or_default(),
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn defaults_to_english() {
        assert_eq!(Config::default().locale, Locale::En);
    }

    #[test]
    fn round_trips_through_json() {
        let config = Config {
            locale: Locale::ZhCn,
        };
        let raw = serde_json::to_value(&config).expect("config serializes");
        assert_eq!(raw, json!({ "locale": "zh-CN" }));
        let back: Config = serde_json::from_value(raw).expect("config deserializes");
        assert_eq!(back, config);
    }

    #[test]
    fn tolerates_missing_or_unrecognized_locale() {
        for raw in [
            json!({}),
            json!({ "locale": "fr" }),
            json!({ "locale": 5 }),
            json!({ "locale": null }),
        ] {
            let config: Config = serde_json::from_value(raw).expect("never fails");
            assert_eq!(config.locale, Locale::En);
        }
    }

    #[test]
    fn ignores_unknown_keys() {
        let config: Config = serde_json::from_value(json!({ "locale": "en", "theme": "dark" }))
            .expect("unknown keys ignored");
        assert_eq!(config.locale, Locale::En);
    }
}
