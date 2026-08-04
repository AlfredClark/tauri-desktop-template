//! 系统级配置核心逻辑：config.json 的初始化与读写，经 Tauri State 缓存避免重复读文件。
//!
//! 与前端 UI 偏好（localStorage stores 模块）按配置归属分层：
//! 本模块管理系统级配置（如 locale），前端偏好持久化归 stores 模块。

use std::sync::Arc;
use tauri::{Manager, Runtime, plugin::TauriPlugin};
use tauri_plugin_store::{Store, StoreExt};

use crate::cores::locale::Locale;
use crate::cores::response::{AppError, AppResult};

/// 构建 store 插件（config.json 持久化底层，经本模块统一装配）。
pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    tauri_plugin_store::Builder::new().build()
}

/// config.json 文件名（存放于应用数据目录）
const FILE_NAME: &str = "config.json";

/// locale 配置项 key（命令层需据其同步 rust-i18n 运行时，故 pub(crate)）
pub(crate) const KEY_LOCALE: &str = "locale";

/// 自动启动配置项 key（读写必须经 toggle_autostart 命令，故 pub(crate)）
pub(crate) const KEY_AUTOSTART: &str = "autostart";

/// 系统托盘配置项 key（读写必须经 toggle_tray 命令，故 pub(crate)）
pub(crate) const KEY_TRAY: &str = "tray";

/// 系统通知配置项 key（读写必须经 toggle_notification 命令，故 pub(crate)）
pub(crate) const KEY_NOTIFICATION: &str = "notification";

/// 默认语言标签（与前端 paraglide baseLocale 一致）
const DEFAULT_LOCALE: &str = "en";

/// 系统级配置结构体：config.json 的类型化模型
#[derive(Debug, Clone)]
pub struct Config {
    /// 界面语言（经 rust-i18n 可用 locale 校验），默认 en
    pub locale: Locale,
    /// 开机自启开关，默认关闭
    pub autostart: bool,
    /// 系统托盘开关，默认开启
    pub tray: bool,
    /// 系统通知开关，默认关闭
    pub notification: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            // DEFAULT_LOCALE 恒在可用 locale 列表中（en.yml 消息源存在）
            locale: Locale::new(DEFAULT_LOCALE).expect("default locale must be available"),
            autostart: false,
            tray: true,
            notification: false,
        }
    }
}

impl Config {
    /// 从 store 加载配置：条目存在且为合法 locale 时使用文件值，
    /// 否则（缺失/非法值）回退默认值并落盘修复。
    /// @param store plugin-store 的 store 引用
    /// @returns 加载结果；回退默认值落盘失败时返回错误
    pub fn load(store: &Store<tauri::Wry>) -> AppResult<Self> {
        match store.get(KEY_LOCALE) {
            Some(serde_json::Value::String(locale)) => match Locale::new(&locale) {
                Some(locale) => Ok(Self {
                    locale,
                    autostart: Self::load_autostart(store),
                    tray: Self::load_tray(store),
                    notification: Self::load_notification(store),
                }),
                None => Self::default_and_persist(store),
            },
            _ => Self::default_and_persist(store),
        }
    }

    /// 读取自动启动开关，条目缺失或非布尔时回退默认值。
    /// @param store plugin-store 的 store 引用
    /// @returns 持久化的 autostart 值；缺失/损坏时默认 false
    fn load_autostart(store: &Store<tauri::Wry>) -> bool {
        store.get(KEY_AUTOSTART).and_then(|v| v.as_bool()).unwrap_or(false)
    }

    /// 读取系统托盘开关，条目缺失或非布尔时回退默认值。
    /// @param store plugin-store 的 store 引用
    /// @returns 持久化的 tray 值；缺失/损坏时默认 true
    fn load_tray(store: &Store<tauri::Wry>) -> bool {
        store.get(KEY_TRAY).and_then(|v| v.as_bool()).unwrap_or(true)
    }

    /// 读取系统通知开关，条目缺失或非布尔时回退默认值。
    /// @param store plugin-store 的 store 引用
    /// @returns 持久化的 notification 值；缺失/损坏时默认 false
    fn load_notification(store: &Store<tauri::Wry>) -> bool {
        store.get(KEY_NOTIFICATION).and_then(|v| v.as_bool()).unwrap_or(false)
    }

    /// 构造默认配置并写入存储（修复缺失/损坏的 locale 条目）。
    /// @param store plugin-store 的 store 引用
    /// @returns 默认配置；落盘失败时返回错误
    fn default_and_persist(store: &Store<tauri::Wry>) -> AppResult<Self> {
        let config = Self::default();
        store.set(KEY_LOCALE, serde_json::Value::String(config.locale.as_str().to_string()));
        store.set(KEY_AUTOSTART, serde_json::Value::Bool(config.autostart));
        store.set(KEY_TRAY, serde_json::Value::Bool(config.tray));
        store.set(KEY_NOTIFICATION, serde_json::Value::Bool(config.notification));
        store.save()?;
        Ok(config)
    }
}

/// 系统配置状态：持有 plugin-store 的 store 缓存，命令经 `State` 注入读取
pub struct ConfigState {
    store: Arc<Store<tauri::Wry>>,
}

impl ConfigState {
    /// 读取配置项。
    /// @param key 配置项 key
    /// @returns 配置值；条目不存在时返回 None
    pub fn get(&self, key: &str) -> Option<serde_json::Value> {
        self.store.get(key)
    }

    /// 写入配置项并立即落盘。
    /// @param key 配置项 key
    /// @param value 配置值
    /// @returns 落盘失败时返回错误
    pub fn set(&self, key: String, value: serde_json::Value) -> AppResult<()> {
        self.store.set(key, value);
        self.store.save().map_err(AppError::from)
    }
}

/// config 初始化：加载 config.json 并存入 Tauri State，避免命令每次重新读取文件；
/// 同时将 locale 同步给 rust-i18n 运行时（locale 为前端与后端 i18n 的公共真相源）。
/// @param app Tauri 应用实例
/// @returns 初始化失败时返回错误
pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store(FILE_NAME)?;
    let config = Config::load(&store)?;
    rust_i18n::set_locale(config.locale.as_str());
    app.manage(ConfigState { store });
    Ok(())
}
