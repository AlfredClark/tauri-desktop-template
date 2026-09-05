use rust_i18n::{i18n, t};

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

/// 运行Tauri应用程序
///
/// # Panics
///
/// 如果应用程序无法初始化或运行，则会出现 panics
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, set_locale])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
