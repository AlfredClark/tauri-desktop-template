//! 系统配置 IPC 命令：薄层封装，核心逻辑位于 `crate::cores::config`。

use tauri::State;

use crate::cores::config::ConfigState;

/// 读取系统配置项：`invoke("get_config", { key: "locale" })`。
/// @param state 系统配置状态（经 setup 初始化）
/// @param key 配置项 key
/// @returns 配置值；条目不存在时返回 null
#[tauri::command]
pub fn get_config(state: State<'_, ConfigState>, key: String) -> Result<Option<serde_json::Value>, String> {
    Ok(state.get(&key))
}

/// 写入系统配置项并立即落盘：`invoke("set_config", { key: "locale", value: "zh-CN" })`。
/// @param state 系统配置状态（经 setup 初始化）
/// @param key 配置项 key
/// @param value 配置值
#[tauri::command]
pub fn set_config(state: State<'_, ConfigState>, key: String, value: serde_json::Value) -> Result<(), String> {
    state.set(key, value).map_err(|e| e.to_string())
}
