//! 插件初始化层：每个 Tauri 插件一个文件，只暴露 `init()` 供 `lib.rs` 注册。

use tauri::Runtime;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod autostart;
pub mod log;
pub mod opener;
pub mod os;
pub mod store;
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub mod updater;

/// 为 `tauri::Builder` 补充平台感知的插件注册方法，使 `lib.rs` 的注册链保持单一形式
pub trait BuilderExt<R: Runtime> {
    /// 注册开机自启插件；移动端为空操作（该平台未声明 `autostart` 依赖）
    #[must_use]
    fn with_autostart(self) -> Self;
    /// 注册自动更新插件；移动端为空操作（该平台未声明 `updater` 依赖）
    #[must_use]
    fn with_updater(self) -> Self;
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
impl<R: Runtime> BuilderExt<R> for tauri::Builder<R> {
    fn with_autostart(self) -> Self {
        self.plugin(autostart::init())
    }

    fn with_updater(self) -> Self {
        self.plugin(updater::init())
    }
}

#[cfg(any(target_os = "android", target_os = "ios"))]
impl<R: Runtime> BuilderExt<R> for tauri::Builder<R> {
    fn with_autostart(self) -> Self {
        self
    }

    fn with_updater(self) -> Self {
        self
    }
}
