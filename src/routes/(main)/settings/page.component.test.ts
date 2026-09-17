import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Page from "./+page.svelte";

// jsdom 缺少指针捕获与滚动 API，bits-ui 下拉用得到，仅在本文件内就地补齐。
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

// 纯替身：页面依赖的外部状态（主题、后端配置、运行时语言、提示）全部 mock，
// 只验证页面的接线逻辑——选项渲染、切换调用与成功/失败分支。
const setModeMock = vi.hoisted(() => vi.fn());
const updateConfigMock = vi.hoisted(() => vi.fn());
const setLocaleMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({
  loading: vi.fn(() => 1),
  dismiss: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
const configStateMock = vi.hoisted(() => ({
  value: { locale: "en", auto_start: false, remember_window: false, schema_version: 1 },
}));

vi.mock("mode-watcher", () => ({
  userPrefersMode: { current: "system" },
  setMode: setModeMock,
}));

vi.mock("$hooks/config.svelte", () => ({
  configState: configStateMock,
  updateConfig: updateConfigMock,
}));

vi.mock("$libs/i18n/paraglide/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$libs/i18n/paraglide/runtime")>();
  return {
    ...actual,
    getLocale: () => configStateMock.value.locale,
    setLocale: setLocaleMock,
  };
});

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

afterEach(() => {
  cleanup();
  // bits-ui 下拉打开时给 body 加滚动锁定样式，jsdom 内卸载后不会自动还原，
  // 这里手动清理，避免泄漏到后续用例导致点击被 pointer-events 拦截。
  document.body.removeAttribute("style");
});

beforeEach(() => {
  vi.clearAllMocks();
  configStateMock.value = {
    locale: "en",
    auto_start: false,
    remember_window: false,
    schema_version: 1,
  };
  // 成功路径：写后回填配置状态，与真实 `updateConfig` 的回写行为一致。
  updateConfigMock.mockImplementation(
    async (patch: { locale?: string; auto_start?: boolean; remember_window?: boolean }) => {
      configStateMock.value = {
        locale: patch.locale ?? configStateMock.value.locale,
        auto_start: patch.auto_start ?? configStateMock.value.auto_start,
        remember_window: patch.remember_window ?? configStateMock.value.remember_window,
        schema_version: 1,
      };
    },
  );
});

describe("设置页", () => {
  /** 在下拉中按值点选：jsdom 无布局，选项始终不可见，只能按 `data-value` 定位。 */
  async function chooseOption(
    user: ReturnType<typeof userEvent.setup>,
    triggerName: string,
    value: string,
  ): Promise<void> {
    await user.click(screen.getByRole("button", { name: triggerName }));
    await waitFor(() => {
      expect(document.querySelector(`[data-value="${value}"]`)).not.toBeNull();
    });
    await user.click(document.querySelector(`[data-value="${value}"]`) as HTMLElement);
  }

  it("渲染通用与外观分组及当前取值", () => {
    render(Page);

    expect(screen.getByText("General")).not.toBeNull();
    expect(screen.getByText("Appearance")).not.toBeNull();
    expect(screen.getByText("Language")).not.toBeNull();
    expect(screen.getByText("Theme")).not.toBeNull();
    expect(screen.getByText("Autostart")).not.toBeNull();
    expect(screen.getByText("Remember window")).not.toBeNull();
    // 下拉触发器展示当前选中项的文案
    const languageTrigger = screen.getByRole("button", { name: "Language" });
    const themeTrigger = screen.getByRole("button", { name: "Theme" });
    expect(languageTrigger.textContent).toContain("English");
    expect(themeTrigger.textContent).toContain("System");
  });

  it("切换主题即时调用 setMode，不经过后端", async () => {
    const user = userEvent.setup();
    render(Page);

    await chooseOption(user, "Theme", "dark");

    expect(setModeMock).toHaveBeenCalledWith("dark");
    expect(updateConfigMock).not.toHaveBeenCalled();
  });

  it("切换语言先落盘后端，成功后重载生效", async () => {
    const user = userEvent.setup();
    render(Page);

    await chooseOption(user, "Language", "zh-CN");

    expect(updateConfigMock).toHaveBeenCalledWith({ locale: "zh-CN" });
    await vi.waitFor(() => {
      expect(setLocaleMock).toHaveBeenCalledWith("zh-CN");
    });
    expect(toastMocks.success).toHaveBeenCalled();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("语言落盘失败时不重载并报错", async () => {
    const user = userEvent.setup();
    updateConfigMock.mockImplementation(async () => {});
    render(Page);

    await chooseOption(user, "Language", "zh-CN");

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalled();
    });
    expect(setLocaleMock).not.toHaveBeenCalled();
  });

  it("自启开关渲染后端配置的当前状态", () => {
    configStateMock.value = {
      locale: "en",
      auto_start: true,
      remember_window: false,
      schema_version: 1,
    };
    render(Page);

    expect(screen.getByRole("switch", { name: "Autostart" }).getAttribute("data-state")).toBe(
      "checked",
    );
  });

  it("打开自启开关经命令落盘，成功后提示", async () => {
    const user = userEvent.setup();
    render(Page);

    await user.click(screen.getByRole("switch", { name: "Autostart" }));

    expect(updateConfigMock).toHaveBeenCalledWith({ auto_start: true });
    await vi.waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalled();
    });
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(setLocaleMock).not.toHaveBeenCalled();
  });

  it("自启落盘失败时报错且不改语言", async () => {
    const user = userEvent.setup();
    updateConfigMock.mockImplementation(async () => {});
    render(Page);

    await user.click(screen.getByRole("switch", { name: "Autostart" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalled();
    });
    expect(setLocaleMock).not.toHaveBeenCalled();
  });

  it("窗口开关渲染后端配置的当前状态", () => {
    configStateMock.value = {
      locale: "en",
      auto_start: false,
      remember_window: true,
      schema_version: 1,
    };
    render(Page);

    expect(screen.getByRole("switch", { name: "Remember window" }).getAttribute("data-state")).toBe(
      "checked",
    );
  });

  it("打开窗口开关经命令落盘，成功后提示", async () => {
    const user = userEvent.setup();
    render(Page);

    await user.click(screen.getByRole("switch", { name: "Remember window" }));

    expect(updateConfigMock).toHaveBeenCalledWith({ remember_window: true });
    await vi.waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalled();
    });
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(setLocaleMock).not.toHaveBeenCalled();
  });

  it("窗口落盘失败时报错且不改语言", async () => {
    const user = userEvent.setup();
    updateConfigMock.mockImplementation(async () => {});
    render(Page);

    await user.click(screen.getByRole("switch", { name: "Remember window" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalled();
    });
    expect(setLocaleMock).not.toHaveBeenCalled();
  });
});
