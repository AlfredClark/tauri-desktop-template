use std::fs::OpenOptions;
use std::io::Write;
use std::{env, panic};

/// 安装 panic 钩子：先走常规日志，日志不可用时落盘到临时文件兜底
fn setup_panic_hook() {
    // 获取原有的 panic hook（保留系统的默认行为）
    let default_hook = panic::take_hook();

    panic::set_hook(Box::new(move |info| {
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

        let backtrace = std::backtrace::Backtrace::force_capture();

        let error_log = format!(
            "=== [CRASH PANIC] ===\nTime: {}\nLocation: {}\nReason: {}\nBacktrace:\n{}\n=====================\n",
            chrono::Local::now().to_rfc3339(),
            location,
            payload,
            backtrace
        );

        // 保留默认输出（带格式/颜色输出到 stderr）
        default_hook(info);

        // 尝试走 tauri_plugin_log / log 系统
        let mut logged = false;
        if log::max_level() >= log::LevelFilter::Error {
            // 使用 catch_unwind 防止 logger 内部持有锁导致死锁或二次 panic
            let result = panic::catch_unwind(panic::AssertUnwindSafe(|| {
                log::error!(target: "panic", "{error_log}");
                log::logger().flush();
            }));
            if result.is_ok() {
                logged = true;
            }
        }

        // 兜底文件写入：只要 plugin 未记录或记录异常，立即写本地文件
        if !logged {
            let log_path = env::temp_dir().join("my_app_crash.log");
            if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = file.write_all(error_log.as_bytes());
                let _ = file.flush();
            }
        }
    }));
}

/// 是否运行在 Wayland 会话下（Wayland 与 `WebKitGTK` 的 DMABUF 渲染器存在兼容问题）
#[cfg(target_os = "linux")]
fn is_wayland_session() -> bool {
    env::var("XDG_SESSION_TYPE")
        .is_ok_and(|session_type| session_type.eq_ignore_ascii_case("wayland"))
        || env::var_os("WAYLAND_DISPLAY").is_some()
}

/// 是否由 `AppImage` 启动（打包环境下关掉合成模式，规避渲染异常）
#[cfg(target_os = "linux")]
fn is_app_image() -> bool {
    env::var_os("APPDIR").is_some()
}

/// 启动前的一次性系统初始化：安装 panic 钩子，并处理 Linux 下的显示环境兼容
pub fn init_system() {
    // 设置 panic 钩子
    setup_panic_hook();
    // 设置特殊环境下的兼容性环境变量
    #[cfg(target_os = "linux")]
    {
        if is_wayland_session() {
            unsafe {
                env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
            if is_app_image() {
                unsafe {
                    env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
                }
            }
        }
    }
}
