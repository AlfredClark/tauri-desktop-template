import { get as getStore, writable } from "svelte/store";
import { StorageType } from "./types";
import type { PersistOptions, StorageAdapter, Store } from "./types";

/** 存储介质 → 适配器映射表，新增介质只需在此注册 */
const adapters: Record<StorageType, StorageAdapter> = {
  [StorageType.Local]: {
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  },
  [StorageType.Session]: {
    getItem: (key) => window.sessionStorage.getItem(key),
    setItem: (key, value) => window.sessionStorage.setItem(key, value),
    removeItem: (key) => window.sessionStorage.removeItem(key),
  },
};

/**
 * 归一化持久化配置：字符串简写 → 完整对象（介质默认 Local）。
 * @param persist 字符串简写或完整持久化配置
 * @returns 完整持久化配置对象
 */
function normalizePersist(persist: string | PersistOptions): PersistOptions {
  return typeof persist === "string" ? { key: persist } : persist;
}

/**
 * 解析初始值。
 * @param initial 初始值，字面量或惰性函数（惰性函数在创建时执行一次）
 * @returns 解析后的初始值
 */
function resolveInitial<T>(initial: T | (() => T)): T {
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

/**
 * 从存储读取持久化数据。
 * @param adapter 存储介质适配器
 * @param key 存储 key
 * @returns 读取结果：found 表示条目是否存在；value 为解析后的数据（条目缺失或损坏时为 undefined）
 */
function loadPersisted(adapter: StorageAdapter, key: string): { found: boolean; value: unknown } {
  try {
    const raw = adapter.getItem(key);
    if (raw == null) return { found: false, value: undefined };
    return { found: true, value: JSON.parse(raw) as unknown };
  } catch {
    // 数据损坏时回退到默认值，不向外抛出
    return { found: true, value: undefined };
  }
}

/**
 * 创建增强型 store：内存状态始终优先；配置 persist 后 set/update 同步写入存储，写入失败静默忽略；
 * 首次创建时若持久化条目缺失，立即写入默认值。
 * @param initial 初始值，字面量或惰性函数（惰性函数在创建时执行一次）
 * @param options 创建选项
 * @param options.persist 持久化配置：字符串简写默认本地存储，或完整对象指定 key 与介质
 * @param options.subscribe 值变更回调：注册为内部订阅者，创建时与每次值变更（set/update/reset）后触发，接收新值；与持久化相互独立
 * @returns 增强型 store：subscribe 兼容 $store 语法，附带 set/update/get/reset 方法
 */
export function createStore<T>(
  initial: T | (() => T),
  options?: { persist?: string | PersistOptions; subscribe?: (value: T) => void },
): Store<T> {
  const persistOptions = options?.persist ? normalizePersist(options.persist) : null;
  const adapter = persistOptions ? adapters[persistOptions.storage ?? StorageType.Local] : null;
  const defaultValue = resolveInitial(initial);
  const loaded = adapter && persistOptions ? loadPersisted(adapter, persistOptions.key) : null;

  const { subscribe, set, update } = writable<T>((loaded?.value ?? defaultValue) as T);

  /**
   * 将状态值写入持久化存储。
   * @param value 要写入的状态值
   */
  function persistValue(value: T): void {
    if (!adapter || !persistOptions) return;
    try {
      adapter.setItem(persistOptions.key, JSON.stringify(value));
    } catch {
      // 写入失败（配额满、隐私模式等）不影响内存状态
    }
  }

  if (loaded && !loaded.found) {
    // 首次创建且无历史条目：立即写入默认值，保证存储与内存一致
    persistValue(defaultValue);
  }

  if (options?.subscribe) {
    // 值变更回调注册为内部订阅者：创建时执行一次，此后每次值变更自动触发，与持久化逻辑无关
    subscribe(options.subscribe);
  }

  return {
    subscribe,
    set: (value) => {
      set(value);
      persistValue(value);
    },
    update: (fn) => {
      update((value) => {
        const next = fn(value);
        persistValue(next);
        return next;
      });
    },
    get: () => getStore({ subscribe }),
    reset: () => {
      if (adapter && persistOptions) {
        try {
          adapter.removeItem(persistOptions.key);
        } catch {
          // 删除失败静默忽略
        }
      }
      set(defaultValue);
      persistValue(defaultValue);
    },
  };
}
