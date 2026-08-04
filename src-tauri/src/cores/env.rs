//! Linux 环境准备：WebKit/DMABUF workaround 等（需在 Tauri Builder 创建前调用）。

/// Linux Wayland 环境下 webkit2gtk 的 DMABUF 渲染器会导致白屏/崩溃，
/// 此 workaround 为必要处理，请勿删除。
pub fn init_env() {
    #[cfg(target_os = "linux")]
    {
        let is_wayland_session = std::env::var("XDG_SESSION_TYPE")
            .is_ok_and(|session_type| session_type.eq_ignore_ascii_case("wayland"))
            || std::env::var_os("WAYLAND_DISPLAY").is_some();

        if is_wayland_session {
            unsafe {
                std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
            }
        }
    }
}
