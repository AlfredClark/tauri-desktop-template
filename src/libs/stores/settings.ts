import { createStoreGroup, storeDef } from "./core";
import type { LayoutName, ThemeName } from "./types";
import { themeNames } from "$styles/themes";

/**
 * UI 偏好统一出口：createStoreGroup 组合两个偏好子 store（layout/theme），各自独立
 * 持久化于 localStorage（key: layout/theme），真相源与系统级配置（config.json）分离。
 * 暗色模式（.dark class）由 mode-watcher 负责（userPrefersMode 持久化于
 * mode-watcher-mode key，system 走 prefers-color-scheme），不在此维护。
 * 读写经成员访问：`$settings.layout` / `settings.theme.set(...)`。
 * 主题应用经 storeDef 的 subscribe 声明式注入：创建时应用当前值，此后每次变更跟随。
 */
export const settings = createStoreGroup({
  layout: storeDef<LayoutName>("default", "layout"),
  theme: storeDef<ThemeName>("neutral", "theme", createThemeListener()),
});

// 主题兜底：localStorage 残留已删除主题（如 red）时回退 neutral——
// 经 set 触发监听器（data-theme）与持久化同步修正，仅启动时执行一次
if (!themeNames.includes(settings.theme.get())) {
  settings.theme.set("neutral");
}

/**
 * 主题监听器工厂：将主题名写入 data-theme 属性（对应 themes/*.css 的 [data-theme="xxx"] 覆盖层；
 * neutral 同时以 :root 兜底首帧，显式设置后命中 [data-theme="neutral"] 规则）。
 * @returns 主题变更回调（经 storeDef subscribe 注入，创建时执行一次 + 每次变更触发）
 */
function createThemeListener(): (theme: ThemeName) => void {
  const root = document.documentElement;
  return (theme) => {
    root.setAttribute("data-theme", theme);
  };
}
