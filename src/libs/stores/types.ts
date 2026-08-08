import type { Subscriber, Unsubscriber, Writable } from "svelte/store";
import type { ThemeName } from "$styles/themes";

/** 存储介质类型 */
export enum StorageType {
  Local = "local", // 本地存储：持久保存，应用重启后保留
  Session = "session", // 会话存储：关闭窗口后清除
}

/** 存储介质适配器：屏蔽不同存储实现的差异，新增介质只需注册一个新适配器 */
export interface StorageAdapter {
  getItem(key: string): string | null; // 读取指定 key 的原始字符串，不存在时返回 null
  setItem(key: string, value: string): void; // 写入指定 key
  removeItem(key: string): void; // 删除指定 key
}

/** 持久化配置 */
export interface PersistOptions {
  key: string; // 存储 key，显式指定
  storage?: StorageType; // 存储介质，默认 Local
}

/** 增强型 store：subscribe 兼容 $store 语法，并附带便捷方法 */
export interface Store<T> extends Writable<T> {
  subscribe(run: Subscriber<T>, invalidate?: (value?: T) => void): Unsubscriber; // 订阅状态变化，返回取消订阅函数
  set(value: T): void; // 直接设置新值
  update(fn: (value: T) => T): void; // 基于当前值计算并设置新值
  get(): T; // 同步读取当前值
  reset(): void; // 恢复默认值：删除持久化条目 → 内存重置 → 写回默认值
}

/** 子 store 定义：initial 为初始值（支持惰性函数），persist 沿用 createStore 持久化约定 */
export interface StoreDefinition<T> {
  initial: T | (() => T); // 初始值，字面量或惰性函数（惰性函数在创建时执行一次）
  persist?: string | PersistOptions; // 持久化配置：字符串简写（本地存储）或完整配置
  subscribe?: (value: T) => void; // 值变更回调：创建时执行一次，此后每次值变更触发，与持久化相互独立
}

/** 布局偏好：default 默认布局，baseline 基线布局 */
export type LayoutName = "default" | "baseline";

/** 主题偏好：真相源为 themes/index.ts 的 themeNames（data-theme 属性值即主题名，与官方主题一一对应）；
 *  neutral 为基底主题（:root 兜底），其余主题仅覆盖部分 token */
export type { ThemeName };
