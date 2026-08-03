//! 系统级配置核心逻辑：config.json 的初始化与读写，经 Tauri State 缓存避免重复读文件。
//!
//! 与前端 UI 偏好（localStorage stores 模块）按配置归属分层：
//! 本模块管理系统级配置（如 locale），前端偏好持久化归 stores 模块。

use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_store::{Store, StoreExt};

use crate::cores::response::{AppError, AppResult};

/// config.json 文件名（存放于应用数据目录）
const FILE_NAME: &str = "config.json";

/// locale 配置项 key
const KEY_LOCALE: &str = "locale";

/// 系统级配置结构体：config.json 的类型化模型
#[derive(Debug, Clone)]
pub struct Config {
    /// 界面语言（如 en、zh-CN），默认 en
    pub locale: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            locale: "en".to_string(),
        }
    }
}

impl Config {
    /// 从 store 加载配置：条目存在且为字符串时使用文件值，否则回退默认值并落盘。
    /// @param store plugin-store 的 store 引用
    /// @returns 加载结果；回退默认值落盘失败时返回错误
    pub fn load(store: &Store<tauri::Wry>) -> AppResult<Self> {
        match store.get(KEY_LOCALE) {
            Some(serde_json::Value::String(locale)) => Ok(Self { locale }),
            _ => {
                let config = Self::default();
                store.set(KEY_LOCALE, config.locale.clone());
                store.save()?;
                Ok(config)
            }
        }
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

/// config 初始化：加载 config.json 并存入 Tauri State，避免命令每次重新读取文件。
/// @param app Tauri 应用实例
/// @returns 初始化失败时返回错误
pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = app.store(FILE_NAME)?;
    let _ = Config::load(&store)?;
    app.manage(ConfigState { store });
    Ok(())
}
