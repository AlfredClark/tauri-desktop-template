import { invokeCommand } from "$lib/ipc";
import { setLocale, toLocale, type Locale } from "./paraglide/runtime";

/** 后端 config.json 中 locale 配置项的 key（与 Rust cores/config.rs 的 KEY_LOCALE 一致） */
const CONFIG_KEY_LOCALE = "locale";

/**
 * 切换语言：先写后端 config.json 落盘，成功后才更新前端 paraglide 运行时。
 * @param locale 目标语言标签
 * @param reload 是否刷新页面（默认 true；纯内存切换传 false 避免刷新循环）
 * @returns 后端写入与前端切换均成功时返回 true；后端写入失败时返回 false（前端不切换）
 */
export async function changeLocale(locale: Locale, reload: boolean = true): Promise<boolean> {
  const result = await invokeCommand<Locale>("set_locale", { locale });
  if (result === null) {
    return false;
  }
  setLocale(result, { reload });
  return true;
}

/**
 * 启动时从后端同步 locale：读取 config.json 并应用（纯内存切换，页面渲染前调用）。
 * @returns 同步成功时返回 true；命令失败或条目缺失时返回 false（保持 paraglide 默认语言）
 */
export async function syncLocale(): Promise<boolean> {
  try {
    const locale = await invokeCommand<Locale>("get_config", { key: CONFIG_KEY_LOCALE });
    const resolved = toLocale(locale);
    if (resolved === undefined) {
      return false;
    }
    setLocale(resolved, { reload: false });
    return true;
  } catch {
    return false;
  }
}
