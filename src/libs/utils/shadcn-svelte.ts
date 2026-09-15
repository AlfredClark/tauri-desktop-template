import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClassValue } from "clsx";

/**
 * 用于合并class的函数，通过tailwind的twMerge与clsx合并
 *
 * @param inputs Class列表
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 组件 props 中剔除 `child` 简写（svelte 5 的 snippet 写法） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
/** 组件 props 中剔除 `children` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
/** 同时剔除 `child` 与 `children` */
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
/** 给组件 props 追加 `ref` 绑定（默认 `HTMLElement`） */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
