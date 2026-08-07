import type { Component } from "svelte";
import type { Pathname } from "$app/types";

/** 导航项：label 为 Paraglide 消息函数（运行期取当前语言文案），href 为内部路由路径 */
export interface NavItem {
  label: () => string;
  href: Pathname;
  icon?: Component<{ class?: string }>;
}
