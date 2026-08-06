import { createStoreGroup, storeDef } from "./core";
import type { ColorScheme, LayoutName } from "./types";

/**
 * UI 偏好统一出口：createStoreGroup 组合两个偏好子 store（colorScheme/layout），各自独立持久化于
 * localStorage（key: color-scheme/layout），真相源与系统级配置（config.json）分离。
 * 读写经成员访问：`$settings.colorScheme` / `settings.layout.set(...)`。
 * 主题应用经 storeDef 的 subscribe 声明式注入：创建时应用当前值，此后每次变更跟随。
 */
export const settings = createStoreGroup({
  colorScheme: storeDef<ColorScheme>("system", "color-scheme", createColorSchemeListener()),
  layout: storeDef<LayoutName>("default", "layout"),
});

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
