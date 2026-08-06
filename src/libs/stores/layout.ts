import { createStore } from "./core";
import type { LayoutName } from "./types";

/**
 * 布局偏好 store：UI 偏好（localStorage 持久化），真相源与系统级配置（config.json）分离。
 * 默认使用 default 布局；切换经 `layoutStore.set("baseline")`，LayoutContainer 据此渲染对应布局。
 */
export const layoutStore = createStore<LayoutName>("default", { persist: "layout" });
