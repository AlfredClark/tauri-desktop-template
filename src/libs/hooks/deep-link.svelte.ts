// 深链入口：冷启动（`getCurrent`）+ 运行中（`onOpenUrl`）+ 次实例转发（`app:open-urls`）。
// 三路互斥（首启 / 运行中 OS 投递 / 次进程转发），另有短窗去重兜底。
// 协议 `scheme` 的三处 touch 点（模板二次开发自定义时同步改）：
// `tauri.conf.json` 的 `plugins.deep-link.desktop.schemes`、
// 后端 `features/deeplink.rs` 的 `SCHEME_PREFIX`、此处的 `DEEP_LINK_SCHEME`。
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { SvelteMap } from "svelte/reactivity";
import { m } from "$libs/i18n/paraglide/messages";
import { toast } from "$libs/utils/toast";

/** 演示用协议 scheme，基于模板开发时按需自定义 */
export const DEEP_LINK_SCHEME = "tdt";

/** 次实例转发的 Rust 事件名，与 `plugins/single_instance.rs` 同名 */
export const SECOND_INSTANCE_EVENT = "app:open-urls";

/** 去重窗口：同 URL 短时间内重复到达只处理一次 */
const DEDUPE_WINDOW_MS = 2000;

/** 已处理的 URL 及时间：防冷启动与运行时事件重复投递（模块级缓存，非组件状态） */
const handledAt = new SvelteMap<string, number>();

/** 是否为本应用协议链接 */
export function isDeepLink(url: string): boolean {
  return url.startsWith(`${DEEP_LINK_SCHEME}://`);
}

/** 深链映射到应用内路由；未知路径回落 `null`（停留并提示） */
export function routeForUrl(url: string): "/" | "/about" | "/settings" | null {
  if (!isDeepLink(url)) {
    return null;
  }
  const path = url.slice(DEEP_LINK_SCHEME.length + 3).split(/[?#]/)[0];
  switch (path) {
    case "":
    case "/":
      return "/";
    case "about":
    case "/about":
      return "/about";
    case "settings":
    case "/settings":
      return "/settings";
    default:
      return null;
  }
}

/** 处理单条深链：命中跳转 + 提示，未知停留 + 警告；短窗内重复到达直接忽略 */
export function handleDeepLinkUrl(url: string): void {
  const now = Date.now();
  if (now - (handledAt.get(url) ?? 0) < DEDUPE_WINDOW_MS) {
    return;
  }
  handledAt.set(url, now);
  const route = routeForUrl(url);
  if (route === null) {
    toast.warning(m.deep_link_unknown());
    return;
  }
  toast.info(m.deep_link_opened());
  void goto(resolve(route));
}

/** 注册三路深链入口，返回统一的取消订阅；浏览器预览无运行时则抛错，由调用方降级 */
export async function initDeepLinks(): Promise<UnlistenFn> {
  const stoppers: UnlistenFn[] = [];
  for (const url of (await getCurrent()) ?? []) {
    handleDeepLinkUrl(url);
  }
  stoppers.push(await onOpenUrl((urls) => urls.forEach(handleDeepLinkUrl)));
  stoppers.push(
    await listen<string[]>(SECOND_INSTANCE_EVENT, (event) =>
      event.payload.forEach(handleDeepLinkUrl),
    ),
  );
  return () => stoppers.forEach((stop) => stop());
}
