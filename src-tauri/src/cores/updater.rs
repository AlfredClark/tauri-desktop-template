//! 应用更新能力：检查、下载安装与重启。
//!
//! 需要 Tauri 运行时（更新器与事件发送），故放在 `cores` 而非纯函数的 `features`。
//! 命令层（`commands::updater`）只做薄封装；下载进度经 `APP_UPDATER_PROGRESS_EVENT`
//! 事件推送，前端在 `libs/hooks/updater.svelte.ts` 订阅（事件名两端以该常量为准）。
use serde::{Deserialize, Serialize};
use specta::Type;

/// 下载进度事件名：前后端以此字符串会合，改名需两端同步
pub const APP_UPDATER_PROGRESS_EVENT: &str = "app-updater-progress";

/// 可用的更新信息：只含前端展示所需字段，插件的 `Update` 句柄不出命令边界
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct UpdateInfo {
    /// 远端版本号
    pub version: String,
    /// 当前版本号
    pub current_version: String,
    /// 发布说明（`latest.json` 的 `body`，可能缺失）
    pub body: Option<String>,
}

/// 下载进度事件载荷：`total` 缺失时前端展示不确定进度
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct ProgressPayload {
    /// 已下载字节数
    pub downloaded: u64,
    /// 总字节数（服务端未提供时为 `None`）
    pub total: Option<u64>,
}

/// 检查更新；无新版返回 `None`（仅桌面端，移动端直接报错）
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub async fn check_for_update(app: &tauri::AppHandle) -> anyhow::Result<Option<UpdateInfo>> {
    use tauri_plugin_updater::UpdaterExt;

    let update = app.updater()?.check().await?;
    Ok(update.map(|found| UpdateInfo {
        version: found.version,
        current_version: found.current_version,
        body: found.body,
    }))
}

/// 检查更新；无新版返回 `None`（仅桌面端，移动端直接报错）
#[cfg(any(target_os = "android", target_os = "ios"))]
pub async fn check_for_update(_app: &tauri::AppHandle) -> anyhow::Result<Option<UpdateInfo>> {
    Err(anyhow::anyhow!("updater is not supported on mobile"))
}

/// 下载并安装更新，进度经事件推送；装完不自动重启，由前端手动触发
/// （仅桌面端，移动端直接报错）
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub async fn download_and_install(app: &tauri::AppHandle) -> anyhow::Result<()> {
    use tauri::Emitter;
    use tauri_plugin_updater::UpdaterExt;

    let Some(update) = app.updater()?.check().await? else {
        return Err(anyhow::anyhow!("no update available"));
    };
    update
        .download_and_install(
            |downloaded, total| {
                let _ = app.emit(
                    APP_UPDATER_PROGRESS_EVENT,
                    ProgressPayload {
                        downloaded: downloaded as u64,
                        total,
                    },
                );
            },
            || {},
        )
        .await?;
    Ok(())
}

/// 下载并安装更新，进度经事件推送；装完不自动重启，由前端手动触发
/// （仅桌面端，移动端直接报错）
#[cfg(any(target_os = "android", target_os = "ios"))]
pub async fn download_and_install(_app: &tauri::AppHandle) -> anyhow::Result<()> {
    Err(anyhow::anyhow!("updater is not supported on mobile"))
}

/// 重启应用以完成更新；本函数不返回（仅桌面端，移动端直接报错）
#[cfg(not(any(target_os = "android", target_os = "ios")))]
pub fn restart(app: &tauri::AppHandle) -> ! {
    use tauri::Manager;

    tauri::process::restart(&app.env());
}

/// 重启应用以完成更新；本函数不返回（仅桌面端，移动端直接报错）
///
/// # Panics
///
/// 移动端构建无更新能力，调用即 panic（该分支正常走不到，前端已按平台隐藏入口）
#[cfg(any(target_os = "android", target_os = "ios"))]
pub fn restart(_app: &tauri::AppHandle) -> ! {
    panic!("updater is not supported on mobile")
}
