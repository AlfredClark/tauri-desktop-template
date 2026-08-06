//! Linux 环境信息与准备：Wayland 会话检测、WebKit/DMABUF workaround 等
//! （init_env 需在 Tauri Builder 创建前调用）。

/// 是否为 Wayland 会话：XDG_SESSION_TYPE=wayland 或存在 WAYLAND_DISPLAY。
/// 供 init_env（DMABUF workaround）与置顶能力判断共用。
/// @returns 是否 Wayland 会话
pub(crate) fn is_wayland_session() -> bool {
    std::env::var("XDG_SESSION_TYPE").is_ok_and(|session_type| session_type.eq_ignore_ascii_case("wayland"))
        || std::env::var_os("WAYLAND_DISPLAY").is_some()
}

/// 窗口置顶能力：Linux 上 GTK 的 keep_above 在 Wayland 下无效（静默 no-op），
/// 因此仅 X11/Windows/macOS 原生支持置顶。
/// @returns 是否支持窗口置顶
pub(crate) fn is_always_on_top_supported() -> bool {
    #[cfg(target_os = "linux")]
    {
        !is_wayland_session()
    }
    #[cfg(not(target_os = "linux"))]
    {
        true
    }
}

/// Linux Wayland 环境下 webkit2gtk 的 DMABUF 渲染器会导致白屏/崩溃，
/// 此 workaround 为必要处理，请勿删除。
pub fn init_env() {
    #[cfg(target_os = "linux")]
    {
        if is_wayland_session() {
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }
}
