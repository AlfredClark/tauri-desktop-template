// 防止在版本中的Windows上添加额外的控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// 允许常规的告警转换为更严格的标准
#![warn(clippy::all, clippy::pedantic)]
// 忽略部分在 Tauri 模板中常见但过于严苛的规则
#![allow(clippy::module_name_repetitions)]

fn main() {
    tauri_desktop_template_lib::run();
}
