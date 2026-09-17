import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_WEIGHT,
  FONT_FAMILY_STORAGE_KEY,
  FONT_SIZE_OPTIONS,
  FONT_SIZE_STORAGE_KEY,
  FONT_WEIGHT_STORAGE_KEY,
  LAYOUTS,
  LAYOUT_STORAGE_KEY,
  applyAppearance,
  buildFontStack,
  fontState,
  initAppearance,
  initLayout,
  isFontSize,
  isFontWeight,
  isLayoutName,
  layoutState,
  loadFontFamily,
  loadFontSize,
  loadFontWeight,
  loadLayoutName,
  sanitizeFontFamily,
  setFontFamily,
  setFontSize,
  setFontWeight,
  setLayoutName,
} from "$hooks/appearance.svelte";

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
  layoutState.name = "tabs";
  fontState.family = DEFAULT_FONT_FAMILY;
  fontState.weight = DEFAULT_FONT_WEIGHT;
  fontState.size = DEFAULT_FONT_SIZE;
  vi.restoreAllMocks();
});

describe("isLayoutName", () => {
  it("接受合法取值", () => {
    expect(isLayoutName("tabs")).toBe(true);
    expect(isLayoutName("sidebar")).toBe(true);
  });

  it("拒绝非法取值", () => {
    expect(isLayoutName("unknown")).toBe(false);
    expect(isLayoutName(null)).toBe(false);
    expect(isLayoutName(undefined)).toBe(false);
  });
});

describe("loadLayoutName", () => {
  it("缺失时回落默认值", () => {
    expect(loadLayoutName()).toBe("tabs");
  });

  it("读取已持久化的合法值", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "sidebar");
    expect(loadLayoutName()).toBe("sidebar");
  });

  it("脏数据回落默认值", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "unknown");
    expect(loadLayoutName()).toBe("tabs");
  });

  it("读取异常回落默认值", () => {
    const mock = installLocalStorageMock();
    vi.spyOn(mock, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(loadLayoutName()).toBe("tabs");
  });
});

describe("setLayoutName", () => {
  it("先落盘再切换内存状态", () => {
    setLayoutName("sidebar");
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBe("sidebar");
    expect(layoutState.name).toBe("sidebar");
  });

  it("落盘失败仍切换内存状态", () => {
    const mock = installLocalStorageMock();
    vi.spyOn(mock, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    setLayoutName("sidebar");
    expect(layoutState.name).toBe("sidebar");
  });

  it("拒绝非法取值且不改状态", () => {
    // @ts-expect-error 故意传入非法值以覆盖运行时分支
    setLayoutName("unknown");
    expect(layoutState.name).toBe("tabs");
    expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).toBeNull();
  });
});

describe("initLayout", () => {
  it("按持久化值初始化", () => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, "sidebar");
    initLayout();
    expect(layoutState.name).toBe("sidebar");
  });
});

describe("LAYOUTS", () => {
  it("合法取值均有对应组件", () => {
    for (const name of ["tabs", "sidebar"] as const) {
      expect(isLayoutName(name)).toBe(true);
      expect(LAYOUTS[name]).toBeDefined();
    }
  });
});

describe("sanitizeFontFamily", () => {
  it("保留合法族名", () => {
    expect(sanitizeFontFamily("Microsoft YaHei")).toBe("Microsoft YaHei");
  });

  it("剥离可破坏样式声明的字符", () => {
    expect(sanitizeFontFamily('";color:red;"')).toBe("color:red");
    expect(sanitizeFontFamily("Foo\\Bar")).toBe("FooBar");
  });
});

describe("isFontWeight", () => {
  it("接受整百字重", () => {
    for (const weight of [100, 400, 900]) {
      expect(isFontWeight(weight)).toBe(true);
    }
  });

  it("拒绝非法取值", () => {
    expect(isFontWeight(450)).toBe(false);
    expect(isFontWeight(50)).toBe(false);
    expect(isFontWeight(1000)).toBe(false);
    expect(isFontWeight("400")).toBe(false);
    expect(isFontWeight(null)).toBe(false);
  });
});

describe("loadFontFamily", () => {
  it("缺失时回落系统默认", () => {
    expect(loadFontFamily()).toBe(DEFAULT_FONT_FAMILY);
  });

  it("读取已持久化的族名", () => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, "Serif");
    expect(loadFontFamily()).toBe("Serif");
  });

  it("脏数据回落系统默认", () => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, '";;');
    expect(loadFontFamily()).toBe(DEFAULT_FONT_FAMILY);
  });
});

describe("loadFontWeight", () => {
  it("缺失时回落默认值", () => {
    expect(loadFontWeight()).toBe(DEFAULT_FONT_WEIGHT);
  });

  it("读取已持久化的合法字重", () => {
    localStorage.setItem(FONT_WEIGHT_STORAGE_KEY, "700");
    expect(loadFontWeight()).toBe(700);
  });

  it("脏数据回落默认值", () => {
    localStorage.setItem(FONT_WEIGHT_STORAGE_KEY, "450");
    expect(loadFontWeight()).toBe(DEFAULT_FONT_WEIGHT);
  });
});

describe("setFontFamily", () => {
  it("先落盘再切换内存状态", () => {
    setFontFamily("Serif");
    expect(localStorage.getItem(FONT_FAMILY_STORAGE_KEY)).toBe("Serif");
    expect(fontState.family).toBe("Serif");
  });

  it("拒绝空取值且不改状态", () => {
    setFontFamily("   ");
    expect(fontState.family).toBe(DEFAULT_FONT_FAMILY);
    expect(localStorage.getItem(FONT_FAMILY_STORAGE_KEY)).toBeNull();
  });
});

describe("setFontWeight", () => {
  it("先落盘再切换内存状态", () => {
    setFontWeight(700);
    expect(localStorage.getItem(FONT_WEIGHT_STORAGE_KEY)).toBe("700");
    expect(fontState.weight).toBe(700);
  });

  it("拒绝非法取值且不改状态", () => {
    setFontWeight(450);
    expect(fontState.weight).toBe(DEFAULT_FONT_WEIGHT);
    expect(localStorage.getItem(FONT_WEIGHT_STORAGE_KEY)).toBeNull();
  });
});

describe("isFontSize", () => {
  it("接受步长倍数字号", () => {
    for (const size of [75, 100, 125]) {
      expect(isFontSize(size)).toBe(true);
    }
  });

  it("拒绝非法取值", () => {
    expect(isFontSize(77)).toBe(false);
    expect(isFontSize(70)).toBe(false);
    expect(isFontSize(130)).toBe(false);
    expect(isFontSize("100")).toBe(false);
    expect(isFontSize(null)).toBe(false);
  });
});

describe("loadFontSize", () => {
  it("缺失时回落默认值", () => {
    expect(loadFontSize()).toBe(DEFAULT_FONT_SIZE);
  });

  it("读取已持久化的合法字号", () => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, "110");
    expect(loadFontSize()).toBe(110);
  });

  it("脏数据回落默认值", () => {
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, "77");
    expect(loadFontSize()).toBe(DEFAULT_FONT_SIZE);
  });
});

describe("setFontSize", () => {
  it("先落盘再切换内存状态", () => {
    setFontSize(110);
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBe("110");
    expect(fontState.size).toBe(110);
  });

  it("拒绝非法取值且不改状态", () => {
    setFontSize(77);
    expect(fontState.size).toBe(DEFAULT_FONT_SIZE);
    expect(localStorage.getItem(FONT_SIZE_STORAGE_KEY)).toBeNull();
  });
});

describe("FONT_SIZE_OPTIONS", () => {
  it("与校验区间同源", () => {
    expect(FONT_SIZE_OPTIONS).toEqual([75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125]);
    for (const size of FONT_SIZE_OPTIONS) {
      expect(isFontSize(size)).toBe(true);
    }
  });
});

describe("buildFontStack", () => {
  it("系统默认返回默认栈", () => {
    expect(buildFontStack(DEFAULT_FONT_FAMILY)).toContain("Geist Variable");
  });

  it("选中族名优先并带回退", () => {
    const stack = buildFontStack("Serif");
    expect(stack.indexOf('"Serif"')).toBe(0);
    expect(stack).toContain("Geist Variable");
  });
});

describe("applyAppearance", () => {
  it("无文档环境直接返回", () => {
    expect(() => applyAppearance()).not.toThrow();
  });

  it("把内存态写入根元素变量", () => {
    const store = new Map<string, string>();
    const style = {
      setProperty: (key: string, value: string): void => {
        store.set(key, value);
      },
      getPropertyValue: (key: string): string => store.get(key) ?? "",
    };
    vi.stubGlobal("document", { documentElement: { style } });
    try {
      fontState.family = "Serif";
      fontState.weight = 700;
      fontState.size = 110;
      applyAppearance();
      expect(style.getPropertyValue("--app-font-family")).toContain('"Serif"');
      expect(style.getPropertyValue("--app-font-weight")).toBe("700");
      expect(style.getPropertyValue("--app-font-size")).toBe("110%");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("initAppearance", () => {
  it("按持久化值初始化并应用", () => {
    localStorage.setItem(FONT_FAMILY_STORAGE_KEY, "Serif");
    localStorage.setItem(FONT_WEIGHT_STORAGE_KEY, "700");
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, "110");
    initAppearance();
    expect(fontState.family).toBe("Serif");
    expect(fontState.weight).toBe(700);
    expect(fontState.size).toBe(110);
  });
});
