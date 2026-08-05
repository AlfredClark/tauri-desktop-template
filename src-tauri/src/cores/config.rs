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

/// 从 store 加载配置：locale 缺失/非法时回退默认并写回修复；
/// 布尔配置项（autostart/tray/notification）逐键校验，损坏值同样修复落盘。
/// @param store plugin-store 的 store 引用
/// @returns 加载结果；落盘修复失败时返回错误
pub fn load(store: &Store<tauri::Wry>) -> AppResult<Locale> {
    let mut repaired = false;

    let locale = match store.get(KEY_LOCALE) {
        Some(serde_json::Value::String(value)) => Locale::new(&value),
        _ => None,
    };
    let locale = locale.unwrap_or_else(|| {
        // DEFAULT_LOCALE 恒在可用 locale 列表中（en.yml 消息源存在）
        let locale = Locale::new(DEFAULT_LOCALE).expect("default locale must be available");
        store.set(KEY_LOCALE.to_string(), serde_json::Value::String(locale.as_str().to_string()));
        repaired = true;
        locale
    });

    // 读取方（autostart/tray/setup）各自带回退，此处仅兜底修复文件内的损坏值
    load_bool(store, KEY_AUTOSTART, false, &mut repaired);
    load_bool(store, KEY_TRAY, true, &mut repaired);
    load_bool(store, KEY_NOTIFICATION, false, &mut repaired);

    // 仅当存在修复时落盘，健康文件不写盘
    if repaired {
        store.save()?;
    }
    Ok(locale)
}

/// 读取布尔配置项；缺失/非布尔时回退默认值、写回修复并标记。
/// @param store plugin-store 的 store 引用
/// @param key 配置项 key
/// @param default 缺失/损坏时的默认值
/// @param repaired 修复标记（发生回退时置为 true）
fn load_bool(store: &Store<tauri::Wry>, key: &str, default: bool, repaired: &mut bool) {
    if store.get(key).and_then(|value| value.as_bool()).is_none() {
        store.set(key.to_string(), serde_json::Value::Bool(default));
        *repaired = true;
    }
}

/// 系统级配置完整快照（get_config 返回值；字段与 config.json 的 key 一一对应）
#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemConfig {
    /// 界面语言标签
    pub locale: String,
    /// 开机自启开关
    pub autostart: bool,
    /// 系统托盘开关
    pub tray: bool,
    /// 系统通知开关
    pub notification: bool,
}

/// 系统配置状态：持有 plugin-store 的 store 缓存，命令经 `State` 注入读取
pub struct ConfigState {
    store: Arc<Store<tauri::Wry>>,
}

impl ConfigState {
    /// 读取全部系统配置（类型化快照；缺失/损坏条目回退默认值）。
    /// @returns 配置快照（locale/autostart/tray/notification）
    pub fn get_all(&self) -> SystemConfig {
        SystemConfig {
            locale: self.read_locale().as_str().to_string(),
            autostart: self.read_bool(KEY_AUTOSTART, false),
            tray: self.read_bool(KEY_TRAY, true),
            notification: self.read_bool(KEY_NOTIFICATION, false),
        }
    }

    /// 读取 locale：非法/缺失时回退默认语言。
    /// @returns 校验通过的 locale（回退后恒为合法值）
    fn read_locale(&self) -> Locale {
        let locale = match self.store.get(KEY_LOCALE) {
            Some(serde_json::Value::String(value)) => Locale::new(&value),
            _ => None,
        };
        locale.unwrap_or_else(|| Locale::new(DEFAULT_LOCALE).expect("default locale must be available"))
    }

    /// 读取布尔配置项：缺失/非布尔时回退默认值。
    /// @param key 配置项 key
    /// @param default 缺失/损坏时的默认值
    /// @returns 持久化的布尔值；缺失/损坏时返回默认值
    fn read_bool(&self, key: &str, default: bool) -> bool {
        self.store.get(key).and_then(|value| value.as_bool()).unwrap_or(default)
    }

    /// 读取配置项。
    /// @param key 配置项 key
    /// @returns 配置值；条目不存在时返回 None
    pub fn get(&self, key: &str) -> Option<serde_json::Value> {
        self.store.get(key)
    }

    /// 写入配置项并立即落盘；落盘失败时回滚内存缓存，保证内存态与持久化一致。
    /// @param key 配置项 key
    /// @param value 配置值
    /// @returns 落盘失败时返回错误
    pub fn set(&self, key: String, value: serde_json::Value) -> AppResult<()> {
        let previous = self.store.get(&key);
        self.store.set(&key, value);
        if let Err(error) = self.store.save() {
            // 回滚：恢复旧值，避免内存态与磁盘及已执行的副作用（如 OS 切换）不一致。
            // 配置 key 经 load 修复后恒存在，previous 恒为 Some（StoreHandle 无 remove，仅支持回写）
            if let Some(previous) = previous {
                self.store.set(key, previous);
            }
            return Err(AppError::from(error));
        }
        Ok(())
    }
}

/// config 初始化：加载 config.json 存入 Tauri State（缓存避免重复读文件），
/// 并将 locale 同步给 rust-i18n 运行时（locale 为前后端 i18n 的公共真相源）。
/// 文件损坏时不阻断启动：备份为 *.corrupt 后重建默认配置。
/// @param app Tauri 应用实例
/// @returns 初始化失败时返回错误
pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let store = match app.store(FILE_NAME) {
        Ok(store) => store,
        Err(error) => {
            log::error!("[config] failed to load {FILE_NAME}: {error}, resetting");
            recover_corrupt_config(app);
            app.store(FILE_NAME)?
        }
    };
    // store 插件对损坏 JSON 静默吞错（build 内 load 错误被忽略），文件存在时用 reload 显式检测
    let config_path = app.path().app_config_dir()?.join(FILE_NAME);
    if config_path.exists() && store.reload().is_err() {
        log::error!("[config] config.json corrupted, resetting");
        recover_corrupt_config(app);
    }
    let config = load(&store)?;
    rust_i18n::set_locale(config.as_str());
    app.manage(ConfigState { store });
    Ok(())
}

/// config.json 损坏时：备份为 *.corrupt 后移除，令 store 插件重建空文件。
/// 配置仅为偏好，损坏不阻断启动；备份保留现场便于排查。
fn recover_corrupt_config(app: &tauri::App) {
    let Ok(config_dir) = app.path().app_config_dir() else {
        return;
    };
    let config_path = config_dir.join(FILE_NAME);
    if !config_path.exists() {
        return;
    }
    if std::fs::rename(&config_path, config_path.with_extension("json.corrupt")).is_err() {
        let _ = std::fs::remove_file(&config_path);
    }
}
