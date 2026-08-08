/**
 * 更新流程全局状态：模块级 $state 单例（ESM 仅加载一次），跨组件共享。
 *
 * 状态变更集中在动作内（checkUpdate / installPendingUpdate），组件只读渲染。
 * 变更经 $state 代理属性赋值（update.status = ...）而非整体重赋值，
 * 保证模块级状态的读取跟踪可靠。
 */

import { error } from "$libs/logger";
import type { Update } from "@tauri-apps/plugin-updater";
import { checkForUpdate, installUpdate } from "./core";

/** 更新流程状态：idle 可检查 → checking 检查中 → available 有新版本 → downloading 下载安装；upToDate/error 为内联反馈态 */
export type UpdateState = {
  status: "idle" | "checking" | "available" | "downloading" | "upToDate" | "error";
  /** 新版本号（status 为 available 时有值） */
  version?: string;
  /** 下载进度百分比（status 为 downloading 时回填；total 未确定时为空） */
  percent?: number;
};

/** 更新流程状态（模块级单例，仅加载一次） */
export const update = $state<UpdateState>({ status: "idle" });

/** 已检出的更新对象（非渲染数据，普通模块变量即可；installPendingUpdate 前经 checkUpdate 赋值） */
let pendingUpdate: Update | null = null;

/** 检查更新：无新版本 → upToDate（可再次检查）；有新版本 → available 等待确认；失败 → error + 日志 */
export async function checkUpdate(): Promise<void> {
  update.status = "checking";
  try {
    const available = await checkForUpdate();
    if (!available) {
      update.status = "upToDate";
      return;
    }
    pendingUpdate = available;
    update.status = "available";
    update.version = available.version;
  } catch (err) {
    await error(`[updater] check update failed: ${err instanceof Error ? err.message : String(err)}`);
    update.status = "error";
  }
}

/** 下载安装已检出的更新：进度回填 percent（total 在 Started 事件后确定），完成后自动重启 */
export async function installPendingUpdate(): Promise<void> {
  if (update.status !== "available" || !pendingUpdate) return;
  update.status = "downloading";
  try {
    await installUpdate(pendingUpdate, (downloaded, total) => {
      update.status = "downloading";
      update.percent = total ? Math.round((downloaded / total) * 100) : undefined;
    });
  } catch (err) {
    await error(`[updater] install update failed: ${err instanceof Error ? err.message : String(err)}`);
    update.status = "error";
  }
}
