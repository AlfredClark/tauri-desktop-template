import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { createRawSnippet } from "svelte";
import { layoutState } from "$hooks/appearance.svelte";
import LayoutContainer from "../../../../components/layout/layout-container.svelte";

// bits-ui 组件在 jsdom 下缺失的浏览器 API，就地补齐（同关于页测试）。
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
// jsdom 无 matchMedia，侧边栏折叠断点（IsMobile）就地给假，默认桌面宽度不断点
if (typeof window.matchMedia === "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// 标题栏窗口操作在单测无 Tauri 运行时，全部按不可用回落
vi.mock("$libs/utils/window-controls", () => ({
  isWindowControlsAvailable: vi.fn().mockResolvedValue(false),
  isWindowAlwaysOnTop: vi.fn().mockResolvedValue(false),
  toggleAlwaysOnTopWindow: vi.fn().mockResolvedValue(false),
  minimizeWindow: vi.fn().mockResolvedValue(false),
  toggleMaximizeWindow: vi.fn().mockResolvedValue(false),
  closeWindow: vi.fn().mockResolvedValue(false),
  isWindowMaximized: vi.fn().mockResolvedValue(false),
  onWindowResized: vi.fn().mockResolvedValue(null),
}));

// 导航标签栏依赖 SvelteKit 运行时状态，就地提供最小桩
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/") },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

vi.mock("$app/paths", () => ({
  resolve: (path: string): string => path,
}));

function renderWithProbe(): void {
  const children = createRawSnippet(() => ({
    render: () => "<span>probe-content</span>",
  }));
  render(LayoutContainer, { props: { children } });
}

beforeEach(() => {
  vi.clearAllMocks();
  // 容器挂载会从持久化重读，用例间先清空，单个用例按需预种
  localStorage.clear();
  layoutState.name = "tabs";
});

afterEach(() => {
  cleanup();
  layoutState.name = "tabs";
});

describe("布局容器", () => {
  it("tabs 布局渲染标签栏骨架与子内容", () => {
    layoutState.name = "tabs";
    renderWithProbe();

    expect(document.querySelector('[data-layout="tabs"]')).not.toBeNull();
    expect(screen.getByText("probe-content")).not.toBeNull();
  });

  it("sidebar 布局渲染侧边栏骨架与子内容", () => {
    // 容器挂载时 initLayout 会从持久化重读，先写存储再预设内存，两者一致才稳定
    localStorage.setItem("layout-name", "sidebar");
    layoutState.name = "sidebar";
    renderWithProbe();

    expect(document.querySelector('[data-layout="sidebar"]')).not.toBeNull();
    expect(screen.getByText("probe-content")).not.toBeNull();
  });

  it("注册表缺 key 时回落 tabs 而非白屏", async () => {
    layoutState.name = "tabs";
    renderWithProbe();

    // 脏数据在 hooks 层已回落，此处模拟注册表缺 key 的极端情形
    layoutState.name = "ghost" as never;
    await tick();

    expect(document.querySelector('[data-layout="tabs"]')).not.toBeNull();
    expect(screen.getByText("probe-content")).not.toBeNull();
  });
});
