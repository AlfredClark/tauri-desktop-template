import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LAYOUTS,
  LAYOUT_STORAGE_KEY,
  initLayout,
  isLayoutName,
  layoutState,
  loadLayoutName,
  setLayoutName,
} from "$hooks/layout.svelte";

// 节点环境无 localStorage，用内存实现替身，保证单测不依赖浏览器
function installLocalStorageMock() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, String(value));
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
    clear: (): void => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", mock);
  return mock;
}

beforeEach(() => {
  installLocalStorageMock();
  layoutState.name = "default";
  vi.restoreAllMocks();
});

describe("isLayoutName", () => {
  it("接受合法取值", () => {
    expect(isLayoutName("default")).toBe(true);
    expect(isLayoutName("demo")).toBe(true);
  });

  it("拒绝非法取值", () => {
    expect(isLayoutName("unknown")).toBe(false);
    expect(isLayoutName(null)).toBe(false);
    expect(isLayoutName(undefined)).toBe(false);
  });
});

describe("loadLayoutName", () => {
  it("缺失时回落默认值", () => {
    expect(loadLayoutName()).toBe("default");
  });

  it("读取已持久化的合法值", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "demo");
    expect(loadLayoutName()).toBe("demo");
  });

  it("脏数据回落默认值", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "unknown");
    expect(loadLayoutName()).toBe("default");
  });

  it("读取异常回落默认值", () => {
    const mock = installLocalStorageMock();
    vi.spyOn(mock, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadLayoutName()).toBe("default");
  });
});

describe("setLayoutName", () => {
  it("先落盘再切换内存状态", () => {
    setLayoutName("demo");
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe("demo");
    expect(layoutState.name).toBe("demo");
  });

  it("落盘失败仍切换内存状态", () => {
    const mock = installLocalStorageMock();
    vi.spyOn(mock, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    setLayoutName("demo");
    expect(layoutState.name).toBe("demo");
  });

  it("拒绝非法取值且不改状态", () => {
    // @ts-expect-error 故意传入非法值以覆盖运行时分支
    setLayoutName("unknown");
    expect(layoutState.name).toBe("default");
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
  });
});

describe("initLayout", () => {
  it("按持久化值初始化", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "demo");
    initLayout();
    expect(layoutState.name).toBe("demo");
  });
});

describe("LAYOUTS", () => {
  it("合法取值均有对应组件", () => {
    for (const name of ["default", "demo"] as const) {
      expect(isLayoutName(name)).toBe(true);
      expect(LAYOUTS[name]).toBeDefined();
    }
  });
});
