import { House, Info, Settings } from "@lucide/svelte";
import { m } from "$libs/i18n/paraglide/messages";
import type { NavItem } from "./types";

/** 默认导航项：新增页面在此追加（label 一律经 m.xxx() 取，不硬编码文案） */
export const defaultNavItems: NavItem[] = [
  { label: m.nav_home, href: "/", icon: House },
  { label: m.nav_settings, href: "/settings", icon: Settings },
  { label: m.nav_about, href: "/about", icon: Info },
];
