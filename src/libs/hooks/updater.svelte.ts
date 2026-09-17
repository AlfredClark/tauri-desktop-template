// 应用更新的全局状态：检查中 / 下载中切页不丢失，关于页与根布局共享同一份状态。
// 进度事件名与 Rust 侧 `cores::updater::APP_UPDATER_PROGRESS_EVENT` 会合，改名需两端同步。
import commands from "$libs/commands";
import { reportCommandFailure } from "$libs/commands/cores";
import type { UpdateInfo } from "$libs/commands/types";
import { m } from "$libs/i18n/paraglide/messages";
import { toast } from "$libs/utils/toast";

/** 下载进度事件名（见 Rust 侧同名常量） */
const PROGRESS_EVENT = "app-updater-progress";

/**
 * 更新流程阶段：`idle` 空闲 / `checking` 检查中 / `available` 有新版 / `downloading` 下载中 /
 * `ready` 待重启 / `error` 失败
 */
export type UpdaterPhase = "idle" | "checking" | "available" | "downloading" | "ready" | "error";

/** 跨页面共享的更新状态；`autoChecked` 保证启动静默检查单会话只跑一次 */
export const updaterState = $state<{
  phase: UpdaterPhase;
  latest: UpdateInfo | null;
  downloaded: number;
  total: number | null;
  error: string | null;
  autoChecked: boolean;
}>({ phase: "idle", latest: null, downloaded: 0, total: null, error: null, autoChecked: false });

let progressListening = false;

/** 订阅下载进度事件；浏览器 / 单测下动态导入失败则静默降级（进度不刷新，不阻断流程） */
async function ensureProgressListener(): Promise<void> {
  if (progressListening) return;
  progressListening = true;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen<{ downloaded: number; total: number | null }>(PROGRESS_EVENT, (event) => {
      updaterState.downloaded = event.payload.downloaded;
      updaterState.total = event.payload.total;
    });
  } catch {
    // 非 Tauri 环境无事件可订，保持阶段推进即可
  }
}

/** 检查更新；静默模式下仅在“有新版”时提示，发现最新与失败都不打扰 */
export async function checkForUpdate(options?: { silent?: boolean }): Promise<void> {
  if (updaterState.phase === "checking" || updaterState.phase === "downloading") return;
  updaterState.phase = "checking";
  updaterState.error = null;
  await commands
    .checkUpdate()
    .success((info) => {
      if (!info) {
        updaterState.phase = "idle";
        updaterState.latest = null;
        if (!options?.silent) toast.message(m.updater_up_to_date());
      } else {
        updaterState.phase = "available";
        updaterState.latest = info;
        // 静默检查的唯一打扰：告诉用户去关于页处理，不弹确认框
        if (options?.silent) toast.info(m.updater_update_available());
      }
    })
    .failed((failure) => {
      updaterState.phase = "error";
      updaterState.error = failure.message;
      if (options?.silent) {
        reportCommandFailure("[updater] silent check failed", failure);
      } else {
        toast.error(m.updater_check_failed());
      }
    });
}

/** 下载并安装当前已发现的版本；成功后进入待重启，不自动重启 */
export async function downloadAndInstall(): Promise<void> {
  if (updaterState.phase !== "available" || !updaterState.latest) return;
  updaterState.phase = "downloading";
  updaterState.downloaded = 0;
  updaterState.total = null;
  updaterState.error = null;
  await ensureProgressListener();
  await commands
    .downloadAndInstallUpdate()
    .success(() => {
      updaterState.phase = "ready";
    })
    .failed((failure) => {
      updaterState.phase = "error";
      updaterState.error = failure.message;
      toast.error(m.updater_download_failed());
    });
}

/** 重启以完成更新；命令永不结算，调用方不要 `await` */
export function restartApp(): void {
  if (updaterState.phase !== "ready") return;
  void commands.restartApp().failed((failure) => {
    reportCommandFailure("[updater] failed to restart", failure);
  });
}

/** 启动静默检查：开着开关且本会话未查过才执行；非 Tauri 环境直接跳过 */
export function maybeAutoCheckForUpdate(enabled: boolean): void {
  if (!enabled || updaterState.autoChecked) return;
  updaterState.autoChecked = true;
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
  void checkForUpdate({ silent: true });
}
