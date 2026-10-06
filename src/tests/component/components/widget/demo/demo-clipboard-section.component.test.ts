import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import Component from "$components/widget/demo/demo-clipboard-section.svelte";

// 纯替身：剪贴板读写命令与提示全部 mock，
// 只验证剪贴板卡片的接线——渲染、写成功清空、写失败提示、读回显、空占位、读失败提示。
const demoClipboardWriteMock = vi.hoisted(() => vi.fn());
const demoClipboardReadMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

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

vi.mock("$libs/commands", () => ({
  default: {
    demoClipboardWrite: demoClipboardWriteMock,
    demoClipboardRead: demoClipboardReadMock,
  },
}));

vi.mock("$libs/utils/toast", () => ({ toast: toastMocks }));

beforeEach(() => {
  vi.clearAllMocks();
  demoClipboardWriteMock.mockReturnValue(fakeCommand({ status: "ok", data: null }) as never);
  demoClipboardReadMock.mockReturnValue(
    fakeCommand({ status: "ok", data: "hello from clipboard" }) as never,
  );
});

afterEach(() => {
  cleanup();
});

describe("剪贴板分组", () => {
  it("渲染标题与读写控件，空输入时写按钮禁用", () => {
    render(Component);

    expect(screen.getByText("Clipboard")).not.toBeNull();
    expect(screen.getByPlaceholderText("Type something…")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Paste" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Copy" })).toHaveProperty("disabled", true);
  });

  it("写成功后清空输入并提示成功", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.type(screen.getByPlaceholderText("Type something…"), "hello");
    await user.click(screen.getByRole("button", { name: "Copy" }));

    await vi.waitFor(() => {
      expect(demoClipboardWriteMock).toHaveBeenCalledOnce();
    });
    expect(demoClipboardWriteMock).toHaveBeenCalledWith("hello");
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Type something…")).toHaveProperty("value", "");
  });

  it("写失败时提示复制失败", async () => {
    demoClipboardWriteMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.type(screen.getByPlaceholderText("Type something…"), "hello");
    await user.click(screen.getByRole("button", { name: "Copy" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
  });

  it("读成功后行内回显剪贴板内容", async () => {
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Paste" }));

    expect(await screen.findByText("hello from clipboard")).not.toBeNull();
    expect(demoClipboardReadMock).toHaveBeenCalledOnce();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("读到空字符串时展示空占位", async () => {
    demoClipboardReadMock.mockReturnValue(fakeCommand({ status: "ok", data: "" }) as never);
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Paste" }));

    expect(await screen.findByText("(empty)")).not.toBeNull();
    expect(toastMocks.error).not.toHaveBeenCalled();
  });

  it("读失败时提示读取失败", async () => {
    demoClipboardReadMock.mockReturnValue(
      fakeCommand({ status: "error", error: { kind: "Internal", message: "boom" } }) as never,
    );
    const user = userEvent.setup();
    render(Component);

    await user.click(screen.getByRole("button", { name: "Paste" }));

    await vi.waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledOnce();
    });
    expect(toastMocks.success).not.toHaveBeenCalled();
  });
});
