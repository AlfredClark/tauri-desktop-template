import { createStore } from "./core";
import type { ThemeMode } from "./types";

/**
 * 主题偏好 store：UI 偏好（localStorage 持久化），真相源与系统级配置（config.json）分离。
 * system 跟随操作系统主题，light/dark 手动强制。
 */
export const themeStore = createStore<ThemeMode>("system", { persist: "theme" });

/**
 * 应用主题：订阅 themeStore，切换 document.documentElement 的 dark class（shadcn 的
 * class 策略深色模式）；system 模式下注册 matchMedia 监听，系统主题变化时自动跟随。
 * @returns 清理函数：取消订阅并移除系统主题监听
 */
export function applyTheme(): () => void {
  let mqCleanup: (() => void) | null = null;

  const unsubscribe = themeStore.subscribe((mode) => {
    // 每次 mode 变更先清理旧的系统主题监听，避免重复注册
    mqCleanup?.();
    mqCleanup = null;

    const root = document.documentElement;
    if (mode === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const syncDark = () => root.classList.toggle("dark", mq.matches);
      syncDark();
      mq.addEventListener("change", syncDark);
      mqCleanup = () => mq.removeEventListener("change", syncDark);
    } else {
      root.classList.toggle("dark", mode === "dark");
    }
  });

  return () => {
    unsubscribe();
    mqCleanup?.();
    mqCleanup = null;
  };
}
