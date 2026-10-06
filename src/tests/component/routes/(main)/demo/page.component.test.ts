import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import type { TimeInfo } from "$libs/http/types";
import Page from "../../../../../routes/(main)/demo/+page.svelte";

// bits-ui 组件在 jsdom 下缺失的浏览器 API，就地补齐（滚动壳的 ResizeObserver）。
if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

// 纯替身：八个分区分组依赖的命令、钩子、网络层与插件直调全部 mock，
// 只验证演示页的组装——标题与各分区、分区分组标题渲染，失败占位与写文件回显。
const demoAppPathsMock = vi.hoisted(() => vi.fn());
const demoWriteFileMock = vi.hoisted(() => vi.fn());
const demoReadFileMock = vi.hoisted(() => vi.fn());
const demoPickFileMock = vi.hoisted(() => vi.fn());
const demoPickFolderMock = vi.hoisted(() => vi.fn());
const demoSaveFileMock = vi.hoisted(() => vi.fn());
const demoClipboardWriteMock = vi.hoisted(() => vi.fn());
const demoClipboardReadMock = vi.hoisted(() => vi.fn());
const demoNotifyMock = vi.hoisted(() => vi.fn());
const demoShortcutKeyMock = vi.hoisted(() => vi.fn());
const demoShortcutIsRegisteredMock = vi.hoisted(() => vi.fn());
const demoShortcutRegisterMock = vi.hoisted(() => vi.fn());
const demoShortcutUnregisterMock = vi.hoisted(() => vi.fn());
const demoInspectDropMock = vi.hoisted(() => vi.fn());
const demoImportDropMock = vi.hoisted(() => vi.fn());
const reportFailureMock = vi.hoisted(() => vi.fn());
const registerShortcutMock = vi.hoisted(() => vi.fn());
const unregisterShortcutMock = vi.hoisted(() => vi.fn());
const isShortcutRegisteredMock = vi.hoisted(() => vi.fn());
const closeWindowMock = vi.hoisted(() => vi.fn());
const fetchCurrentTimeMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("$libs/commands", () => ({
  default: {
    demoAppPaths: demoAppPathsMock,
    demoWriteFile: demoWriteFileMock,
    demoReadFile: demoReadFileMock,
    demoPickFile: demoPickFileMock,
    demoPickFolder: demoPickFolderMock,
    demoSaveFile: demoSaveFileMock,
    demoClipboardWrite: demoClipboardWriteMock,
    demoClipboardRead: demoClipboardReadMock,
    demoNotify: demoNotifyMock,
    demoShortcutKey: demoShortcutKeyMock,
    demoShortcutIsRegistered: demoShortcutIsRegisteredMock,
    demoShortcutRegister: demoShortcutRegisterMock,
    demoShortcutUnregister: demoShortcutUnregisterMock,
    demoInspectDrop: demoInspectDropMock,
    demoImportDrop: demoImportDropMock,
  },
}));

vi.mock("$libs/commands/cores", () => ({
  reportCommandFailure: reportFailureMock,
}));

vi.mock("$hooks/is-mobile.svelte", () => ({
  // 桌面宽度不断点，拖放分组正常渲染
  getSharedIsMobile: () => ({ current: false }),
}));

vi.mock("$libs/http/time", () => ({
  fetchCurrentTime: fetchCurrentTimeMock,
  resolveTimeZone: () => "Asia/Shanghai",
}));

vi.mock("$libs/shortcuts/shortcuts", () => ({
  CLOSE_WINDOW_SHORTCUT: "Ctrl+Alt+X",
  registerShortcut: registerShortcutMock,
  unregisterShortcut: unregisterShortcutMock,
  isShortcutRegistered: isShortcutRegisteredMock,
}));

vi.mock("$libs/utils/window-controls", () => ({
  closeWindow: closeWindowMock,
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

// 拖放订阅桩：桌面环境订阅成功但不行内投递事件，只保挂载不崩
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onDragDropEvent: () => () => {},
  }),
}));

type FakeResult =
  { status: "ok"; data: unknown } | { status: "error"; error: { kind: string; message: string } };

/** 与 `EnhancedCommand` 行为一致的替身：按分支跑回调后结算结果 */
function fakeCommand(result: FakeResult): {
  success: (handler: (data: never) => unknown) => unknown;
  failed: (handler: (failure: never) => unknown) => unknown;
  result: () => Promise<FakeResult>;
} {
  const chain = {
    success(handler: (data: never) => unknown) {
      if (result.status === "ok") handler(result.data as never);
      return chain;
    },
    failed(handler: (failure: never) => unknown) {
      if (result.status === "error") handler(result.error as never);
      return chain;
    },
    result() {
      return Promise.resolve(result);
    },
  };
  return chain;
}

function stubOk(mock: ReturnType<typeof vi.fn>, data: unknown = null): void {
  mock.mockReturnValue(fakeCommand({ status: "ok", data }) as never);
}

const current: TimeInfo = {
  dateTime: "2026-09-26T13:06:48",
  date: "09/26/2026",
  time: "13:06",
  timeZone: "Asia/Shanghai",
  dayOfWeek: "Saturday",
};

beforeEach(() => {
  vi.clearAllMocks();
  stubOk(demoAppPathsMock, { app_data: "/data", app_cache: "/cache", temp: "/tmp" });
  stubOk(demoWriteFileMock, "/tmp/demo.txt");
  stubOk(demoReadFileMock, "content");
  stubOk(demoPickFileMock, null);
  stubOk(demoPickFolderMock, null);
  stubOk(demoSaveFileMock, null);
  stubOk(demoClipboardWriteMock, null);
  stubOk(demoClipboardReadMock, "");
  stubOk(demoNotifyMock, null);
  stubOk(demoShortcutKeyMock, "Ctrl+Shift+D");
  stubOk(demoShortcutIsRegisteredMock, false);
  stubOk(demoShortcutRegisterMock, true);
  stubOk(demoShortcutUnregisterMock, false);
  stubOk(demoInspectDropMock, []);
  stubOk(demoImportDropMock, null);
  isShortcutRegisteredMock.mockResolvedValue(false);
  fetchCurrentTimeMock.mockResolvedValue({ ...current });
});

afterEach(() => {
  cleanup();
  document.body.removeAttribute("style");
});

describe("演示页", () => {
  it("渲染页标题与八个分区分组标题", () => {
    render(Page);

    expect(screen.getByText("Feature demo")).not.toBeNull();
    expect(screen.getByText("App directories")).not.toBeNull();
    expect(screen.getByText("Sandbox file")).not.toBeNull();
    expect(screen.getByText("File drop")).not.toBeNull();
    expect(screen.getByText("System dialogs")).not.toBeNull();
    expect(screen.getByText("Clipboard")).not.toBeNull();
    expect(screen.getByText("Notification")).not.toBeNull();
    expect(screen.getByText("Global shortcut")).not.toBeNull();
    expect(screen.getByText("HTTP request")).not.toBeNull();
  });

  it("目录加载失败时行内保持占位并提示", async () => {
    demoAppPathsMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    render(Page);

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalled();
    });
    // 三处目录行内回落占位，不断言后端数据
    expect(screen.getAllByText("Loading…")).toHaveLength(3);
  });

  it("写文件成功后行内回显路径", async () => {
    const user = userEvent.setup();
    render(Page);

    await user.click(screen.getByRole("button", { name: "Write" }));

    expect(demoWriteFileMock).toHaveBeenCalledOnce();
    expect(await screen.findByText("/tmp/demo.txt")).not.toBeNull();
    expect(toastMocks.success).toHaveBeenCalled();
  });
});
