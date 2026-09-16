// 布局状态唯一来源：纯前端 UI 偏好走 localStorage 持久化，与语言走后端 config.json 互不干扰。
// 后端无布局业务，故不经 commands 链，避免跨层跳跃。
// 布局注册表集中在此，新增布局只需加文件并扩展映射，容器无需改动。
// 布局组件禁止反向导入本模块，否则形成容器到布局的循环依赖。
import type { Component, Snippet } from "svelte";
import Default from "$components/layout/default.svelte";
import Sidebar from "$components/layout/sidebar.svelte";

/** 可选布局取值，新增布局时同步扩展该联合类型与下方映射 */
export type LayoutName = "default" | "sidebar";

/** 布局组件形态：仅接收子内容片段 */
export type LayoutComponent = Component<{ children: Snippet }>;

/** 布局名到组件的映射，容器据此动态渲染 */
export const LAYOUTS: Record<LayoutName, LayoutComponent> = {
  default: Default,
  sidebar: Sidebar,
};

/** 持久化键名，改名即视为放弃老用户存量 */
export const LAYOUT_STORAGE_KEY = "layout-name";

const DEFAULT_LAYOUT: LayoutName = "default";

const LAYOUT_NAMES: readonly LayoutName[] = Object.keys(LAYOUTS) as LayoutName[];

// 跨页面共享的布局状态，页面私有状态仍用局部 $state
export const layoutState = $state<{ name: LayoutName }>({ name: DEFAULT_LAYOUT });

/** 校验布局取值，脏数据回落时使用 */
export function isLayoutName(value: unknown): value is LayoutName {
  return typeof value === "string" && (LAYOUT_NAMES as readonly string[]).includes(value);
}

/** 读取持久化布局，缺失或非法一律回落默认值 */
export function loadLayoutName(): LayoutName {
  try {
    if (typeof localStorage === "undefined") {
      return DEFAULT_LAYOUT;
    }
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return isLayoutName(stored) ? stored : DEFAULT_LAYOUT;
  } catch {
    // 隐私模式等存储不可用时按默认值渲染，不阻塞首帧
    return DEFAULT_LAYOUT;
  }
}

/** 容器首帧前调用，重复调用无副作用 */
export function initLayout(): void {
  layoutState.name = loadLayoutName();
}

/** 切换布局，先落盘再改内存，刷新不丢失 */
export function setLayoutName(next: LayoutName): void {
  if (!isLayoutName(next)) {
    return;
  }
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, next);
  } catch {
    // 落盘失败仍切换内存状态，保证本次会话可用
  }
  layoutState.name = next;
}
