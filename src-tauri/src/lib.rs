use rust_i18n::{i18n, t};
use std::fs::OpenOptions;
use std::io::Write;
use std::panic;
use tauri_plugin_log::{Target, TargetKind};

i18n!("locales");

#[tauri::command]
fn greet(name: &str) -> String {
    t!("greet", name = name).to_string()
}

#[tauri::command]
fn set_locale(locale: &str) -> String {
    rust_i18n::set_locale(locale);
    rust_i18n::locale().to_string()
}

#[cfg(target_os = "linux")]
pub(crate) fn is_wayland_session() -> bool {
    std::env::var("XDG_SESSION_TYPE")
        .is_ok_and(|session_type| session_type.eq_ignore_ascii_case("wayland"))
        || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

#[cfg(target_os = "linux")]
fn is_appimage() -> bool {
    std::env::var_os("APPDIR").is_some()
}

/// 设置 panic 挂钩
///
/// 处理全局 panic 的挂钩 （后续需要单独拆分出去）
fn setup_panic_hook() {
    panic::set_hook(Box::new(|info| {
        let location = info.location().map_or_else(
            || "unknown location".into(),
            |l| format!("{}:{}:{}", l.file(), l.line(), l.column()),
        );

        let payload = info
            .payload()
            .downcast_ref::<&str>()
            .map(ToString::to_string)
            .or_else(|| info.payload().downcast_ref::<String>().cloned())
            .unwrap_or_else(|| "Unknown panic payload".into());

        // 1. 强制抓取 Backtrace，不受 RUST_BACKTRACE 环境变量缺失的影响
        let backtrace = std::backtrace::Backtrace::force_capture();

        let error_log = format!(
            "=== [CRASH PANIC] ===\nTime: {}\nLocation: {}\nReason: {}\nBacktrace:\n{}\n=====================\n",
            chrono::Local::now().to_rfc3339(),
            location,
            payload,
            backtrace
        );

        eprintln!("{error_log}");

        // 2. 写入临时目录并显式 flush 落盘
        let log_path = std::env::temp_dir().join("my_app_crash.log");
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
            let _ = file.write_all(error_log.as_bytes());
            let _ = file.flush();
        }
    }));
}

/// 运行Tauri应用程序
///
/// # Panics
///
/// 如果应用程序无法初始化或运行，则会出现 panics
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_panic_hook();

    #[cfg(target_os = "linux")]
    {
        if is_wayland_session() {
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
            if is_appimage() {
                unsafe {
                    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
                }
            }
        }
    }

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([Target::new(TargetKind::Stdout)])
                .build(),
        )
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, set_locale])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
