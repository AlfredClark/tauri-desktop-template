import { createStoreGroup, storeDef } from "./core";
import type { ColorScheme, LayoutName, ThemeName } from "./types";
import { themeNames } from "$styles/themes";

/**
 * UI 偏好统一出口：createStoreGroup 组合三个偏好子 store（colorScheme/layout/theme），各自独立
 * 持久化于 localStorage（key: color-scheme/layout/theme），真相源与系统级配置（config.json）分离。
 * 读写经成员访问：`$settings.colorScheme` / `settings.layout.set(...)`。
 * 主题应用经 storeDef 的 subscribe 声明式注入：创建时应用当前值，此后每次变更跟随。
 */
export const settings = createStoreGroup({
  colorScheme: storeDef<ColorScheme>("system", "color-scheme", createColorSchemeListener()),
  layout: storeDef<LayoutName>("default", "layout"),
  theme: storeDef<ThemeName>("neutral", "theme", createThemeListener()),
});

// 主题兜底：localStorage 残留已删除主题（如 red）时回退 neutral——
// 经 set 触发监听器（data-theme）与持久化同步修正，仅启动时执行一次
if (!themeNames.includes(settings.theme.get())) {
  settings.theme.set("neutral");
}

/**
 * 配色方案监听器工厂：matchMedia 监听创建时注册一次（无需逐次清理）；system 模式下
 * 经 settings.colorScheme 实时守卫，OS 主题变化时动态跟随。
 * @returns 配色方案变更回调（经 storeDef subscribe 注入，创建时执行一次 + 每次变更触发）
 */
function createColorSchemeListener(): (mode: ColorScheme) => void {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;
  const syncDark = () => {
    // 仅在 system 模式下跟随系统主题（实时读取 store，单一真相源）
    if (settings.colorScheme.get() === "system") {
      root.classList.toggle("dark", mq.matches);
    }
  };
  mq.addEventListener("change", syncDark);
  return (mode) => {
    root.classList.toggle("dark", mode === "system" ? mq.matches : mode === "dark");
  };
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
