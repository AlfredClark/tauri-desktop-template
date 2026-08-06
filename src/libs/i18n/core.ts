import { invokeCommand, type SystemConfig } from "$libs/ipc";
import { getLocale, setLocale, toLocale, type Locale } from "./paraglide/runtime";

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
 * 启动时初始化 locale（onMount 调用）：
 * - 前后端一致（正常情况）：无需任何修改——首帧已按 localStorage 渲染正确，仅同步 lang 属性
 * - 不一致（如外部修改 config.json，极少见）：以 config.json 为准，setLocale(reload:true)
 *   先写入 localStorage 再刷新——刷新后首帧即正确，此分支只执行一次
 * @returns 初始化成功时返回 true；命令失败或条目缺失时返回 false（保持 paraglide 默认语言）
 */
export async function initLocale(): Promise<boolean> {
  try {
    const config = await invokeCommand<SystemConfig>("get_config");
    if (config === null) {
      return false;
    }
    const resolved = toLocale(config.locale);
    if (resolved === undefined) {
      return false;
    }
    if (resolved !== getLocale()) {
      // 失同步自愈：写入 localStorage 并刷新，刷新后首帧即按新语言渲染
      setLocale(resolved, { reload: true });
      document.documentElement.lang = getLocale();
      return true;
    }
    document.documentElement.lang = getLocale();
    return true;
  } catch {
    return false;
  }
}
