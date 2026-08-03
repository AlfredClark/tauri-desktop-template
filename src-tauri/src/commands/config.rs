//! 系统配置 IPC 命令：薄层封装，核心逻辑位于 `crate::cores::config`。

use tauri::State;

use crate::cores::config::{ConfigState, KEY_LOCALE};
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

/// 写入系统配置项并立即落盘：`invokeCommand("set_config", { key: "locale", value: "zh-CN" })`。
/// locale 写入前经 `Locale` 类型校验，非法值直接拒绝（不落盘）；合法值落盘后同步切换 rust-i18n 运行时。
/// @param state 系统配置状态（经 setup 初始化）
/// @param key 配置项 key
/// @param value 配置值
/// @returns 写入后的配置值
#[tauri::command]
pub fn set_config(state: State<'_, ConfigState>, key: String, value: serde_json::Value) -> Response<serde_json::Value> {
    let locale = if key == KEY_LOCALE {
        // locale 为前后端 i18n 真相源：非法值直接拒绝写入，避免污染 config.json
        match value.as_str().and_then(Locale::new) {
            Some(locale) => Some(locale),
            None => return Response::err(CODE_ERROR, "invalid locale"),
        }
    } else {
        None
    };
    let stored = value.clone();
    if let Err(error) = state.set(key, value) {
        return Response::err(error.code, error.message);
    }
    if let Some(locale) = locale {
        rust_i18n::set_locale(locale.as_str());
    }
    Response::ok(stored)
}
