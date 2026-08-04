//! 系统托盘核心逻辑：托盘创建、菜单构建与重建、窗口显隐切换。
//!
//! 真相源约定：config.json 为 tray 开关的唯一真相源，启动时无条件创建托盘
//! 并按持久化值设置显隐；切换经 `toggle_tray` 命令调用 `set_visible`（显隐而非
//! 移除/重建——Linux 下 remove/recreate 会因 D-Bus 对象不注销导致路径注册冲突、
//! 无法重新显示，为 libappindicator 上游限制）。菜单文案经 rust-i18n `t!` 取当前
//! 语言，`set_locale` 切换语言时调用 `rebuild_menu` 重建菜单。

use rust_i18n::t;
use tauri::{
    AppHandle, Manager, Runtime,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

/// 托盘 id（固定：托盘仅创建一次，显隐经 set_visible，勿改）
const TRAY_ID: &str = "main-tray";
/// 显示/隐藏窗口菜单项 id
const MENU_TOGGLE_WINDOW: &str = "tray-toggle-window";
/// 退出菜单项 id
const MENU_QUIT: &str = "tray-quit";

/// 按当前语言构建托盘菜单：显示/隐藏 + 退出。
/// @param app 应用句柄（菜单项注册所需）
/// @returns 菜单构建结果
fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let toggle_window = MenuItem::with_id(app, MENU_TOGGLE_WINDOW, t!("tray.toggle_window"), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, MENU_QUIT, t!("tray.quit"), true, None::<&str>)?;
    Menu::with_items(app, &[&toggle_window, &quit])
}

/// 切换主窗口显示/隐藏（菜单项与托盘左键共用）：可见则隐藏，不可见则取消最小化并显示聚焦。
/// @param app 应用句柄
fn toggle_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

/// 创建系统托盘：应用图标 + 菜单；左键切换窗口显隐，右键（默认）弹出菜单。
/// 托盘仅创建一次（setup），后续显隐经 `set_visible`，勿移除重建。
/// @param app 应用句柄
/// @returns 创建结果
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    // 应用图标在 tauri.conf.json bundle 中配置（icons/icon.png），恒存在
    let icon = app.default_window_icon().expect("window icon must be configured").clone();

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
            MENU_TOGGLE_WINDOW => toggle_window(app),
            MENU_QUIT => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

/// 设置托盘显隐（Linux 上对应 appindicator Active/Passive）。
/// 切换命令经此显隐托盘，避免移除/重建导致 D-Bus 路径注册冲突。
/// @param app 应用句柄
/// @param visible 是否显示
/// @returns 设置结果；托盘缺失时返回 Ok 并记录警告（正常不会发生）
pub fn set_visible(app: &AppHandle, visible: bool) -> tauri::Result<()> {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        log::warn!("[tray] tray icon not found, skipping visibility change");
        return Ok(());
    };
    tray.set_visible(visible)
}

/// 按当前语言重建托盘菜单（locale 切换时调用）；托盘不存在时静默跳过。
/// @param app 应用句柄
pub fn rebuild_menu(app: &AppHandle) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    match build_menu(app) {
        Ok(menu) => {
            if let Err(error) = tray.set_menu(Some(menu)) {
                log::error!("[tray] failed to set tray menu: {error}");
            }
        }
        Err(error) => log::error!("[tray] failed to build tray menu: {error}"),
    }
}

/// 托盘初始化：无条件创建托盘，并按 config 持久化的 tray 值设置初始显隐。
/// @param app Tauri 应用实例
/// @returns 创建或显隐设置失败时返回错误（阻断启动）
pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    create_tray(app.handle())?;
    let visible = app
        .state::<crate::cores::config::ConfigState>()
        .get(crate::cores::config::KEY_TRAY)
        .and_then(|value| value.as_bool())
        .unwrap_or(true);
    set_visible(app.handle(), visible)?;
    Ok(())
}
