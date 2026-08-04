//! 系统配置 IPC 命令：薄层封装，核心逻辑位于 `crate::cores::config`。
//!
//! 读写约定：读取统一走 `get_config`（键值通用读）；写入按配置项专项专用——
//! `set_locale` 写 locale（校验 + 同步 rust-i18n 运行时），
//! `toggle_autostart` 切换 autostart（先令操作系统生效再写回 config）。

use tauri::State;
use tauri_plugin_autostart::AutoLaunchManager;

use crate::cores::config::{ConfigState, KEY_AUTOSTART, KEY_LOCALE};
use crate::cores::locale::Locale;
use crate::cores::response::{CODE_ERROR, Response};

/// 读取系统配置项：`invokeCommand("get_config", { key: "locale" })`。
/// @param state 系统配置状态（经 setup 初始化）
/// @param key 配置项 key
/// @returns 配置值；条目不存在时 data 为 null
#[tauri::command]
pub fn get_config(state: State<'_, ConfigState>, key: String) -> Response<Option<serde_json::Value>> {
    Response::ok(state.get(&key))
}

/// 写入 locale 配置项并立即落盘：`invokeCommand("set_locale", { locale: "zh-CN" })`。
/// locale 写入前经 `Locale` 类型校验，非法值直接拒绝（不落盘）；合法值落盘后同步切换 rust-i18n 运行时。
/// @param state 系统配置状态（经 setup 初始化）
/// @param locale 目标语言标签
/// @returns 写入后的 locale 值
#[tauri::command]
pub fn set_locale(state: State<'_, ConfigState>, locale: String) -> Response<String> {
    // locale 为前后端 i18n 真相源：非法值直接拒绝写入，避免污染 config.json
    let Some(locale) = Locale::new(&locale) else {
        return Response::err(CODE_ERROR, "invalid locale");
    };
    if let Err(error) = state.set(KEY_LOCALE.to_string(), serde_json::Value::String(locale.as_str().to_string())) {
        return Response::err(error.code, error.message);
    }
    rust_i18n::set_locale(locale.as_str());
    Response::ok(locale.as_str().to_string())
}

/// 切换自动启动状态：`invokeCommand("toggle_autostart")`。
/// 读 config 当前值取反 → 先令操作系统生效（失败不落盘）→ 写回 config。
/// @param config 系统配置状态（经 setup 初始化）
/// @param manager 插件管理的自动启动管理器（经 plugin init 注入）
/// @returns 切换后的 autostart 值；操作系统同步失败时返回错误码
#[tauri::command]
pub fn toggle_autostart(config: State<'_, ConfigState>, manager: State<'_, AutoLaunchManager>) -> Response<bool> {
    let enabled = config.get(KEY_AUTOSTART).and_then(|v| v.as_bool()).unwrap_or(false);
    let enabled = !enabled;

    // 先 OS 生效，失败直接返回（不写回 config，避免两侧不一致）
    let result = if enabled { manager.enable() } else { manager.disable() };
    if let Err(error) = result {
        return Response::err(CODE_ERROR, error.to_string());
    }

    let value = serde_json::Value::Bool(enabled);
    if let Err(error) = config.set(KEY_AUTOSTART.to_string(), value) {
        return Response::err(error.code, error.message);
    }
    Response::ok(enabled)
}
